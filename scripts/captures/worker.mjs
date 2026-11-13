// Turns uploaded captures into models waiting for review, with nobody at the
// team PC: claims each one, downloads it, runs RealityScan, then finishes it or
// records why it failed. Checks every minute, picks up anything it was in the
// middle of after a restart, and sweeps old photos once a day.
//
// It has to run in the logged-in desktop session, because RealityScan does
// nothing when started over SSH or as a service. install-task.ps1 starts it at
// logon. Logs go to the console and <DATA_DIR>\worker.log.
//
// Usage, from scripts/captures/:  npm run worker
import fs from "fs";
import path from "path";

import { admin, DATA_DIR } from "./lib.mjs";
import { claim, download, fail, finish, interrupted, madeFrom, runRealityScan, sweep } from "./steps.mjs";

const POLL_MS = 60 * 1000;
const SWEEP_MS = 24 * 60 * 60 * 1000;
/** Unexpected errors on one capture, like a dropped connection, before it's failed for good. */
const MAX_TRIES = 3;

fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = path.join(DATA_DIR, "worker.log");
const LOCK_FILE = path.join(DATA_DIR, "worker.lock");
const TRIES_FILE = path.join(DATA_DIR, "tries.json");

function log(message) {
  const line = `${new Date().toLocaleString()}  ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// One worker at a time: a second would claim captures the first is working on.
if (fs.existsSync(LOCK_FILE)) {
  const pid = Number(fs.readFileSync(LOCK_FILE, "utf8"));
  if (pid && isRunning(pid)) {
    console.error(`A worker is already running (process ${pid}). Stop it first, or delete ${LOCK_FILE} if it isn't.`);
    process.exit(1);
  }
}
fs.writeFileSync(LOCK_FILE, String(process.pid));
process.on("exit", () => fs.rmSync(LOCK_FILE, { force: true }));
for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"]) process.on(signal, () => process.exit(0));

const supabase = admin();
let lastSweep = 0;
log(`Worker started. Checking for uploaded captures every ${POLL_MS / 1000} s.`);

for (;;) {
  try {
    if (Date.now() - lastSweep > SWEEP_MS) {
      await sweep(supabase, log);
      lastSweep = Date.now();
    }
    // Anything left processing was interrupted here, like by a restart or an error: finish it first.
    const capture = (await interrupted(supabase))[0] ?? (await claim(supabase));
    if (capture) await handle(capture);
    else await sleep(POLL_MS);
  } catch (e) {
    log(`Error: ${e.message}. Trying again in a minute.`);
    await sleep(POLL_MS);
  }
}

/**
 * Takes one capture from download to review, or to failed with a reason. Tries
 * are counted on disk, so one that crashes the worker can't get a fresh count on
 * every restart and loop.
 */
async function handle(capture) {
  const attempt = countTry(capture.id);
  if (attempt > MAX_TRIES) {
    await fail(supabase, capture.id, "Something went wrong on the team's computer while making the model.", log);
    log(`${capture.id}: gave up after ${MAX_TRIES} tries; see the errors above`);
  } else {
    log(`${capture.id}: starting${attempt > 1 ? `, try ${attempt}` : ""} (wall ${capture.wall_uuid}, ${capture.photo_count} photos)`);
    await makeModel(capture);
  }
  // Only reached without an error: the capture is finished or failed either way.
  clearTries(capture.id);
}

async function makeModel(capture) {
  // Its model was made before a crash: only the finishing is left.
  if ((await madeFrom(supabase, capture.id)) != null) {
    await finish(supabase, capture.id, { log });
    return;
  }
  if (!(await download(supabase, capture, log))) return;
  const run = await runRealityScan(capture.id, log);
  if (!run.ok) {
    await fail(supabase, capture.id, "A 3D model couldn't be made from these photos. Scan again with more overlap between photos.", log);
    log(`${capture.id}: RealityScan's output is in ${run.logFile}`);
    return;
  }
  await finish(supabase, capture.id, { log });
}

/** Adds a try for the capture and returns how many it has had. */
function countTry(id) {
  const tries = readTries();
  tries[id] = (tries[id] ?? 0) + 1;
  fs.writeFileSync(TRIES_FILE, JSON.stringify(tries, null, 2));
  return tries[id];
}

function clearTries(id) {
  const tries = readTries();
  delete tries[id];
  fs.writeFileSync(TRIES_FILE, JSON.stringify(tries, null, 2));
}

function readTries() {
  try {
    return JSON.parse(fs.readFileSync(TRIES_FILE, "utf8"));
  } catch {
    return {};
  }
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
