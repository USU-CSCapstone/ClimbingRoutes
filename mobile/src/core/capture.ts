// A scan on the phone: one wall's photos and what was known when each was taken.
// The camera (#51) and the photo picker (#52) write scans and the upload queue
// (#45) reads them, so these types are the handoff between them. The scan
// storage that keeps them is src/data/scans.ts (#44).
//
// Each scan is a folder on the phone holding its photos and a scan.json
// manifest, which is a Scan as JSON. Photos are only kept until upload is
// confirmed. Once uploaded, the server's `captures` row and its status take over.

import type { WallSize } from './scan-plan';
import type { Uuid } from './types';

/** Bumped when the manifest changes in a way older code can't read. */
export const MANIFEST_VERSION = 1;

/** The manifest's file name in each scan's folder. */
export const MANIFEST_FILE = 'scan.json';

/** Still taking or reviewing photos, then uploading (#45). */
export type ScanStatus = 'draft' | 'uploading';

/** How far an upload has got, kept in the manifest so it carries on after a restart. */
export interface ScanUpload {
  /** The account that started it. Signed in as another, the upload starts over. */
  userId: string;
  /** The server's capture row. */
  captureId: string;
  /** Photos the server has confirmed. */
  uploaded: string[];
}

/**
 * Which way the photos came in, picked on the scan's first screen: taken with
 * the guided camera (#51), or uploaded from photos taken outside the app (#52).
 */
export type ScanSource = 'camera' | 'upload';

/** The answer from "Before you start" (#50), asked before the camera only. */
export interface ScanPlan {
  wallSize: WallSize;
  /** The "Aim for about …" photo count. */
  target: number;
}

/** Where the phone was, from its location services. Missing without location access. */
export interface PhotoLocation {
  latitude: number;
  longitude: number;
  /** Meters above sea level. */
  altitude: number | null;
  /** Radius of uncertainty in meters. */
  accuracy: number | null;
}

/** How the phone was held, in degrees. Missing on phones without motion sensors. */
export interface PhotoAngle {
  /** Up or down from level: 0 facing straight ahead, positive with the camera tilted up, -90 facing the ground. */
  tilt: number;
  /** Turned in the photo's own plane: 0 for upright portrait, positive when turned clockwise as seen from the screen. */
  roll: number;
}

/**
 * One photo in a scan. Photos picked from the library (#52) are kept exactly as
 * they were, so their own EXIF has their time and place, and these fields are
 * null for them.
 */
export interface ScanPhoto {
  /** File name in the scan's folder, like photo-001.jpg or photo-002.heic. */
  file: string;
  /** ISO time the shutter was pressed. */
  takenAt: string | null;
  /** 0 for a picked photo the browser can't open, like a HEIC in Chrome. */
  width: number;
  height: number;
  location: PhotoLocation | null;
  angle: PhotoAngle | null;
}

/** The file types the team's pipeline takes, the same ones the captures bucket allows. */
export type PhotoExtension = 'jpg' | 'heic' | 'heif';

/** A new photo as the camera or the photo picker hands it over, in a temporary file. */
export interface TakenPhoto {
  uri: string;
  width: number;
  height: number;
  /** jpg if missing: the in-app camera only takes JPEGs. */
  extension?: PhotoExtension;
}

/** A scan, and the format of its scan.json manifest. */
export interface Scan {
  version: typeof MANIFEST_VERSION;
  /** Made on the phone. The server's capture id is a different one, given at upload. */
  id: string;
  /** OpenBeta area uuid of the wall. */
  wallUuid: Uuid;
  status: ScanStatus;
  source: ScanSource;
  /** ISO time the scan was started. */
  createdAt: string;
  /** Null for uploads, which go straight to picking photos. */
  plan: ScanPlan | null;
  /** In the order they were taken. */
  photos: ScanPhoto[];
  /** Set once the upload has started. */
  upload?: ScanUpload;
}

/** A new scan of a wall with no photos yet, for the scan storage to keep. */
export function newScan(wallUuid: Uuid, source: ScanSource, plan: ScanPlan | null): Scan {
  const now = new Date();
  return {
    version: MANIFEST_VERSION,
    // Sorts by when it was started, with a random part in case two start at once.
    id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    wallUuid,
    status: 'draft',
    source,
    createdAt: now.toISOString(),
    plan,
    photos: [],
  };
}

/**
 * The next photo's file name: photo-001.jpg, photo-002.heic and so on, so the
 * files sort in the order they were added. Numbered past the highest so far, so
 * a photo deleted in review (#52) never has its name reused.
 */
export function nextPhotoFile(photos: Pick<ScanPhoto, 'file'>[], extension: PhotoExtension = 'jpg'): string {
  const last = Math.max(0, ...photos.map((p) => Number(/\d+/.exec(p.file)?.[0] ?? 0)));
  return `photo-${String(last + 1).padStart(3, '0')}.${extension}`;
}

/** A scan photo's MIME type, from its file name, to upload it with. */
export function photoMimeType(file: string): string {
  if (file.endsWith('.heic')) return 'image/heic';
  if (file.endsWith('.heif')) return 'image/heif';
  return 'image/jpeg';
}

/**
 * A picked file's type, from its MIME type or else its name, or null for one
 * the pipeline can't take, like a PNG screenshot. Browsers often leave HEIC's
 * MIME type blank, hence the name.
 */
export function photoExtension(mimeType?: string | null, fileName?: string | null): PhotoExtension | null {
  const type = mimeType?.toLowerCase();
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/heic') return 'heic';
  if (type === 'image/heif') return 'heif';
  const ending = fileName?.split('.').pop()?.toLowerCase();
  if (ending === 'jpg' || ending === 'jpeg') return 'jpg';
  if (ending === 'heic' || ending === 'heif') return ending;
  return null;
}

/**
 * The phone's angle from the direction of gravity in its own axes: x to the
 * right of the screen, y to its top and z out of its front. That's what
 * expo-sensors' DeviceMotion gives as `accelerationIncludingGravity` on both iOS
 * and Android, while the phone is held still. Its `rotation` angles aren't used
 * because they can't tell a camera tilted up from one tilted down when the phone
 * is upright.
 */
export function angleFromGravity({ x, y, z }: { x: number; y: number; z: number }): PhotoAngle | null {
  const g = Math.hypot(x, y, z);
  if (g === 0) return null;
  const degrees = (radians: number) => Math.round(((radians * 180) / Math.PI) * 10) / 10;
  // The camera looks out of the back, along -z, and up is against gravity.
  return { tilt: degrees(Math.asin(z / g)), roll: degrees(Math.atan2(x, -y)) };
}
