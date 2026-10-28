// Summarize the camera EXIF of photo sets before they go into RealityScan: camera,
// lens, focal length and 35 mm equivalent (what RealityScan starts its lens guess
// from), pixel size, orientation and GPS. Reads JPEG and HEIC, with no packages.
// Made for issue #48, comparing Expo camera JPEGs with the phone camera's HEICs.
//
// Usage: node exif.mjs <photo folder> [<photo folder> ...] [--files]
//   --files  also print one line per photo
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const perFile = args.includes("--files");
const dirs = args.filter((a) => a !== "--files");
if (!dirs.length) {
  console.error("usage: node exif.mjs <photo folder> [<photo folder> ...] [--files]");
  process.exit(2);
}

const PHOTO = /\.(jpe?g|heic|heif)$/i;
const ORIENTATION = { 1: "upright", 3: "upside down", 6: "turned 90° right", 8: "turned 90° left" };

// TIFF tags, by IFD.
const IFD0_TAGS = { 0x010f: "Make", 0x0110: "Model", 0x0112: "Orientation", 0x8769: "exifIfd", 0x8825: "gpsIfd" };
const EXIF_TAGS = {
  0x920a: "FocalLength",
  0xa405: "FocalLengthIn35mmFilm",
  0xa433: "LensMake",
  0xa434: "LensModel",
  0xa002: "PixelXDimension",
  0xa003: "PixelYDimension",
};
const GPS_TAGS = { 0x0002: "GPSLatitude" };
const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

/** Reads the tags above from a TIFF block, the body of an EXIF segment. */
function readTiff(buf) {
  const le = buf.toString("latin1", 0, 2) === "II";
  const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  if (u16(2) !== 42) throw new Error("EXIF has no TIFF header");
  const value = (type, count, at) => {
    if (type === 2) return buf.toString("latin1", at, at + count).replace(/\0+$/, "").trim();
    if (type === 3) return u16(at);
    if (type === 4) return u32(at);
    if (type === 5) return u32(at + 4) ? u32(at) / u32(at + 4) : null;
    return null;
  };
  const readIfd = (offset, names, out) => {
    if (!offset || offset + 2 > buf.length) return out;
    for (let i = 0, count = u16(offset); i < count; i++) {
      const entry = offset + 2 + i * 12;
      if (entry + 12 > buf.length) break;
      const name = names[u16(entry)];
      if (!name) continue;
      const type = u16(entry + 2);
      const count = u32(entry + 4);
      const size = (TYPE_SIZE[type] ?? 1) * count;
      const at = size <= 4 ? entry + 8 : u32(entry + 8);
      if (at + size <= buf.length) out[name] = value(type, count, at);
    }
    return out;
  };
  const tags = readIfd(u32(4), IFD0_TAGS, {});
  if (tags.exifIfd) readIfd(tags.exifIfd, EXIF_TAGS, tags);
  if (tags.gpsIfd) readIfd(tags.gpsIfd, GPS_TAGS, tags);
  return tags;
}

/** EXIF from the APP1 segment, and the pixel size from the frame header. */
function readJpeg(buf) {
  let tags = null;
  let width = null;
  let height = null;
  for (let o = 2; o + 4 <= buf.length && buf[o] === 0xff; ) {
    const marker = buf[o + 1];
    if (marker === 0xff) {
      o++;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) break; // image data starts
    const length = buf.readUInt16BE(o + 2);
    const segment = buf.subarray(o + 4, o + 2 + length);
    if (marker === 0xe1 && !tags && segment.toString("latin1", 0, 6) === "Exif\0\0") tags = readTiff(segment.subarray(6));
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      height = segment.readUInt16BE(1);
      width = segment.readUInt16BE(3);
    }
    o += 2 + length;
  }
  return { tags, width, height };
}

/** ISO base media boxes between two offsets, as { type, start, end } with start after the header. */
function boxes(buf, from, to) {
  const out = [];
  for (let o = from; o + 8 <= to; ) {
    let size = buf.readUInt32BE(o);
    let header = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(o + 8));
      header = 16;
    } else if (size === 0) {
      size = to - o;
    }
    if (size < header || o + size > to) break;
    out.push({ type: buf.toString("latin1", o + 4, o + 8), start: o + header, end: o + size });
    o += size;
  }
  return out;
}

/** Where an item's data is, from the item location box. */
function itemLocation(buf, iloc, wanted) {
  const version = buf[iloc.start];
  let o = iloc.start + 4;
  const uint = (bytes) => {
    let n = 0;
    for (let i = 0; i < bytes; i++) n = n * 256 + buf[o + i];
    o += bytes;
    return n;
  };
  const sizes = uint(2);
  const [offsetSize, lengthSize, baseSize] = [(sizes >> 12) & 15, (sizes >> 8) & 15, (sizes >> 4) & 15];
  const indexSize = version === 1 || version === 2 ? sizes & 15 : 0;
  const count = uint(version < 2 ? 2 : 4);
  for (let i = 0; i < count; i++) {
    const id = uint(version < 2 ? 2 : 4);
    const method = version === 1 || version === 2 ? uint(2) & 15 : 0;
    uint(2); // data reference index
    const base = uint(baseSize);
    let offset = null;
    let length = 0;
    for (let e = 0, extents = uint(2); e < extents; e++) {
      uint(indexSize);
      const extentOffset = uint(offsetSize);
      length += uint(lengthSize);
      offset ??= base + extentOffset;
    }
    if (id === wanted) return { method, offset, length };
  }
  return null;
}

/** EXIF from the HEIC's Exif item, and the pixel size from its largest image. */
function readHeic(buf) {
  const meta = boxes(buf, 0, buf.length).find((b) => b.type === "meta");
  if (!meta) throw new Error("HEIC has no meta box");
  const parts = boxes(buf, meta.start + 4, meta.end);
  const part = (type) => parts.find((b) => b.type === type);

  let exifId = null;
  const iinf = part("iinf");
  if (iinf) {
    const entries = iinf.start + 4 + (buf[iinf.start] === 0 ? 2 : 4);
    for (const infe of boxes(buf, entries, iinf.end)) {
      const version = buf[infe.start];
      if (infe.type !== "infe" || version < 2) continue;
      const idSize = version === 2 ? 2 : 4;
      const typeAt = infe.start + 4 + idSize + 2;
      if (buf.toString("latin1", typeAt, typeAt + 4) === "Exif") {
        exifId = idSize === 2 ? buf.readUInt16BE(infe.start + 4) : buf.readUInt32BE(infe.start + 4);
        break;
      }
    }
  }

  let tags = null;
  const iloc = part("iloc");
  const loc = exifId != null && iloc ? itemLocation(buf, iloc, exifId) : null;
  if (loc) {
    const base = loc.method === 1 ? (part("idat")?.start ?? 0) : 0;
    const item = buf.subarray(base + loc.offset, base + loc.offset + loc.length);
    // The item starts with the offset from its first 4 bytes to the TIFF header.
    tags = readTiff(item.subarray(4 + item.readUInt32BE(0)));
  }

  let width = null;
  let height = null;
  const iprp = part("iprp");
  const ipco = iprp && boxes(buf, iprp.start, iprp.end).find((b) => b.type === "ipco");
  for (const p of ipco ? boxes(buf, ipco.start, ipco.end) : []) {
    if (p.type !== "ispe") continue;
    const w = buf.readUInt32BE(p.start + 4);
    const h = buf.readUInt32BE(p.start + 8);
    if (!width || w * h > width * height) [width, height] = [w, h];
  }
  return { tags, width, height };
}

function readPhoto(file) {
  const buf = fs.readFileSync(file);
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isHeic = buf.toString("latin1", 4, 8) === "ftyp";
  if (!isJpeg && !isHeic) throw new Error("not a JPEG or HEIC file");
  const { tags, width, height } = isJpeg ? readJpeg(buf) : readHeic(buf);
  const t = tags ?? {};
  const w = width ?? t.PixelXDimension ?? null;
  const h = height ?? t.PixelYDimension ?? null;
  const equiv = t.FocalLengthIn35mmFilm ?? null;
  return {
    format: isJpeg ? "JPEG" : "HEIC",
    bytes: buf.length,
    hasExif: tags != null,
    camera: [t.Make, t.Model].filter(Boolean).join(" ") || null,
    lens: t.LensModel ?? null,
    focal: t.FocalLength != null ? `${round(t.FocalLength, 2)} mm` : null,
    equiv: equiv != null ? `${equiv} mm` : null,
    pixels: w && h ? `${w}×${h}` : null,
    // The focal length in pixels that the 35 mm equivalent implies for this image's size.
    focalPx: equiv && w && h ? Math.round((equiv * Math.hypot(w, h)) / Math.hypot(36, 24)) : null,
    orientation: t.Orientation != null ? `${t.Orientation} (${ORIENTATION[t.Orientation] ?? "other"})` : null,
    gps: t.GPSLatitude != null,
  };
}

const round = (n, places) => Number(n.toFixed(places));

/** "a × 30; b × 2", most common first. */
function counts(values) {
  const tally = new Map();
  for (const v of values) tally.set(v ?? "(none)", (tally.get(v ?? "(none)") ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v} × ${n}`).join("; ");
}

for (const dir of dirs) {
  const names = fs.readdirSync(dir).filter((f) => PHOTO.test(f)).sort();
  console.log(`\n${dir}`);
  if (!names.length) {
    console.log("  no JPEG or HEIC photos");
    continue;
  }
  const photos = [];
  for (const name of names) {
    try {
      photos.push({ name, ...readPhoto(path.join(dir, name)) });
    } catch (e) {
      console.log(`  ${name}: ${e.message}`);
    }
  }
  if (!photos.length) continue;
  const bytes = photos.reduce((s, p) => s + p.bytes, 0);
  const rows = [
    ["photos", `${photos.length} (${counts(photos.map((p) => p.format))})`],
    ["no EXIF", `${photos.filter((p) => !p.hasExif).length}`],
    ["camera", counts(photos.map((p) => p.camera))],
    ["lens", counts(photos.map((p) => p.lens))],
    ["focal", counts(photos.map((p) => (p.focal || p.equiv ? `${p.focal ?? "?"}, ${p.equiv ?? "?"} equiv` : null)))],
    ["pixels", counts(photos.map((p) => (p.pixels ? `${p.pixels}${p.focalPx ? `, focal ≈ ${p.focalPx} px` : ""}` : null)))],
    ["orientation", counts(photos.map((p) => p.orientation))],
    ["GPS", `${photos.filter((p) => p.gps).length} of ${photos.length}`],
    ["file size", `average ${(bytes / photos.length / 1e6).toFixed(1)} MB, total ${(bytes / 1e6).toFixed(0)} MB`],
  ];
  for (const [label, text] of rows) console.log(`  ${label.padEnd(12)} ${text}`);
  if (perFile) {
    for (const p of photos) {
      console.log(`    ${p.name}  ${p.pixels ?? "?"}  ${p.focal ?? "?"}  ${p.equiv ?? "?"} equiv  ${p.lens ?? ""}`);
    }
  }
}
