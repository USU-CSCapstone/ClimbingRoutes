// Scans kept on the phone until they're uploaded: one folder each, holding the
// photos and a scan.json manifest (src/core/capture.ts). The camera (#51)
// writes them, the upload queue (#45) reads them, and screens list them with
// useScans(). iOS and Android only: on the web, scans.web.ts has none, and
// photos come from the computer instead (#52).
import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import {
  MANIFEST_FILE,
  MANIFEST_VERSION,
  nextPhotoFile,
  type Scan,
  type ScanPhoto,
  type ScanPlan,
  type ScanSource,
} from '@/core/capture';
import type { Uuid } from '@/core/types';

/** A photo as the camera hands it over, in a temporary file. */
export interface TakenPhoto {
  uri: string;
  width: number;
  height: number;
}

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
  const now = new Date();
  const scan: Scan = {
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
  return photoFile(scan, photo).uri;
}
