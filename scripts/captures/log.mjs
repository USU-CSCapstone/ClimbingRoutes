// The pipeline's log. The worker and the by-hand scripts all write to the
// console and to <DATA_DIR>\worker.log, so one file shows everything that
// happened to a capture. A line looks like:
//
//   2026-11-24 14:03:07 -07:00  WARN   worker  3f2a…: failed: Only 9 of 40 photos lined up as one piece.
//
// Errors are followed by their stack, indented. Past MAX_BYTES the file moves
// to worker.log.1, replacing the one before, so the two never pass 10 MB.
import fs from "fs";
import path from "path";

import { DATA_DIR } from "./lib.mjs";

export const LOG_FILE = path.join(DATA_DIR, "worker.log");
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * A logger for one script, named by `source`. Call it for a normal line, or use
 * .warn and .error; .error takes the error as well, for its stack. Without a
 * file, it only writes to the console.
 */
export function createLog(source, { file = LOG_FILE } = {}) {
  const write = (level, message, error) => {
    let text = `${stamp()}  ${level.padEnd(5)}  ${source.padEnd(6)}  ${message}`;
    if (error) text += "\n" + indent(error.stack ?? String(error));
    (level === "INFO" ? console.log : console.error)(text);
    if (file) append(file, text + "\n");
  };
  const log = (message) => write("INFO", message);
  log.warn = (message) => write("WARN", message);
  log.error = (message, error) => write("ERROR", message, error);
  return log;
}

/** Console only: what steps.mjs uses when it isn't given a logger. */
export const consoleLog = createLog("steps", { file: null });

/**
 * Logs whatever would otherwise crash the script without a trace in the log
 * file, like a thrown error at the top level, then exits with an error.
 */
export function logCrashes(log) {
  const crash = (e) => {
    log.error(`Stopped by an error: ${e?.message ?? e}`, e);
    process.exit(1);
  };
  process.on("uncaughtException", crash);
  process.on("unhandledRejection", crash);
}

/** A duration for people: "45 s", "4 min 12 s", "1 h 3 min". */
export function duration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60} s`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

/** The last `count` non-empty lines of a file, or "" if it doesn't exist. */
export function tail(file, count) {
  if (!fs.existsSync(file)) return "";
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim());
  return lines.slice(-count).join("\n");
}

export function indent(text) {
  return text.replace(/^/gm, "    ");
}

/** Local time with its UTC offset, so lines sort and read the same on any PC. */
function stamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const zone = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${zone}`;
}

function append(file, text) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file) && fs.statSync(file).size > MAX_BYTES) fs.renameSync(file, file + ".1");
    fs.appendFileSync(file, text);
  } catch (e) {
    // A full disk or a locked file shouldn't stop the pipeline; the console still has the line.
    console.error(`Couldn't write to ${file}: ${e.message}`);
  }
}
