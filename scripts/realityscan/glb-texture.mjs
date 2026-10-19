// Swap the embedded texture of a finished GLB, e.g. for a JPEG copy of its PNG.
// Usage: node glb-texture.mjs <in.glb> <image.jpg|png> <out.glb>
import fs from "fs";
import path from "path";
import { readGlb, writeGlb } from "./glb.mjs";

const [src, image, dst] = process.argv.slice(2);
if (!src || !image || !dst) {
  console.error("usage: node glb-texture.mjs <in.glb> <image.jpg|png> <out.glb>");
  process.exit(2);
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const mimeType = MIME[path.extname(image).toLowerCase()];
if (!mimeType) throw new Error(`glTF can't use this texture format: ${image}`);

const { json, view } = readGlb(src);
if ((json.images || []).length !== 1 || json.images[0].bufferView === undefined) {
  throw new Error(`expected exactly one embedded image in ${src}`);
}
const img = json.images[0];
const bytes = fs.readFileSync(image);
const before = json.bufferViews[img.bufferView].byteLength;
img.mimeType = mimeType;
const size = writeGlb(dst, json, (i) => (i === img.bufferView ? bytes : view(i)));

console.log(`texture ${(before / 1e6).toFixed(1)} MB -> ${(bytes.length / 1e6).toFixed(1)} MB (${mimeType})`);
console.log(`wrote ${dst} (${(size / 1e6).toFixed(1)} MB)`);
