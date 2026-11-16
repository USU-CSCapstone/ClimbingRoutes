// How the viewer decodes a model's textures. A photogrammetry texture is often
// 8192 px square: 256 MB once decoded, whatever its size as a JPEG. A model with
// two of them, plus its mesh, is more than iOS lets the 3D view's webview use,
// so iOS kills the webview mid-load. Phones decode each texture at a quarter of
// that and one at a time; on a phone screen the difference barely shows.
import { ImageBitmapLoader } from 'three';
import type { GLTFLoaderPlugin, GLTFParser } from 'three/addons/loaders/GLTFLoader.js';

/** The longest texture side decoded on a phone: 64 MB per texture rather than 256 MB at 8192. */
export const PHONE_TEXTURE_LIMIT = 4096;

/** The longest texture side to decode at here: smaller on touch screens, which have the least memory. */
export function textureLimit(gpuLimit: number): number {
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return touch ? Math.min(gpuLimit, PHONE_TEXTURE_LIMIT) : gpuLimit;
}

/** A GLTFLoader plugin that decodes the model's textures no bigger than `limit`. */
export function limitTextures(limit: number) {
  return (parser: GLTFParser): GLTFLoaderPlugin => {
    parser.textureLoader = new LimitedImageLoader(limit);
    return { name: 'climbing_routes_texture_limit' };
  };
}

/**
 * GLTFLoader's image decoder, shrinking anything over the limit and decoding
 * one image at a time, so at most one full-size image is ever in memory.
 */
class LimitedImageLoader extends ImageBitmapLoader {
  private readonly limit: number;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(limit: number) {
    super();
    this.limit = limit;
  }

  override load(
    url: string,
    onLoad?: (data: ImageBitmap) => void,
    _onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ) {
    const decoded = this.queue.then(() => decode(url, this.limit, this.options));
    this.queue = decoded.catch(() => {});
    decoded.then(
      (bitmap) => onLoad?.(bitmap),
      (err) => onError?.(err),
    );
  }
}

async function decode(url: string, limit: number, options: ImageBitmapOptions): Promise<ImageBitmap> {
  // As three.js's own loader does: glTF colors aren't color managed by the browser.
  const plain: ImageBitmapOptions = { ...options, colorSpaceConversion: 'none' };
  const blob = await (await fetch(url)).blob();
  const size = await imageSize(blob);
  if (size && Math.max(size.width, size.height) > limit) {
    const { width, height } = fit(size, limit);
    const bitmap = await createImageBitmap(blob, { ...plain, resizeWidth: width, resizeHeight: height, resizeQuality: 'high' });
    return shrink(bitmap, limit);
  }
  // A size the header didn't give is checked once it's decoded.
  return shrink(await createImageBitmap(blob, plain), limit);
}

/** The bitmap, scaled down through a canvas if it's still over the limit, for browsers that ignore resizeWidth. */
async function shrink(bitmap: ImageBitmap, limit: number): Promise<ImageBitmap> {
  if (Math.max(bitmap.width, bitmap.height) <= limit) return bitmap;
  const { width, height } = fit(bitmap, limit);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const small = await createImageBitmap(canvas);
  canvas.width = canvas.height = 0;
  return small;
}

function fit(size: { width: number; height: number }, limit: number) {
  const scale = limit / Math.max(size.width, size.height);
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
}

/** A JPEG's or PNG's pixel size from its header, without decoding it. Null for anything else. */
async function imageSize(blob: Blob): Promise<{ width: number; height: number } | null> {
  const bytes = new DataView(await blob.slice(0, 256 * 1024).arrayBuffer());
  if (bytes.byteLength >= 24 && bytes.getUint32(0) === 0x89504e47) {
    return { width: bytes.getUint32(16), height: bytes.getUint32(20) };
  }
  if (bytes.byteLength < 4 || bytes.getUint16(0) !== 0xffd8) return null;
  // Walk the JPEG's segments to the frame header (SOF), which holds the size.
  for (let at = 2; at + 9 <= bytes.byteLength; ) {
    if (bytes.getUint8(at) !== 0xff) return null;
    const marker = bytes.getUint8(at + 1);
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return { width: bytes.getUint16(at + 7), height: bytes.getUint16(at + 5) };
    at += 2 + bytes.getUint16(at + 2);
  }
  return null;
}
