// A scan on the phone: one wall's photos and what was known when each was taken.
// The camera (#51) and the photo picker (#52) write scans and the upload queue
// (#45) reads them, so these types are the handoff between them. Drafted for #51;
// #44 owns them, along with listing unfinished scans and deleting a scan's files.
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

export interface ScanPhoto {
  /** File name in the scan's folder, like photo-001.jpg. */
  file: string;
  /** ISO time the shutter was pressed. */
  takenAt: string;
  width: number;
  height: number;
  location: PhotoLocation | null;
  angle: PhotoAngle | null;
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
}

/**
 * The next photo's file name: photo-001.jpg, photo-002.jpg and so on, so the
 * files sort in the order they were taken. Numbered past the highest so far, so
 * a photo deleted in review (#52) never has its name reused.
 */
export function nextPhotoFile(photos: Pick<ScanPhoto, 'file'>[]): string {
  const last = Math.max(0, ...photos.map((p) => Number(/\d+/.exec(p.file)?.[0] ?? 0)));
  return `photo-${String(last + 1).padStart(3, '0')}.jpg`;
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
