// Downloads uploaded captures to the team PC by hand (#46), and prints the
// commands that turn each into a model. worker.mjs does all of this on its own;
// don't run both at once.
//
// Usage, from scripts/captures/:
//   npm run pull                    every uploaded capture
//   npm run pull -- <capture id>    download one again, like after the PC restarted mid-pull
import { admin, must } from "./lib.mjs";
import { claim, download, realityScanCommand } from "./steps.mjs";

const supabase = admin();
const again = process.argv[2];
const pulled = [];

if (again) {
  const capture = must("look up the capture", await supabase.from("captures").select().eq("id", again).single());
  if (capture.status !== "processing") throw new Error(`Capture ${again} is ${capture.status}, not processing`);
  if (await download(supabase, capture)) pulled.push(capture);
} else {
  for (let capture; (capture = await claim(supabase)); ) {
    if (await download(supabase, capture)) pulled.push(capture);
  }
}

if (!pulled.length) {
  console.log("Nothing waiting.");
} else {
  console.log(`\nNext, in PowerShell on the PC's desktop (RealityScan does nothing over SSH):`);
  for (const c of pulled) {
    console.log(`\n  ${realityScanCommand(c.id)}`);
    console.log(`  npm run finish -- ${c.id}`);
  }
}
