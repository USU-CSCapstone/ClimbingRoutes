// Shared by pull.mjs and finish.mjs: settings from .env, the Supabase client with
// the secret key, and where each capture lives on the team PC.
//
//   <DATA_DIR>\captures\<capture id>\   its photos, scan.json, and capture.json (the server's row)
//   <DATA_DIR>\runs\<capture id>\       the RealityScan run, made by run.reproject.ps1 -Root <DATA_DIR>\runs
import fs from "fs";
import path from "path";

import { createClient } from "@supabase/supabase-js";

export function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in scripts/captures/.env (see .env.example)`);
  return value;
}

export const DATA_DIR = process.env.DATA_DIR || "C:\\Users\\Garage\\ClimbingData";
export const RUNS_DIR = path.join(DATA_DIR, "runs");
export const captureDir = (id) => path.join(DATA_DIR, "captures", id);

/** The manifest the app uploads last. It stays after the photos are deleted. */
export const MANIFEST = "scan.json";
/** The capture's row as pulled, kept beside its photos so finish.mjs knows the wall. */
export const ROW_FILE = "capture.json";
/** Supabase's free plan caps a file at 50 MB. */
export const MAX_MODEL_BYTES = 50 * 1024 * 1024;

export const isPhoto = (name) => /\.(jpe?g|heic|heif)$/i.test(name);

/** A client with the secret key, which bypasses row-level security. */
export function admin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Throws with the step name if a Supabase call returned an error. */
export function must(step, { data, error }) {
  if (error) throw new Error(`${step}: ${error.message}`);
  return data;
}

/** A capture's folder in the captures bucket, as the app's upload names it. */
export const remoteFolder = (capture) => `${capture.captured_by}/${capture.id}`;

/** File names in the capture's bucket folder. */
export async function listRemote(supabase, capture) {
  const files = must("list the capture's files", await supabase.storage.from("captures").list(remoteFolder(capture), { limit: 1000 }));
  return files.map((f) => f.name);
}

/** Removes the capture's photos from the bucket and the PC, keeping the manifests. */
export async function deletePhotos(supabase, capture) {
  const remote = (await listRemote(supabase, capture)).filter(isPhoto);
  if (remote.length) {
    must("delete the photos", await supabase.storage.from("captures").remove(remote.map((n) => `${remoteFolder(capture)}/${n}`)));
  }
  const dir = captureDir(capture.id);
  const local = fs.existsSync(dir) ? fs.readdirSync(dir).filter(isPhoto) : [];
  for (const name of local) fs.rmSync(path.join(dir, name));
  return { remote: remote.length, local: local.length };
}

/** Marks a capture failed with a reason the person who took it will see. */
export async function markFailed(supabase, id, reason) {
  must("mark the capture failed", await supabase.from("captures").update({ status: "failed", failure_reason: reason }).eq("id", id));
}
