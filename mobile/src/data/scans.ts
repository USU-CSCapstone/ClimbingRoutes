// Scans kept on the phone until they're uploaded: one folder each, holding the
// photos and a scan.json manifest (src/core/capture.ts). Drafted for the camera
// (#51) with only what it needs, starting a scan and saving each photo into it.
// #44 adds listing unfinished scans and deleting a scan's files. iOS and Android
// only: on the web, photos come from the computer instead (#52).
import { Directory, File, Paths } from 'expo-file-system';

import { MANIFEST_FILE, MANIFEST_VERSION, nextPhotoFile, type Scan, type ScanPhoto, type ScanPlan } from '@/core/capture';
import type { Uuid } from '@/core/types';

/** A photo as the camera hands it over, in a temporary file. */
export interface TakenPhoto {
  uri: string;
  width: number;
  height: number;
}

/** In documents rather than the cache, which the system can clear while a scan waits for Wi-Fi. */
function scanFolder(id: string): Directory {
  return new Directory(Paths.document, 'scans', id);
}

/** Writes beside the manifest, then moves over it, so a crash mid-write can't leave half a manifest. */
function writeManifest(scan: Scan) {
  const folder = scanFolder(scan.id);
  const temp = new File(folder, `${MANIFEST_FILE}.tmp`);
  temp.create({ overwrite: true });
  temp.writeSync(JSON.stringify(scan, null, 2));
  temp.moveSync(new File(folder, MANIFEST_FILE), { overwrite: true });
}

/** Starts a scan of a wall: its folder and a manifest with no photos yet. */
export function createScan(wallUuid: Uuid, plan: ScanPlan): Scan {
  const now = new Date();
  const scan: Scan = {
    version: MANIFEST_VERSION,
    // Sorts by when it was started, with a random part in case two start at once.
    id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    wallUuid,
    status: 'draft',
    createdAt: now.toISOString(),
    plan,
    photos: [],
  };
  scanFolder(scan.id).create({ intermediates: true });
  writeManifest(scan);
  return scan;
}

/**
 * Moves a photo the camera just took into the scan's folder and adds it to the
 * manifest, so it's kept if the app closes. Returns the scan with the photo
 * added. Save one photo at a time: each save builds on the scan the last returned.
 */
export async function savePhoto(
  scan: Scan,
  photo: TakenPhoto,
  details: Pick<ScanPhoto, 'takenAt' | 'location' | 'angle'>,
): Promise<Scan> {
  const file = nextPhotoFile(scan.photos);
  await new File(photo.uri).move(new File(scanFolder(scan.id), file));
  const saved: Scan = {
    ...scan,
    photos: [...scan.photos, { file, width: photo.width, height: photo.height, ...details }],
  };
  writeManifest(saved);
  return saved;
}

/** Where a scan's photo is on the phone, to show it. */
export function photoUri(scan: Scan, photo: ScanPhoto): string {
  return new File(scanFolder(scan.id), photo.file).uri;
}
