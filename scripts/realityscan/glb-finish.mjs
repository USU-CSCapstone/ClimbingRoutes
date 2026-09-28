// Make a RealityScan GLB ready for a viewer, as one self-contained file:
//  - use the color texture, even if the GLB points at the checkerboard "unwrap" layer
//  - drop COLOR_0 (viewers multiply it into the texture, which darkens and mottles it)
//  - stand the model Y-up (RealityScan writes Z-up; glTF is Y-up)
//  - embed the textures instead of referencing external image files
// Usage: node glb-finish.mjs <in.glb> <out.glb>
import fs from "fs";
import path from "path";

const [src, dst] = process.argv.slice(2);
if (!src || !dst) {
  console.error("usage: node glb-finish.mjs <in.glb> <out.glb>");
  process.exit(2);
}

const buf = fs.readFileSync(src);
if (buf.toString("ascii", 0, 4) !== "glTF") throw new Error(`${src} is not a GLB file`);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.toString("utf8", 20, 20 + jsonLen));
const binStart = 20 + jsonLen + 8;
const oldBin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen));
if (json.animations || json.skins || (json.accessors || []).some((a) => a.sparse)) {
  throw new Error("unexpected GLB content (animations, skins or sparse accessors); not a plain RealityScan export");
}

for (const mesh of json.meshes) for (const prim of mesh.primitives) delete prim.attributes.COLOR_0;

// Rebuild the binary chunk with only the data still in use, then append the textures.
const chunks = [];
const bufferViews = [];
let length = 0;
function addView(bytes, from = {}) {
  const pad = (4 - (length % 4)) % 4;
  if (pad) chunks.push(Buffer.alloc(pad));
  length += pad;
  const view = { buffer: 0, byteOffset: length, byteLength: bytes.length };
  if (from.byteStride) view.byteStride = from.byteStride;
  if (from.target) view.target = from.target;
  bufferViews.push(view);
  chunks.push(bytes);
  length += bytes.length;
  return bufferViews.length - 1;
}
function copyView(i) {
  const bv = json.bufferViews[i];
  const start = bv.byteOffset || 0;
  return addView(oldBin.subarray(start, start + bv.byteLength), bv);
}

const accessors = [];
const accessorMap = new Map();
const viewMap = new Map();
function keepAccessor(i) {
  if (!accessorMap.has(i)) {
    const acc = { ...json.accessors[i] };
    if (acc.bufferView !== undefined) {
      if (!viewMap.has(acc.bufferView)) viewMap.set(acc.bufferView, copyView(acc.bufferView));
      acc.bufferView = viewMap.get(acc.bufferView);
    }
    accessors.push(acc);
    accessorMap.set(i, accessors.length - 1);
  }
  return accessorMap.get(i);
}
let triangles = 0;
let vertices = 0;
for (const mesh of json.meshes) {
  for (const prim of mesh.primitives) {
    for (const key of Object.keys(prim.attributes)) prim.attributes[key] = keepAccessor(prim.attributes[key]);
    if (prim.indices !== undefined) prim.indices = keepAccessor(prim.indices);
    vertices += accessors[prim.attributes.POSITION].count;
    triangles += (prim.indices !== undefined ? accessors[prim.indices].count : accessors[prim.attributes.POSITION].count) / 3;
  }
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const notes = [];
for (const img of json.images || []) {
  if (img.uri === undefined) {
    img.bufferView = copyView(img.bufferView);
    continue;
  }
  if (img.uri.startsWith("data:")) throw new Error("data: URI textures are not supported");
  let file = path.join(path.dirname(src), decodeURIComponent(img.uri));
  if (/_unwrap\.\w+$/i.test(file)) {
    const color = file.replace(/_unwrap(\.\w+)$/i, "_diffuse$1");
    if (!fs.existsSync(color)) {
      throw new Error(`the GLB uses the checkerboard layer ${path.basename(file)}, and no ${path.basename(color)} was exported`);
    }
    notes.push(`the GLB pointed at the checkerboard layer ${path.basename(file)}; using ${path.basename(color)} instead`);
    file = color;
  }
  const mimeType = MIME[path.extname(file).toLowerCase()];
  if (!mimeType) throw new Error(`glTF can't use this texture format: ${file}`);
  const bytes = fs.readFileSync(file);
  img.bufferView = addView(bytes);
  img.mimeType = mimeType;
  delete img.uri;
  notes.push(`embedded ${path.basename(file)} (${(bytes.length / 1e6).toFixed(1)} MB)`);
}
chunks.push(Buffer.alloc((4 - (length % 4)) % 4));
const bin = Buffer.concat(chunks);
json.accessors = accessors;
json.bufferViews = bufferViews;
json.buffers = [{ byteLength: bin.length }];

const s = Math.SQRT1_2; // -90 degrees about X turns RealityScan's +Z up into glTF's +Y up
for (const scene of json.scenes) {
  json.nodes.push({ name: "Z-up to Y-up", rotation: [-s, 0, 0, s], children: scene.nodes });
  scene.nodes = [json.nodes.length - 1];
}

const jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)]);
const chunkHeader = (len, type) => {
  const h = Buffer.alloc(8);
  h.writeUInt32LE(len, 0);
  h.write(type, 4, "ascii");
  return h;
};
const header = Buffer.alloc(12);
header.write("glTF", 0, "ascii");
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8);
fs.writeFileSync(dst, Buffer.concat([header, chunkHeader(jsonChunk.length, "JSON"), jsonChunk, chunkHeader(bin.length, "BIN\0"), bin]));

console.log(`${triangles.toLocaleString("en-US")} triangles, ${vertices.toLocaleString("en-US")} vertices, COLOR_0 removed, Y-up`);
for (const note of notes) console.log(note);
console.log(`wrote ${dst} (${(fs.statSync(dst).size / 1e6).toFixed(1)} MB)`);
