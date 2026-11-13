// The steps that turn an uploaded capture into a model waiting for review:
// claim, download, RealityScan, finish (or fail), and the sweep of old photos.
// The worker (worker.mjs) runs them on its own; pull.mjs and finish.mjs run
// them by hand.
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { countTriangles, readGlb } from "../realityscan/glb.mjs";
import {
  captureDir,
  deletePhotos,
  isPhoto,
  listRemote,
  markFailed,
  MANIFEST,
  MAX_MODEL_BYTES,
  must,
  remoteFolder,
  ROW_FILE,
  RUNS_DIR,
} from "./lib.mjs";

/** Below this share of photos aligned as one piece, the scan failed. */
const MIN_ALIGNED = 0.8;
export const SWEEP_DAYS = 14;
const SCRIPT = fileURLToPath(new URL("../realityscan/run.reproject.ps1", import.meta.url));
/** A RealityScan run taking longer than this has hung. 16 photos take about 4 minutes, 50 about 20. */
const TIMEOUT_MS = (Number(process.env.REALITYSCAN_TIMEOUT_MINUTES) || 60) * 60 * 1000;

/** Takes the oldest uploaded capture and marks it processing, or returns null if none is waiting. */
export async function claim(supabase) {
  const [capture] = must("claim a capture", await supabase.rpc("claim_capture"));
  return capture ?? null;
}

/** Captures marked processing: claimed here before, but not finished, like after a restart. */
export async function interrupted(supabase) {
  return must("find unfinished captures", await supabase.from("captures").select().eq("status", "processing"));
}

/**
 * Downloads the capture's photos and scan.json to captures\<id>\. Returns what
 * it got, or null after marking the capture failed if it can't be used.
 */
export async function download(supabase, capture, log = console.log) {
  const dir = captureDir(capture.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, ROW_FILE), JSON.stringify(capture, null, 2));

  const names = await listRemote(supabase, capture);
  const photos = names.filter(isPhoto);
  if (!photos.length) return fail(supabase, capture.id, "No photos were uploaded.", log);
  if (capture.photo_count && photos.length !== capture.photo_count) {
    return fail(supabase, capture.id, `Only ${photos.length} of ${capture.photo_count} photos were uploaded.`, log);
  }

  let bytes = 0;
  for (const name of names.filter((n) => isPhoto(n) || n === MANIFEST)) {
    const blob = must(`download ${name}`, await supabase.storage.from("captures").download(`${remoteFolder(capture)}/${name}`));
    const data = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(path.join(dir, name), data);
    bytes += data.length;
  }
  const manifest = names.includes(MANIFEST) ? "" : ", no scan.json";
  log(`${capture.id}: downloaded ${photos.length} photos, ${(bytes / 1e6).toFixed(1)} MB${manifest}`);
  return { photos: photos.length, bytes };
}

/** The PowerShell line that runs RealityScan on a downloaded capture, for running it by hand. */
export function realityScanCommand(id) {
  return `${SCRIPT} -Name ${id} -Imgs "${captureDir(id)}" -Root "${RUNS_DIR}"`;
}

/**
 * Runs RealityScan on a downloaded capture through run.reproject.ps1, with its
 * output in runs\<id>.log. A run left by an earlier attempt is cleared first,
 * since the script won't overwrite one. RealityScan only works in the logged-in
 * desktop session, not over SSH. A run past TIMEOUT_MS is stopped. Resolves with
 * whether it made a model, and whether it timed out.
 */
export function runRealityScan(id, log = console.log) {
  fs.rmSync(path.join(RUNS_DIR, id), { recursive: true, force: true });
  const dir = captureDir(id);
  for (const name of fs.readdirSync(dir)) {
    if (/\.xmp$/i.test(name) || /^\d{5}\.png$/i.test(name)) fs.rmSync(path.join(dir, name));
  }
  fs.mkdirSync(RUNS_DIR, { recursive: true });
  const logFile = path.join(RUNS_DIR, `${id}.log`);
  const out = fs.openSync(logFile, "w");
  log(`${id}: running RealityScan, output in ${logFile}`);
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", SCRIPT, "-Name", id, "-Imgs", dir, "-Root", RUNS_DIR],
      { stdio: ["ignore", out, out], windowsHide: true },
    );
    let timedOut = false;
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fs.closeSync(out);
      if (timedOut) fs.appendFileSync(logFile, `\nStopped by the worker after ${TIMEOUT_MS / 60000} minutes.\n`);
      const how = ok ? "finished" : timedOut ? "timed out" : "failed";
      log(`${id}: RealityScan ${how} after ${Math.round((Date.now() - started) / 1000)} s`);
      resolve({ ok, timedOut, logFile });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      // The whole tree: the script starts RealityScan as its own process.
      if (process.platform === "win32") spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
      else child.kill("SIGKILL");
    }, TIMEOUT_MS);
    child.on("error", (e) => {
      fs.appendFileSync(logFile, `\n${e.stack ?? e}\n`);
      done(false);
    });
    child.on("exit", (code) => done(code === 0 && !timedOut));
  });
}

/**
 * After RealityScan: checks that enough photos aligned and the model fits,
 * uploads it to review as the wall's next version, marks the capture
 * processed, and deletes its photos, keeping scan.json. A model given as
 * `model` skips the alignment check. Returns null if the capture failed.
 */
export async function finish(supabase, id, { model: modelArg, log = console.log } = {}) {
  const capture = must("look up the capture", await supabase.from("captures").select().eq("id", id).single());
  if (!["processing", "failed"].includes(capture.status)) {
    throw new Error(`Capture ${id} is ${capture.status}; only processing or failed captures can be finished`);
  }

  // A crash after adding the model but before marking the capture processed leaves its model made
  // already. Finish with that one rather than adding a second version.
  const made = await madeFrom(supabase, id);
  if (made != null) {
    must("mark the capture processed", await supabase.from("captures").update({ status: "processed", failure_reason: null }).eq("id", id));
    await deletePhotos(supabase, capture);
    log(`${id}: v${made} was already made from this capture; marked it processed`);
    return { version: made };
  }
  if (!fs.existsSync(captureDir(id))) throw new Error(`${captureDir(id)} doesn't exist. Pull the capture on this PC first.`);

  // Did enough photos line up as one piece? RealityScan keeps only the biggest one.
  const photos = fs.readdirSync(captureDir(id)).filter(isPhoto).length;
  const cams = path.join(RUNS_DIR, id, "cams");
  if (!modelArg && fs.existsSync(cams)) {
    const aligned = fs.readdirSync(cams).filter((n) => n.endsWith(".xmp")).length;
    if (aligned < photos * MIN_ALIGNED) {
      return fail(supabase, id, `Only ${aligned} of ${photos} photos lined up as one piece. Scan again with more overlap between photos.`, log);
    }
    log(`${id}: ${aligned} of ${photos} photos aligned`);
  }

  const model = modelArg ?? path.join(RUNS_DIR, id, "out", `${id}.glb`);
  if (!fs.existsSync(model)) throw new Error(`No model at ${model}. Did run.reproject.ps1 finish?`);
  const bytes = fs.statSync(model).size;
  if (bytes > MAX_MODEL_BYTES) {
    return fail(supabase, id, `The model came out at ${(bytes / 1e6).toFixed(1)} MB, over the 50 MB limit.`, log);
  }
  const triangles = countTriangles(readGlb(model).json);

  const version = await addVersion(supabase, capture, model, bytes, triangles);
  must("mark the capture processed", await supabase.from("captures").update({ status: "processed", failure_reason: null }).eq("id", id));

  const deleted = await deletePhotos(supabase, capture);
  log(`${id}: v${version} of wall ${capture.wall_uuid} is waiting for review: ${triangles.toLocaleString("en-US")} triangles, ${(bytes / 1e6).toFixed(1)} MB`);
  log(`${id}: deleted ${deleted.remote} photos from Supabase and ${deleted.local} from this PC; scan.json is kept`);
  return { version, triangles, bytes };
}

/** The version already made from this capture, or null. */
export async function madeFrom(supabase, id) {
  const made = must(
    "look for a model made from this capture",
    await supabase.from("wall_models").select("version").eq("source_capture", id).order("version").limit(1),
  );
  return made[0]?.version ?? null;
}

/** Uploads the model to review as the wall's next version and adds its row. Returns the version. */
async function addVersion(supabase, capture, model, bytes, triangles) {
  // Versions never change, so this run becomes the wall's next one. No row has this path yet, so a
  // file left there by a failed earlier attempt can be replaced.
  const latest = must(
    "find the wall's latest version",
    await supabase.from("wall_models").select("version").eq("wall_uuid", capture.wall_uuid).order("version", { ascending: false }).limit(1),
  );
  const version = (latest[0]?.version ?? 0) + 1;
  const glbPath = `${capture.wall_uuid}/v${version}.glb`;
  must(
    "upload the model to review",
    await supabase.storage.from("review").upload(glbPath, fs.readFileSync(model), {
      contentType: "model/gltf-binary",
      // Approving copies the file as is, and a published version never changes.
      cacheControl: "31536000",
      upsert: true,
    }),
  );
  const added = await supabase
    .from("wall_models")
    .insert({ wall_uuid: capture.wall_uuid, version, glb_path: glbPath, bytes, triangles, source_capture: capture.id })
    .select()
    .single();
  if (added.error) {
    await supabase.storage.from("review").remove([glbPath]);
    must("add the model row", added);
  }
  return version;
}

/** Marks a capture failed with a reason the person who took it sees. Its photos stay until the sweep. */
export async function fail(supabase, id, reason, log = console.log) {
  await markFailed(supabase, id, reason);
  log(`${id}: failed: ${reason}`);
  return null;
}

/** Deletes photos of captures that failed or never finished uploading, after SWEEP_DAYS. */
export async function sweep(supabase, log = console.log) {
  const before = new Date(Date.now() - SWEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const stale = must(
    "find stale captures",
    await supabase.from("captures").select().in("status", ["failed", "uploading"]).lt("updated_at", before),
  );
  let photos = 0;
  for (const capture of stale) {
    const deleted = await deletePhotos(supabase, capture);
    photos += deleted.remote + deleted.local;
    if (capture.status === "uploading") {
      await markFailed(supabase, capture.id, `The upload wasn't finished within ${SWEEP_DAYS} days.`);
    }
  }
  if (photos) log(`Swept ${photos} photos from ${stale.length} old captures.`);
  return { captures: stale.length, photos };
}
