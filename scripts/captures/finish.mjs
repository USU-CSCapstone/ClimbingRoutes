// After RealityScan, by hand: puts a capture's model up for review and deletes
// its photos (#47), or records why it failed. worker.mjs does this on its own.
//
// Usage, from scripts/captures/:
//   npm run finish -- <capture id> [model.glb]       the model defaults to runs\<id>\out\<id>.glb
//   npm run finish -- <capture id> --failed "<reason>"
//   npm run finish -- --sweep                         photos of captures stuck for 14 days
//
// A finished capture keeps only scan.json, on the server and the PC. The new model
// goes to review/<wall>/v<N>.glb with a needs_review row, for the moderator.
import { admin } from "./lib.mjs";
import { fail, finish, sweep, SWEEP_DAYS } from "./steps.mjs";

const supabase = admin();
const [id, ...rest] = process.argv.slice(2);

if (id === "--sweep") {
  const swept = await sweep(supabase);
  if (!swept.photos) console.log("Nothing to sweep.");
} else if (!id) {
  throw new Error("usage: finish.mjs <capture id> [model.glb] | <capture id> --failed <reason> | --sweep");
} else if (rest[0] === "--failed") {
  const reason = rest.slice(1).join(" ");
  if (!reason) throw new Error('Give a reason: finish.mjs <capture id> --failed "<reason>"');
  await fail(supabase, id, reason);
  console.log(`Its photos stay for ${SWEEP_DAYS} days in case it's run again, then --sweep deletes them.`);
  process.exitCode = 1;
} else if (!(await finish(supabase, id, { model: rest[0] }))) {
  process.exitCode = 1;
}
