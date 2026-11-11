// After RealityScan: puts a capture's model up for review and deletes its
// photos (#47), or records why it failed.
//
// Usage, from scripts/captures/:
//   npm run finish -- <capture id> [model.glb]       the model defaults to runs\<id>\out\<id>.glb
//   npm run finish -- <capture id> --failed "<reason>"
//   npm run finish -- --sweep                         photos of captures stuck for 14 days
//
// A finished capture keeps only scan.json, on the server and the PC. The new model
// goes to review/<wall>/v<N>.glb with a needs_review row, for the moderator.
import fs from "fs";
import path from "path";

import { countTriangles, readGlb } from "../realityscan/glb.mjs";
import {
  admin,
  captureDir,
  deletePhotos,
  isPhoto,
  markFailed,
  MAX_MODEL_BYTES,
  must,
  RUNS_DIR,
} from "./lib.mjs";

/** Below this share of photos aligned as one piece, the scan failed. */
const MIN_ALIGNED = 0.8;
const SWEEP_DAYS = 14;

const supabase = admin();
const [id, ...rest] = process.argv.slice(2);

if (id === "--sweep") await sweep();
else if (!id) throw new Error("usage: finish.mjs <capture id> [model.glb] | <capture id> --failed <reason> | --sweep");
else if (rest[0] === "--failed") await fail(id, rest.slice(1).join(" "));
else await finish(id, rest[0]);

async function finish(id, modelArg) {
  const capture = must("look up the capture", await supabase.from("captures").select().eq("id", id).single());
  if (!["processing", "failed"].includes(capture.status)) {
    throw new Error(`Capture ${id} is ${capture.status}; only processing or failed captures can be finished`);
  }

  if (!fs.existsSync(captureDir(id))) throw new Error(`${captureDir(id)} doesn't exist. Pull the capture on this PC first.`);

  // Did enough photos line up as one piece? RealityScan keeps only the biggest one.
  const photos = fs.readdirSync(captureDir(id)).filter(isPhoto).length;
  const cams = path.join(RUNS_DIR, id, "cams");
  if (!modelArg && fs.existsSync(cams)) {
    const aligned = fs.readdirSync(cams).filter((n) => n.endsWith(".xmp")).length;
    if (aligned < photos * MIN_ALIGNED) {
      return fail(id, `Only ${aligned} of ${photos} photos lined up as one piece. Scan again with more overlap between photos.`);
    }
    console.log(`${aligned} of ${photos} photos aligned`);
  }

  const model = modelArg ?? path.join(RUNS_DIR, id, "out", `${id}.glb`);
  if (!fs.existsSync(model)) throw new Error(`No model at ${model}. Did run.reproject.ps1 finish?`);
  const bytes = fs.statSync(model).size;
  if (bytes > MAX_MODEL_BYTES) {
    return fail(id, `The model came out at ${(bytes / 1e6).toFixed(1)} MB, over the 50 MB limit.`);
  }
  const triangles = countTriangles(readGlb(model).json);

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
    .insert({ wall_uuid: capture.wall_uuid, version, glb_path: glbPath, bytes, triangles, source_capture: id })
    .select()
    .single();
  if (added.error) {
    await supabase.storage.from("review").remove([glbPath]);
    must("add the model row", added);
  }
  must("mark the capture processed", await supabase.from("captures").update({ status: "processed", failure_reason: null }).eq("id", id));

  const deleted = await deletePhotos(supabase, capture);
  console.log(`v${version} of wall ${capture.wall_uuid} is waiting for review: ${triangles.toLocaleString("en-US")} triangles, ${(bytes / 1e6).toFixed(1)} MB`);
  console.log(`Deleted ${deleted.remote} photos from Supabase and ${deleted.local} from this PC; scan.json is kept.`);
}

async function fail(id, reason) {
  if (!reason) throw new Error('Give a reason: finish.mjs <capture id> --failed "<reason>"');
  await markFailed(supabase, id, reason);
  console.log(`Capture ${id} failed: ${reason}`);
  console.log(`Its photos stay for ${SWEEP_DAYS} days in case it's run again, then --sweep deletes them.`);
  process.exitCode = 1;
}

/** Deletes photos of captures that failed or never finished uploading, after SWEEP_DAYS. */
async function sweep() {
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
  console.log(`Swept ${stale.length} captures, ${photos} photos.`);
}
