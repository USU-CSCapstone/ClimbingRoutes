// Model files kept in the browser's IndexedDB, so each version downloads once.
// It runs where the viewer runs: the browser on web, and the DOM component's
// webview on iOS and Android, which in Expo Go can't read files the app saved.
// Versions never change, so a saved GLB stays right; only the newest copy per
// wall is kept. Anything that isn't a whole GLB, like a Wi-Fi sign-in page or a
// cut-off download, is never saved or reused.
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
      if (saved?.bytes && isWholeGlb(saved.bytes)) return { bytes: saved.bytes, fromCache: true };
    }
    const bytes = await download(url, onProgress, signal);
    if (!isGlb(bytes)) {
      throw new Error("The download wasn't a 3D model. If this Wi-Fi has a sign-in page, sign in and try again.");
    }
    if (!isWholeGlb(bytes)) throw new Error('The model only partly downloaded. Try again on a steadier connection.');
    if (db && cache) await save(db, cache, bytes).catch(() => {});
    return { bytes, fromCache: false };
  } finally {
    db?.close();
  }
}

/** Drops a saved model, like one that wouldn't open, so the next load downloads it again. */
export async function forgetModel(key: string): Promise<void> {
  const db = await open().catch(() => null);
  if (!db) return;
  await request(db, 'readwrite', (s) => s.delete(key)).catch(() => {});
  db.close();
}

/** True if the bytes start like a GLB file, with the ASCII magic "glTF". */
function isGlb(bytes: ArrayBuffer): boolean {
  const head = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  return head.length === 4 && head[0] === 0x67 && head[1] === 0x6c && head[2] === 0x54 && head[3] === 0x46;
}

/** A GLB that's all there: its header gives the file's length. */
function isWholeGlb(bytes: ArrayBuffer): boolean {
  return isGlb(bytes) && bytes.byteLength >= 12 && new DataView(bytes).getUint32(8, true) === bytes.byteLength;
}

/**
 * Streams the file into one buffer, sized from Content-Length when the server
 * sends it, so a 36 MB model takes 36 MB while downloading rather than twice that.
 */
async function download(url: string, onProgress: (loaded: number, total: number) => void, signal: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Couldn't download the model (HTTP ${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body) return res.arrayBuffer();
  const reader = res.body.getReader();
  let out = new Uint8Array(total || 1024 * 1024);
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    // Grows if there's no Content-Length or it was wrong.
    if (loaded + value.length > out.length) {
      const bigger = new Uint8Array(Math.max(out.length * 2, loaded + value.length));
      bigger.set(out.subarray(0, loaded));
      out = bigger;
    }
    out.set(value, loaded);
    loaded += value.length;
    if (total) onProgress(loaded, total);
  }
  return loaded === out.length ? out.buffer : out.slice(0, loaded).buffer;
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
