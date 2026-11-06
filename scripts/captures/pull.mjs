// Downloads uploaded captures to the team PC (#46). Each one is claimed first,
// which sets it to processing, so it's only pulled once. Prints the commands
// that turn each into a model.
//
// Usage, from scripts/captures/:
//   npm run pull                    every uploaded capture
//   npm run pull -- <capture id>    download one again, like after the PC restarted mid-pull
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  admin,
  captureDir,
  DATA_DIR,
  isPhoto,
  listRemote,
  markFailed,
  MANIFEST,
  must,
  remoteFolder,
  ROW_FILE,
  RUNS_DIR,
} from "./lib.mjs";

const supabase = admin();
const again = process.argv[2];
const pulled = [];

if (again) {
  const capture = must("look up the capture", await supabase.from("captures").select().eq("id", again).single());
  if (capture.status !== "processing") throw new Error(`Capture ${again} is ${capture.status}, not processing`);
  if (await download(capture)) pulled.push(capture);
} else {
  for (;;) {
    const [capture] = must("claim a capture", await supabase.rpc("claim_capture"));
    if (!capture) break;
    if (await download(capture)) pulled.push(capture);
  }
}

if (!pulled.length) {
  console.log("Nothing waiting.");
} else {
  const scripts = fileURLToPath(new URL("../", import.meta.url));
  console.log(`\nNext, in PowerShell on the PC's desktop (RealityScan does nothing over SSH):`);
  for (const c of pulled) {
    console.log(`\n  ${path.join(scripts, "realityscan", "run.reproject.ps1")} -Name ${c.id} -Imgs "${captureDir(c.id)}" -Root "${RUNS_DIR}"`);
    console.log(`  npm run finish -- ${c.id}`);
  }
}

/** Downloads the capture's files. Returns false, and marks it failed, if it can't be used. */
async function download(capture) {
  const dir = captureDir(capture.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, ROW_FILE), JSON.stringify(capture, null, 2));

  const names = await listRemote(supabase, capture);
  const photos = names.filter(isPhoto);
  if (!photos.length) {
    await markFailed(supabase, capture.id, "No photos were uploaded.");
    console.log(`${capture.id}: failed, no photos`);
    return false;
  }
  if (capture.photo_count && photos.length !== capture.photo_count) {
    await markFailed(supabase, capture.id, `Only ${photos.length} of ${capture.photo_count} photos were uploaded.`);
    console.log(`${capture.id}: failed, ${photos.length} of ${capture.photo_count} photos`);
    return false;
  }

  let bytes = 0;
  for (const name of names.filter((n) => isPhoto(n) || n === MANIFEST)) {
    const blob = must(`download ${name}`, await supabase.storage.from("captures").download(`${remoteFolder(capture)}/${name}`));
    const data = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(path.join(dir, name), data);
    bytes += data.length;
  }
  const manifest = names.includes(MANIFEST) ? "" : ", no scan.json";
  console.log(`${capture.id}: ${photos.length} photos, ${(bytes / 1e6).toFixed(1)} MB${manifest} -> ${path.relative(DATA_DIR, dir)}`);
  return true;
}
