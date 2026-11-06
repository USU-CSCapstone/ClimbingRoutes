// Scans kept on the phone until they're uploaded: one folder each, holding the
// photos and a scan.json manifest (src/core/capture.ts). Drafted for the camera
// (#51) and review (#52) with only what they need: starting a scan, saving,
// reading and deleting photos. #44 adds listing unfinished scans and deleting a
// whole scan. The web keeps its scans in memory instead (scans.web.ts).
import { Directory, File, Paths } from 'expo-file-system';

import {
  MANIFEST_FILE,
  newScan,
  nextPhotoFile,
  type Scan,
  type ScanPhoto,
  type ScanPlan,
  type ScanSource,
  type TakenPhoto,
} from '@/core/capture';
import type { Uuid } from '@/core/types';

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
export function createScan(wallUuid: Uuid, source: ScanSource, plan: ScanPlan | null): Scan {
  const scan = newScan(wallUuid, source, plan);
  scanFolder(scan.id).create({ intermediates: true });
  writeManifest(scan);
  return scan;
}

/** A scan as its manifest has it, or null if it's gone. */
export function readScan(id: string): Scan | null {
  const manifest = new File(scanFolder(id), MANIFEST_FILE);
  if (!manifest.exists) return null;
  try {
    return JSON.parse(manifest.textSync()) as Scan;
  } catch {
    return null;
  }
}

/**
 * Moves a new photo into the scan's folder and adds it to the manifest, so it's
 * kept if the app closes. Returns the scan with the photo added. Save one photo
 * at a time: each save builds on the scan the last returned.
 */
export async function savePhoto(
  scan: Scan,
  photo: TakenPhoto,
  details: Pick<ScanPhoto, 'takenAt' | 'location' | 'angle'>,
): Promise<Scan> {
  const file = nextPhotoFile(scan.photos, photo.extension);
  await new File(photo.uri).move(new File(scanFolder(scan.id), file));
  const saved: Scan = {
    ...scan,
    photos: [...scan.photos, { file, width: photo.width, height: photo.height, ...details }],
  };
  writeManifest(saved);
  return saved;
}

/**
 * Takes a photo out of the scan and deletes its file. The manifest is written
 * first, so a crash in between leaves a stray file rather than a missing photo.
 * Returns the scan without it.
 */
export function deletePhoto(scan: Scan, photo: ScanPhoto): Scan {
  const kept: Scan = { ...scan, photos: scan.photos.filter((p) => p.file !== photo.file) };
  writeManifest(kept);
  const file = new File(scanFolder(scan.id), photo.file);
  if (file.exists) file.delete();
  return kept;
}

/** Where a scan's photo is on the phone, to show it. */
export function photoUri(scan: Scan, photo: ScanPhoto): string {
  return new File(scanFolder(scan.id), photo.file).uri;
}
