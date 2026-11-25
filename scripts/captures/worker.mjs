// Turns uploaded captures into models waiting for review, with nobody at the
// team PC: claims each one, downloads it, runs RealityScan, then finishes it or
// records why it failed. Checks every minute, picks up anything it was in the
// middle of after a restart, and sweeps old photos once a day.
//
// It has to run in the logged-in desktop session, because RealityScan does
// nothing when started over SSH or as a service. install-task.ps1 starts it at
// logon. Logs go to the console and <DATA_DIR>\worker.log (see log.mjs).
//
// Usage, from scripts/captures/:  npm run worker
import fs from "fs";
import path from "path";

import { admin, DATA_DIR } from "./lib.mjs";
import { createLog, duration, indent, logCrashes, tail } from "./log.mjs";
import { claim, download, fail, failureReason, finish, interrupted, madeFrom, runRealityScan, sweep } from "./steps.mjs";

const POLL_MS = 60 * 1000;
const SWEEP_MS = 24 * 60 * 60 * 1000;
/** Unexpected errors on one capture, like a dropped connection, before it's failed for good. */
const MAX_TRIES = 3;
/** With nothing to do, a line this often shows the worker is still running. */
const IDLE_LOG_MS = 60 * 60 * 1000;

fs.mkdirSync(DATA_DIR, { recursive: true });
const LOCK_FILE = path.join(DATA_DIR, "worker.lock");
const TRIES_FILE = path.join(DATA_DIR, "tries.json");

const log = createLog("worker");
logCrashes(log);

// One worker at a time: a second would claim captures the first is working on.
if (fs.existsSync(LOCK_FILE)) {
  const pid = Number(fs.readFileSync(LOCK_FILE, "utf8"));
  if (pid && isRunning(pid)) {
    log.error(`A worker is already running (process ${pid}). Stop it first, or delete ${LOCK_FILE} if it isn't.`);
    process.exit(1);
  }
}
fs.writeFileSync(LOCK_FILE, String(process.pid));
process.on("exit", (code) => {
  fs.rmSync(LOCK_FILE, { force: true });
  log(`Worker stopped${code ? ` with exit code ${code}` : ""}.`);
});
for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
  process.on(signal, () => {
    log(`Worker got ${signal}; stopping.`);
    process.exit(0);
  });
}

const supabase = admin();
let lastSweep = 0;
let lastActive = Date.now();
/** The error the last check failed with, and how many checks in a row failed with it. */
let failing = { message: null, count: 0 };
log(`Worker started (process ${process.pid}, Node ${process.version}). Data in ${DATA_DIR}. Checking for uploaded captures every ${POLL_MS / 1000} s.`);

for (;;) {
  let capture = null;
  try {
    if (Date.now() - lastSweep > SWEEP_MS) {
      await sweep(supabase, log);
      lastSweep = Date.now();
    }
    // Anything left processing was interrupted here, like by a restart or an error: finish it first.
    capture = (await interrupted(supabase))[0] ?? (await claim(supabase));
    if (capture) await handle(capture);
    recovered();
    if (capture) {
      lastActive = Date.now();
    } else {
      if (Date.now() - lastActive > IDLE_LOG_MS) {
        log(`Still running; no uploaded captures for ${duration(Date.now() - lastActive)}.`);
        lastActive = Date.now();
      }
      await sleep(POLL_MS);
    }
  } catch (e) {
    report(e, capture);
    await sleep(POLL_MS);
  }
}

/**
 * Logs an error from a check, with its stack. While Supabase is down every check
 * fails the same way, so a repeat is only counted, not logged again.
 */
function report(e, capture) {
  const where = capture ? `${capture.id}: ` : "";
  const message = `${where}${e.message}`;
  if (message === failing.message) {
    failing.count++;
    return;
  }
  recovered();
  failing = { message, count: 1 };
  log.error(`${message}. Trying again every minute.`, e);
}

/** After checks that failed, logs how many did. */
function recovered() {
  if (failing.count > 1) log(`The last error repeated for ${failing.count} checks in a row.`);
  else if (failing.count === 1) log("Working again after the error above.");
  failing = { message: null, count: 0 };
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
    log.error(`${capture.id}: gave up after ${MAX_TRIES} tries; see the errors above`);
  } else {
    const started = Date.now();
    log(`${capture.id}: starting${attempt > 1 ? `, try ${attempt} of ${MAX_TRIES}` : ""} (wall ${capture.wall_uuid}, ${capture.photo_count} photos)`);
    await makeModel(capture);
    log(`${capture.id}: done in ${duration(Date.now() - started)}`);
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
    await fail(supabase, capture.id, failureReason(run), log);
    const last = tail(run.logFile, 15);
    log.warn(`${capture.id}: RealityScan's output is in ${run.logFile}${last ? `; it ended with:\n${indent(last)}` : ""}`);
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
