// Model files kept in the browser's IndexedDB, so each version downloads once.
// It runs where the viewer runs: the browser on web, and the DOM component's
// webview on iOS and Android, which in Expo Go can't read files the app saved.
// Versions never change, so a saved copy is always right; only the newest copy
// per wall is kept.
import type { ModelCacheKey } from '@/viewer/types';

const DB_NAME = 'climbing-routes';
const STORE = 'models';

interface Saved {
  group: string;
  bytes: ArrayBuffer;
}

/**
 * The model's bytes: the saved copy if there is one, or downloaded (and saved
 * when `cache` is given). Storage problems never stop the model loading.
 */
export async function loadModelBytes(
  url: string,
  cache: ModelCacheKey | undefined,
  onProgress: (loaded: number, total: number) => void,
  signal: AbortSignal,
): Promise<{ bytes: ArrayBuffer; fromCache: boolean }> {
  const db = cache ? await open().catch(() => null) : null;
  try {
    if (db && cache) {
      const saved = await request<Saved | undefined>(db, 'readonly', (s) => s.get(cache.key)).catch(() => undefined);
      if (saved?.bytes) return { bytes: saved.bytes, fromCache: true };
    }
    const bytes = await download(url, onProgress, signal);
    if (db && cache) await save(db, cache, bytes).catch(() => {});
    return { bytes, fromCache: false };
  } finally {
    db?.close();
  }
}

async function download(url: string, onProgress: (loaded: number, total: number) => void, signal: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Couldn't download the model (HTTP ${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body) return res.arrayBuffer();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total) onProgress(loaded, total);
  }
  const out = new Uint8Array(loaded);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out.buffer;
}

async function save(db: IDBDatabase, cache: ModelCacheKey, bytes: ArrayBuffer) {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    // Older versions of the same wall go, so the cache holds one model per wall.
    store.openCursor().onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (!cursor) return;
      if ((cursor.value as Saved).group === cache.group && cursor.key !== cache.key) cursor.delete();
      cursor.continue();
    };
    store.put({ group: cache.group, bytes } satisfies Saved, cache.key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no IndexedDB'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(db: IDBDatabase, mode: IDBTransactionMode, make: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = make(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}
