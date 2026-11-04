// The upload queue (#45). A scan marked for upload goes up one photo at a time
// while the app is open: it waits for sign-in and for Wi-Fi (or any connection
// with cellular allowed), creates the server's capture row, uploads each photo
// with retries, then scan.json, and marks the capture uploaded for the team PC.
// The phone's copy is deleted once the server has every file. Progress is saved
// in the scan's manifest after each photo, so a restart carries on where it was.
//
// Photos go to captures/<user id>/<capture id>/<file>, the path the bucket's
// access rules expect (supabase/migrations/).
import 'expo-sqlite/localStorage/install';

import { useQueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { MANIFEST_FILE, type Scan } from '@/core/capture';
import { bytesLeft, deleteScan, listScans, photoFile, readScan, updateScan } from '@/data/scans';
import { supabase } from '@/data/supabase';

const TRIES = 3;
const CELLULAR_KEY = 'upload-cellular';
const CONSENT_KEY = 'upload-consent';

/** Where one scan's upload stands, for screens to show. */
export type UploadProgress =
  | { state: 'waiting'; reason: 'sign-in' | 'wifi' | 'connection'; photos: number; bytes: number }
  | { state: 'uploading'; done: number; total: number; bytes: number }
  | { state: 'failed'; message: string };

// Progress by scan id, for useUploadProgress().
let progress = new Map<string, UploadProgress>();
const listeners = new Set<() => void>();

function setProgress(id: string, value: UploadProgress | null) {
  progress = new Map(progress);
  if (value) progress.set(id, value);
  else progress.delete(id);
  for (const listener of listeners) listener();
}

/** How the scan's upload is going, or null if it isn't uploading. */
export function useUploadProgress(scanId: string | undefined): UploadProgress | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (scanId ? (progress.get(scanId) ?? null) : null),
  );
}

/** Whether uploads may use cellular data. Off by default: a scan is 50–200 MB. */
export function allowsCellular(): boolean {
  return readFlag(CELLULAR_KEY);
}

export function setAllowsCellular(allowed: boolean) {
  writeFlag(CELLULAR_KEY, allowed);
  kickUploads();
}

/** Whether this phone has agreed to the one-time upload notice. */
export function hasUploadConsent(): boolean {
  return readFlag(CONSENT_KEY);
}

export function giveUploadConsent() {
  writeFlag(CONSENT_KEY, true);
}

/** Queues a scan for upload. It starts as soon as the phone is signed in and on the right network. */
export function startUpload(scanId: string) {
  const scan = readScan(scanId);
  if (!scan) throw new Error('This scan is no longer on the phone');
  updateScan({ ...scan, status: 'uploading' });
  kickUploads();
}

/** Stops queueing a scan and keeps its photos on the phone. Photos already uploaded are swept from the server later. */
export function cancelUpload(scanId: string) {
  const scan = readScan(scanId);
  if (scan) updateScan({ ...scan, status: 'draft', upload: undefined });
  setProgress(scanId, null);
}

let running = false;
let again = false;
let onUploaded: (() => void) | null = null;
/** Scans whose capture was started over this run. A second refusal stops instead of looping. */
let restarted = new Set<string>();

/** Thrown when the scan was stopped or deleted mid-upload, to end its upload quietly. */
class Stopped extends Error {}

/** Runs the queue, or asks the running one to look again when it finishes. */
export function kickUploads() {
  if (Platform.OS === 'web') return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  void (async () => {
    try {
      restarted = new Set();
      do {
        again = false;
        for (const scan of listScans().filter((s) => s.status === 'uploading')) await upload(scan);
      } while (again);
    } finally {
      running = false;
    }
  })();
}

/**
 * Keeps the queue running: on start, when the network or sign-in changes, and
 * when the app comes back to the front. Mounted once, in the root layout.
 */
export function useUploadQueue() {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    onUploaded = () => queryClient.invalidateQueries({ queryKey: ['my-captures'] });
    kickUploads();
    const network = Network.addNetworkStateListener(() => kickUploads());
    const app = AppState.addEventListener('change', (state) => state === 'active' && kickUploads());
    const auth = supabase.auth.onAuthStateChange(() => kickUploads());
    return () => {
      network.remove();
      app.remove();
      auth.data.subscription.unsubscribe();
      onUploaded = null;
    };
  }, [queryClient]);
}

/** Uploads one scan as far as it can go now. */
async function upload(start: Scan) {
  let scan = start;
  const waiting = (reason: 'sign-in' | 'wifi' | 'connection') => {
    const left = scan.photos.length - (scan.upload?.uploaded.length ?? 0);
    setProgress(scan.id, { state: 'waiting', reason, photos: left, bytes: bytesLeft(scan) });
  };
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return waiting('sign-in');
    const blocked = await networkBlocks();
    if (blocked) return waiting(blocked);

    // Another account's capture can't be added to; start over as this one.
    if (scan.upload && scan.upload.userId !== user.id) scan = save({ ...scan, upload: undefined });
    if (!scan.upload) {
      const { data: capture, error } = await supabase
        .from('captures')
        .insert({ wall_uuid: scan.wallUuid, photo_count: scan.photos.length })
        .select('id')
        .single();
      if (error) throw new Error(`Couldn't start the upload: ${error.message}`);
      scan = save({ ...scan, upload: { userId: user.id, captureId: capture.id, uploaded: [] } });
    }
    const folder = `${user.id}/${scan.upload!.captureId}`;

    for (const photo of scan.photos) {
      if (scan.upload!.uploaded.includes(photo.file)) continue;
      const stop = await networkBlocks();
      if (stop) return waiting(stop);
      setProgress(scan.id, {
        state: 'uploading',
        done: scan.upload!.uploaded.length,
        total: scan.photos.length,
        bytes: bytesLeft(scan),
      });
      const ok = await put(`${folder}/${photo.file}`, await photoFile(scan, photo).arrayBuffer(), 'image/jpeg');
      if (!ok) {
        // The capture is gone or past uploading, like after 14 days. Start a new one, once.
        if (restarted.has(scan.id)) throw new Error('The server refused the photos');
        restarted.add(scan.id);
        save({ ...scan, upload: undefined });
        again = true;
        return;
      }
      scan = save({ ...scan, upload: { ...scan.upload!, uploaded: [...scan.upload!.uploaded, photo.file] } });
    }

    // The manifest goes last, so the team PC never sees a capture without its photos.
    scan = save(scan);
    await put(`${folder}/${MANIFEST_FILE}`, new TextEncoder().encode(JSON.stringify(scan, null, 2)).buffer, 'application/json');
    const { error } = await supabase
      .from('captures')
      .update({ status: 'uploaded', photo_count: scan.photos.length })
      .eq('id', scan.upload!.captureId);
    if (error) throw new Error(`Couldn't finish the upload: ${error.message}`);

    deleteScan(scan.id);
    setProgress(scan.id, null);
    onUploaded?.();
  } catch (e) {
    if (e instanceof Stopped) setProgress(scan.id, null);
    else setProgress(scan.id, { state: 'failed', message: e instanceof Error ? e.message : String(e) });
  }
}

/**
 * Uploads one file, with retries. A file the server already has counts as
 * uploaded, since a retry can follow an upload that worked but whose answer was
 * lost. Returns false if the access rules refuse it, meaning the capture can't
 * take more files.
 */
async function put(path: string, body: ArrayBuffer, contentType: string): Promise<boolean> {
  for (let attempt = 1; ; attempt++) {
    const { error } = await supabase.storage.from('captures').upload(path, body, { contentType });
    if (!error || /exists/i.test(error.message)) return true;
    if ('code' in error && error.code === 'AccessDenied') return false;
    if (attempt === TRIES) throw new Error(`Upload failed: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}

/** Why the network can't be used now, or null if it can. */
async function networkBlocks(): Promise<'wifi' | 'connection' | null> {
  const state = await Network.getNetworkStateAsync();
  if (!state.isConnected || state.isInternetReachable === false) return 'connection';
  if (state.type === Network.NetworkStateType.CELLULAR && !allowsCellular()) return 'wifi';
  return null;
}

/** Saves upload progress, unless the scan was stopped or deleted meanwhile, which ends its upload. */
function save(scan: Scan): Scan {
  if (readScan(scan.id)?.status !== 'uploading') throw new Stopped();
  updateScan(scan);
  return scan;
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // Not saved: asked again next time.
  }
}
