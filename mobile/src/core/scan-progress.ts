// Where an uploaded scan has got to, from its capture row and the model made
// from it. A capture stays `processed` whatever the review decides, so the
// review's outcome comes from the model.
import type { CaptureStatus, ModelStatus } from './database';

/** The steps a scan goes through, in order, as its owner sees them. */
export const SCAN_STEPS = ['Uploaded', '3D model', 'Review', 'Published'] as const;

export type ScanStage =
  /** Still on its way. `step` is the one in SCAN_STEPS it's at now. */
  | { kind: 'underway'; step: 1 | 2; label: string }
  | { kind: 'published' }
  /** The model couldn't be made, or the reviewer turned it down. `reason` is theirs, when they gave one. */
  | { kind: 'not-used'; reason: string | null };

export interface ScanModel {
  status: ModelStatus;
  review_note: string | null;
  version: number;
}

/** The model that says most about the scan: a published one if there is one, otherwise the newest. */
export function decidingModel<T extends ScanModel>(models: T[]): T | null {
  if (!models.length) return null;
  const newestFirst = [...models].sort((a, b) => b.version - a.version);
  return newestFirst.find((m) => m.status === 'published') ?? newestFirst[0];
}

export function scanStage(
  capture: { status: CaptureStatus; failure_reason: string | null },
  model: ScanModel | null,
): ScanStage {
  if (model?.status === 'published') return { kind: 'published' };
  if (model?.status === 'rejected') return { kind: 'not-used', reason: model.review_note };
  if (capture.status === 'failed') return { kind: 'not-used', reason: capture.failure_reason };
  if (model || capture.status === 'processed') return { kind: 'underway', step: 2, label: 'In review' };
  if (capture.status === 'processing') return { kind: 'underway', step: 1, label: 'Being made' };
  return { kind: 'underway', step: 1, label: 'In line' };
}
