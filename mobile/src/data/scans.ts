// Scans kept on the phone until they're uploaded: one folder each, holding the
// photos and a scan.json manifest (src/core/capture.ts). The camera (#51) and
// the photo picker (#52) write them, review (#52) deletes photos from them, the
// upload queue (#45) reads them, and screens list them with useScans(). iOS and
// Android only: on the web, scans.web.ts keeps them in memory instead.
import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import {
  MANIFEST_FILE,
  MANIFEST_VERSION,
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
function scansRoot(): Directory {
  return new Directory(Paths.document, 'scans');
}

function scanFolder(id: string): Directory {
  return new Directory(Paths.document, 'scans', id);
}

// Screens re-read the list whenever a scan is saved or deleted.
const listeners = new Set<() => void>();
let snapshot: Scan[] | null = null;

function changed() {
  snapshot = null;
  for (const listener of listeners) listener();
}

/** Writes beside the manifest, then moves over it, so a crash mid-write can't leave half a manifest. */
function writeManifest(scan: Scan) {
  const folder = scanFolder(scan.id);
  const temp = new File(folder, `${MANIFEST_FILE}.tmp`);
  temp.create({ overwrite: true });
  temp.writeSync(JSON.stringify(scan, null, 2));
  temp.moveSync(new File(folder, MANIFEST_FILE), { overwrite: true });
  changed();
}

/** Saves a changed scan, like a new status or upload progress. */
export function updateScan(scan: Scan) {
  writeManifest(scan);
}

/** The scan with this id, or null if it's gone or its manifest can't be read. */
export function readScan(id: string): Scan | null {
  try {
    const file = new File(scanFolder(id), MANIFEST_FILE);
    if (!file.exists) return null;
    const scan = JSON.parse(file.textSync()) as Scan;
    return scan.version === MANIFEST_VERSION ? scan : null;
  } catch {
    return null;
  }
}

/** Every scan on the phone, newest first. */
export function listScans(): Scan[] {
  const root = scansRoot();
  if (!root.exists) return [];
  return root
    .list()
    .flatMap((entry) => (entry instanceof Directory ? [readScan(entry.name)] : []))
    .filter((scan): scan is Scan => scan != null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Every scan on the phone, newest first, kept up to date as scans change. */
export function useScans(): Scan[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (snapshot ??= listScans()),
  );
}

/** Deletes a scan's photos and manifest from the phone. */
export function deleteScan(id: string) {
  const folder = scanFolder(id);
  if (folder.exists) folder.delete();
  changed();
}

/** Bytes of the scan's photos the server doesn't have yet. */
export function bytesLeft(scan: Scan): number {
  const done = new Set(scan.upload?.uploaded);
  return scan.photos.filter((p) => !done.has(p.file)).reduce((sum, p) => sum + (photoFile(scan, p).size ?? 0), 0);
}

/** A scan's photo as a file, to read or upload. */
export function photoFile(scan: Scan, photo: ScanPhoto): File {
  return new File(scanFolder(scan.id), photo.file);
}

/** Starts a scan of a wall: its folder and a manifest with no photos yet. */
export function createScan(wallUuid: Uuid, source: ScanSource, plan: ScanPlan | null): Scan {
  const scan = newScan(wallUuid, source, plan);
  scanFolder(scan.id).create({ intermediates: true });
  writeManifest(scan);
  return scan;
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
  const file = photoFile(scan, photo);
  if (file.exists) file.delete();
  return kept;
}

/** Where a scan's photo is on the phone, to show it. */
export function photoUri(scan: Scan, photo: ScanPhoto): string {
  return photoFile(scan, photo).uri;
}
