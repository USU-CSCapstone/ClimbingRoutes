// Scans on the web, kept in memory with the same functions as scans.ts. A
// browser has no folder to keep them in, so a scan lasts as long as the page.
// Only the upload lane runs on the web, with photos picked from the computer
// (#52), and each photo stays a blob URL for its file until it's sent.
import { newScan, nextPhotoFile, type Scan, type ScanPhoto, type ScanPlan, type ScanSource, type TakenPhoto } from '@/core/capture';
import type { Uuid } from '@/core/types';

const scans = new Map<string, Scan>();
/** Blob URLs by scan id, then file name. */
const uris = new Map<string, Map<string, string>>();

export function createScan(wallUuid: Uuid, source: ScanSource, plan: ScanPlan | null): Scan {
  const scan = newScan(wallUuid, source, plan);
  scans.set(scan.id, scan);
  uris.set(scan.id, new Map());
  return scan;
}

export function readScan(id: string): Scan | null {
  return scans.get(id) ?? null;
}

export async function savePhoto(
  scan: Scan,
  photo: TakenPhoto,
  details: Pick<ScanPhoto, 'takenAt' | 'location' | 'angle'>,
): Promise<Scan> {
  const file = nextPhotoFile(scan.photos, photo.extension);
  uris.get(scan.id)?.set(file, photo.uri);
  const saved: Scan = {
    ...scan,
    photos: [...scan.photos, { file, width: photo.width, height: photo.height, ...details }],
  };
  scans.set(scan.id, saved);
  return saved;
}

export function deletePhoto(scan: Scan, photo: ScanPhoto): Scan {
  const kept: Scan = { ...scan, photos: scan.photos.filter((p) => p.file !== photo.file) };
  scans.set(scan.id, kept);
  const uri = uris.get(scan.id)?.get(photo.file);
  if (uri) URL.revokeObjectURL(uri);
  uris.get(scan.id)?.delete(photo.file);
  return kept;
}

export function photoUri(scan: Scan, photo: ScanPhoto): string {
  return uris.get(scan.id)?.get(photo.file) ?? '';
}
