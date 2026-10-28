// Checks the row-level security rules against the real project, as the app sees it:
// signed out, signed in as a regular account, and signed in as the moderator.
//
// It makes its own fixtures under a made-up wall (an unpublished model with a file in
// review and a route line, plus captures and photos) and removes them at the end.
// Run `npm run seed` first, so there's a published model to read.
//
// Usage, from supabase/:  npm run check
import { client, env, GLB_TYPE, must, signedIn } from "../lib.mjs";

const FIXTURE_WALL = "00000000-0000-4000-8000-00000000c0de";
const PHOTO = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]); // an empty JPEG
const results = [];

// The errors a refusal comes back as. Anything else, like a network or sign-in failure, fails the check
// instead of passing it.
const DENIED = new Set([
  "42501", // a row-level security policy, or no privilege on the table or column
  "P0001", // raised by our own triggers
  "AccessDenied", // Storage: a policy refused the write
  "NoSuchKey", // Storage: a file the caller may not read looks missing
]);

const anon = client();
const { supabase: user, user: regular } = await signedIn("REGULAR");
const { supabase: mod, user: moderator } = await signedIn("MODERATOR");
if (!must("check moderator", await mod.rpc("is_moderator"))) throw new Error(`${env("MODERATOR_EMAIL")} isn't a moderator`);
if (must("check regular", await user.rpc("is_moderator"))) throw new Error(`${env("REGULAR_EMAIL")} is a moderator`);

await cleanup();
try {
  await run();
} finally {
  await cleanup();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "pass" : "FAIL"}  ${r.name}${r.ok ? "" : `\n      ${r.why}`}`);
console.log(`\n${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length ? 1 : 0);

async function run() {
  // Fixtures, made by the moderator
  const pending = await addFixtureModel(1);
  const unpublishable = await addFixtureModel(2);
  must("upload fixture to review", await mod.storage.from("review").upload(pending.glb_path, Buffer.from("glTF"), { contentType: GLB_TYPE }));
  const pendingLine = must(
    "add fixture line",
    await mod
      .from("route_lines")
      .insert({ wall_model_id: pending.id, climb_uuid: FIXTURE_WALL, name: "rls-check", points: [[0, 0, 0], [0, 1, 0]], normals: [[0, 0, 1], [0, 0, 1]] })
      .select()
      .single(),
  );
  const modCapture = must("add moderator capture", await mod.from("captures").insert({ wall_uuid: FIXTURE_WALL }).select().single());
  const modPhoto = `${moderator.id}/${modCapture.id}/0001.jpg`;
  must("upload moderator photo", await mod.storage.from("captures").upload(modPhoto, PHOTO, { contentType: "image/jpeg" }));

  const published = must("find a published model", await anon.from("wall_models").select().eq("status", "published").limit(1))[0];
  const publishedLine = published
    ? must("find its lines", await anon.from("route_lines").select().eq("wall_model_id", published.id).limit(1))[0]
    : null;

  // Signed out
  await check("signed out: sees published models", async () =>
    published && publishedLine ? true : "no published model with lines; run npm run seed first",
  );
  await check("signed out: downloads a published model file", async () => {
    if (!published) return "no published model";
    const url = anon.storage.from("models").getPublicUrl(published.glb_path).data.publicUrl;
    const res = await fetch(url, { method: "HEAD" });
    return res.ok || `HTTP ${res.status} for ${url}`;
  });
  for (const [who, db] of [["signed out", anon], ["regular", user]]) {
    await check(`${who}: can't see unpublished models`, async () => blocked(await db.from("wall_models").select().eq("wall_uuid", FIXTURE_WALL)));
    await check(`${who}: can't see their route lines`, async () => blocked(await db.from("route_lines").select().eq("id", pendingLine.id)));
    await check(`${who}: can't download from review`, async () => blocked(await db.storage.from("review").download(pending.glb_path)));
    await check(`${who}: can't list review`, async () => blocked(await db.storage.from("review").list(FIXTURE_WALL)));
    await check(`${who}: can't add a model row`, async () =>
      blocked(await db.from("wall_models").insert({ wall_uuid: FIXTURE_WALL, version: 99, glb_path: `${FIXTURE_WALL}/v99.glb`, bytes: 1 }).select()),
    );
    await check(`${who}: can't upload to models`, async () =>
      blocked(await db.storage.from("models").upload(`${FIXTURE_WALL}/v99.glb`, Buffer.from("glTF"), { contentType: GLB_TYPE })),
    );
    await check(`${who}: can't upload to review`, async () =>
      blocked(await db.storage.from("review").upload(`${FIXTURE_WALL}/v99.glb`, Buffer.from("glTF"), { contentType: GLB_TYPE })),
    );
    await check(`${who}: can't see other people's captures`, async () => blocked(await db.from("captures").select().eq("id", modCapture.id)));
    await check(`${who}: can't download other people's photos`, async () => blocked(await db.storage.from("captures").download(modPhoto)));
  }
  await check("signed out: can't start a capture", async () => blocked(await anon.from("captures").insert({ wall_uuid: FIXTURE_WALL }).select()));

  // Regular account: moderator-only actions
  await check("regular: sees only their own profile, not a moderator", async () => {
    const rows = must("read profiles", await user.from("profiles").select());
    return (rows.length === 1 && rows[0].id === regular.id && !rows[0].is_moderator) || `got ${JSON.stringify(rows)}`;
  });
  await check("regular: can't make themselves a moderator", async () =>
    blocked(await user.from("profiles").update({ is_moderator: true }).eq("id", regular.id).select()),
  );
  if (published) {
    await check("regular: can't change a model's review status", async () => {
      const res = await user.from("wall_models").update({ status: "rejected" }).eq("id", published.id).select();
      const still = must("re-read", await anon.from("wall_models").select("status").eq("id", published.id).single());
      return (blocked(res) === true && still.status === "published") || `status is now ${still.status}`;
    });
  }
  if (publishedLine) {
    await check("regular: can't add route lines", async () =>
      blocked(await user.from("route_lines").insert({ wall_model_id: published.id, climb_uuid: FIXTURE_WALL, name: "x", points: [[0, 0, 0], [0, 1, 0]], normals: [[0, 0, 1], [0, 0, 1]] }).select()),
    );
    await check("regular: can't edit route lines", async () =>
      blocked(await user.from("route_lines").update({ name: "changed" }).eq("id", publishedLine.id).select()),
    );
    await check("regular: can't delete route lines", async () => blocked(await user.from("route_lines").delete().eq("id", publishedLine.id).select()));
  }

  // Regular account: their own captures
  const capture = must("start a capture", await user.from("captures").insert({ wall_uuid: FIXTURE_WALL }).select().single());
  const photo = (n) => `${regular.id}/${capture.id}/${String(n).padStart(4, "0")}.jpg`;
  await check("regular: starts a capture of their own", async () => capture.captured_by === regular.id && capture.status === "uploading");
  await check("regular: can't start a capture for someone else", async () =>
    blocked(await user.from("captures").insert({ wall_uuid: FIXTURE_WALL, captured_by: moderator.id }).select()),
  );
  await check("regular: uploads a photo to their capture", async () =>
    allowed(await user.storage.from("captures").upload(photo(1), PHOTO, { contentType: "image/jpeg" })),
  );
  await check("regular: can't upload into someone else's capture", async () =>
    blocked(await user.storage.from("captures").upload(`${moderator.id}/${modCapture.id}/0002.jpg`, PHOTO, { contentType: "image/jpeg" })),
  );
  await check("regular: can't upload into their folder without a capture", async () =>
    blocked(await user.storage.from("captures").upload(`${regular.id}/${crypto.randomUUID()}/0001.jpg`, PHOTO, { contentType: "image/jpeg" })),
  );
  await check("regular: can't overwrite a photo", async () =>
    blocked(await user.storage.from("captures").upload(photo(1), PHOTO, { contentType: "image/jpeg", upsert: true })),
  );
  await check("regular: can't set processing", async () =>
    blocked(await user.from("captures").update({ status: "processing" }).eq("id", capture.id).select()),
  );
  await check("regular: can't set a failure reason", async () =>
    blocked(await user.from("captures").update({ failure_reason: "x" }).eq("id", capture.id).select()),
  );
  await check("regular: marks their capture uploaded", async () => {
    const rows = must("mark uploaded", await user.from("captures").update({ status: "uploaded", photo_count: 1 }).eq("id", capture.id).select());
    return rows.length === 1 || "no row updated";
  });
  await check("regular: can't add photos once uploaded", async () =>
    blocked(await user.storage.from("captures").upload(photo(2), PHOTO, { contentType: "image/jpeg" })),
  );
  await check("regular: can't change a capture once uploaded", async () =>
    blocked(await user.from("captures").update({ status: "uploading" }).eq("id", capture.id).select()),
  );
  await check("regular: can't delete a capture once uploaded", async () => blocked(await user.from("captures").delete().eq("id", capture.id).select()));

  // Moderator
  await check("moderator: sees unpublished models and their lines", async () => {
    const lines = must("read lines", await mod.from("route_lines").select().eq("wall_model_id", pending.id));
    return lines.length === 1 || `got ${lines.length} lines`;
  });
  await check("moderator: downloads from review", async () => allowed(await mod.storage.from("review").download(pending.glb_path)));
  await check("moderator: sees everyone's captures", async () => {
    const rows = must("read captures", await mod.from("captures").select().eq("id", capture.id));
    return rows.length === 1 || "can't see it";
  });
  await check("moderator: rejects a model, stamped with who and when", async () => {
    const row = must("reject", await mod.from("wall_models").update({ status: "rejected", review_note: "rls-check" }).eq("id", pending.id).select().single());
    return (row.reviewed_by === moderator.id && row.reviewed_at !== null) || `got ${JSON.stringify(row)}`;
  });
  await check("moderator: can't change a model once reviewed", async () =>
    blocked(await mod.from("wall_models").update({ status: "published" }).eq("id", pending.id).select()),
  );
  await check("moderator: can't publish before the file is in models", async () =>
    blocked(await mod.from("wall_models").update({ status: "published" }).eq("id", unpublishable.id).select()),
  );
  await check("moderator: can't change a version's file path", async () =>
    blocked(await mod.from("wall_models").update({ glb_path: `${FIXTURE_WALL}/v98.glb` }).eq("id", unpublishable.id).select()),
  );
  await check("moderator: can't upload to models without a model row", async () =>
    blocked(await mod.storage.from("models").upload(`${FIXTURE_WALL}/v99.glb`, Buffer.from("glTF"), { contentType: GLB_TYPE })),
  );
  if (published) {
    await check("moderator: can't delete a published model", async () => blocked(await mod.from("wall_models").delete().eq("id", published.id).select()));
  }
}

/** Passes if the call was refused: an expected denial error, or no rows because RLS hid them. */
function blocked(res) {
  if (res.error) return DENIED.has(res.error.code) || `unexpected error: ${res.error.code ?? res.error.name}: ${res.error.message}`;
  if (Array.isArray(res.data) && res.data.length === 0) return true;
  return `allowed: ${JSON.stringify(res.data).slice(0, 200)}`;
}

function allowed(res) {
  return res.error ? `refused: ${res.error.message}` : true;
}

async function check(name, fn) {
  try {
    const result = await fn();
    results.push({ name, ok: result === true, why: result });
  } catch (e) {
    results.push({ name, ok: false, why: e.message });
  }
}

async function addFixtureModel(version) {
  return must(
    `add fixture model v${version}`,
    await mod
      .from("wall_models")
      .insert({ wall_uuid: FIXTURE_WALL, version, glb_path: `${FIXTURE_WALL}/v${version}.glb`, bytes: 4, review_note: "rls-check fixture" })
      .select()
      .single(),
  );
}

/** Removes everything under the fixture wall, from this run or an earlier one that crashed. */
async function cleanup() {
  const captures = must("list fixture captures", await mod.from("captures").select().eq("wall_uuid", FIXTURE_WALL));
  for (const c of captures) {
    const folder = `${c.captured_by}/${c.id}`;
    const files = must("list photos", await mod.storage.from("captures").list(folder));
    if (files.length) must("remove photos", await mod.storage.from("captures").remove(files.map((f) => `${folder}/${f.name}`)));
  }
  must("delete fixture captures", await mod.from("captures").delete().eq("wall_uuid", FIXTURE_WALL));
  const reviewFiles = must("list review", await mod.storage.from("review").list(FIXTURE_WALL));
  if (reviewFiles.length) must("remove review files", await mod.storage.from("review").remove(reviewFiles.map((f) => `${FIXTURE_WALL}/${f.name}`)));
  must("delete fixture models", await mod.from("wall_models").delete().eq("wall_uuid", FIXTURE_WALL));
}
