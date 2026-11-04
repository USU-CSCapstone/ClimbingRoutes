// The web has no camera or scan storage: photos are picked from the computer
// instead (#52). Same functions as scans.ts, with no scans, so shared screens
// and the upload queue work unchanged.
import type { Scan, ScanPhoto, ScanPlan, ScanSource } from '@/core/capture';
import type { Uuid } from '@/core/types';

export interface TakenPhoto {
  uri: string;
  width: number;
  height: number;
}

const NOT_ON_WEB = 'Scans are taken in the phone app';
const NO_SCANS: Scan[] = [];

export function updateScan(_scan: Scan) {}

export function readScan(_id: string): Scan | null {
  return null;
}

export function listScans(): Scan[] {
  return NO_SCANS;
}

export function useScans(): Scan[] {
  return NO_SCANS;
}

export function deleteScan(_id: string) {}

export function bytesLeft(_scan: Scan): number {
  return 0;
}

export function photoFile(_scan: Scan, _photo: ScanPhoto): never {
  throw new Error(NOT_ON_WEB);
}

export function createScan(_wallUuid: Uuid, _source: ScanSource, _plan: ScanPlan | null): Scan {
  throw new Error(NOT_ON_WEB);
}

export async function savePhoto(): Promise<Scan> {
  throw new Error(NOT_ON_WEB);
}

export function photoUri(_scan: Scan, _photo: ScanPhoto): string {
  throw new Error(NOT_ON_WEB);
}
