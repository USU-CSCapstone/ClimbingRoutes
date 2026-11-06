// Uploads a folder of wall photos as a capture, the way the app's upload queue
// (#45) will: signed in as a regular account, one photo at a time, scan.json
// last, then marked uploaded for the team PC to pull. For testing the pipeline
// with photos from the iPhone camera or the in-app camera.
//
// Usage, from supabase/:  npm run upload -- <wall uuid> <photo folder>
// Signs in as REGULAR_EMAIL from .env.
import fs from "fs";
import path from "path";

import { must, signedIn } from "./lib.mjs";

const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".heic": "image/heic", ".heif": "image/heif" };
const TRIES = 3;

const [wall, folder] = process.argv.slice(2);
if (!wall || !folder) throw new Error("usage: upload-capture.mjs <wall uuid> <photo folder>");
const photos = fs
  .readdirSync(folder)
  .filter((n) => TYPES[path.extname(n).toLowerCase()])
  .sort();
if (!photos.length) throw new Error(`No JPEG or HEIC photos in ${folder}`);
const manifest = path.join(folder, "scan.json");

const { supabase, user } = await signedIn("REGULAR");
const capture = must("start the capture", await supabase.from("captures").insert({ wall_uuid: wall }).select().single());
const prefix = `${user.id}/${capture.id}`;
console.log(`Capture ${capture.id}: uploading ${photos.length} photos`);

let bytes = 0;
for (const [i, name] of photos.entries()) {
  const data = fs.readFileSync(path.join(folder, name));
  await upload(name, data, TYPES[path.extname(name).toLowerCase()]);
  bytes += data.length;
  process.stdout.write(`\r  ${i + 1} of ${photos.length}, ${(bytes / 1e6).toFixed(1)} MB`);
}
process.stdout.write("\n");
if (fs.existsSync(manifest)) await upload("scan.json", fs.readFileSync(manifest), "application/json");

must(
  "mark it uploaded",
  await supabase.from("captures").update({ status: "uploaded", photo_count: photos.length }).eq("id", capture.id),
);
console.log("Uploaded. On the team PC, run npm run pull in scripts/captures.");

/** One file, retried. A file already there from an earlier try counts as done, since photos can't be overwritten. */
async function upload(name, data, contentType) {
  for (let attempt = 1; ; attempt++) {
    const { error } = await supabase.storage.from("captures").upload(`${prefix}/${name}`, data, { contentType });
    if (!error || /exists/i.test(error.message)) return;
    if (attempt === TRIES) throw new Error(`upload ${name}: ${error.message}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}
