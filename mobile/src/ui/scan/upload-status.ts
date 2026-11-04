import type { CaptureStatus } from '@/core/database';
import type { UploadProgress } from '@/data/uploads';

const mb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1e6))} MB`;
const photos = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`;

/** One line for an upload on the phone, like "Waiting for Wi-Fi — 34 photos, 110 MB". */
export function uploadText(progress: UploadProgress | null): string {
  if (!progress) return 'Getting ready to upload…';
  switch (progress.state) {
    case 'waiting':
      return `${WAITING[progress.reason]} — ${photos(progress.photos)}, ${mb(progress.bytes)}`;
    case 'uploading':
      return `Uploading photo ${progress.done + 1} of ${progress.total} — ${mb(progress.bytes)} left`;
    case 'failed':
      return `Upload stopped: ${progress.message}`;
  }
}

const WAITING = {
  'sign-in': 'Sign in on the Profile tab to upload',
  wifi: 'Waiting for Wi-Fi',
  connection: 'Waiting for a connection',
};

/** Where an uploaded capture is on the server, in words for the person who took it. */
export const CAPTURE_STATUS: Record<CaptureStatus, string> = {
  uploading: 'Uploading',
  uploaded: 'Uploaded, waiting for the team',
  processing: 'Being made into a 3D model',
  processed: 'Model made, waiting for review',
  failed: "Couldn't be made into a model",
};
