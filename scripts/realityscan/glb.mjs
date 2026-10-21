// Read and write single-buffer GLB files, as written by glb-finish.mjs.
import fs from "fs";

export function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString("ascii", 0, 4) !== "glTF") throw new Error(`${file} is not a GLB file`);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString("utf8", 20, 20 + jsonLen));
  const binStart = 20 + jsonLen + 8;
  const bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen));
  const view = (i) => {
    const bv = json.bufferViews[i];
    return bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  };
  return { json, view };
}

// Writes json with every bufferView's bytes taken from views(i), packed in order.
export function writeGlb(file, json, views) {
  const chunks = [];
  let length = 0;
  json.bufferViews = json.bufferViews.map((bv, i) => {
    const bytes = views(i);
    const pad = (4 - (length % 4)) % 4;
    if (pad) chunks.push(Buffer.alloc(pad));
    length += pad;
    chunks.push(bytes);
    const out = { ...bv, buffer: 0, byteOffset: length, byteLength: bytes.length };
    length += bytes.length;
    return out;
  });
  chunks.push(Buffer.alloc((4 - (length % 4)) % 4));
  const bin = Buffer.concat(chunks);
  json.buffers = [{ byteLength: bin.length }];

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
  fs.writeFileSync(file, Buffer.concat([header, chunkHeader(jsonChunk.length, "JSON"), jsonChunk, chunkHeader(bin.length, "BIN\0"), bin]));
  return fs.statSync(file).size;
}
