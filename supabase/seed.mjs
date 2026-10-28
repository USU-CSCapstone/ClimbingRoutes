// One-off: publish an existing model and its route lines as v1 of its wall, so the
// app's read side can be tested before the capture pipeline exists. Signs in as the
// moderator account, which RLS lets publish; no service key needed.
//
// It walks the same steps as a real review: add the model row (needs_review), put
// the file in the public models bucket, add the route lines, then publish.
//
// Usage, from supabase/:  npm run seed [-- ../data/routes/<model>.json]
// Defaults to data/routes/wall47.json, the model the app shows today.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { readGlb } from "../scripts/realityscan/glb.mjs";
import { GLB_TYPE, must, signedIn } from "./lib.mjs";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const routesFile = path.resolve(process.argv[2] ?? path.join(REPO, "data/routes/wall47.json"));
const saved = JSON.parse(fs.readFileSync(routesFile, "utf8"));
const wall = saved.area?.openbeta_uuid;
if (!wall) throw new Error(`${routesFile} has no area.openbeta_uuid`);
const modelFile = path.join(REPO, saved.model);
const bytes = fs.readFileSync(modelFile);
if (bytes.length > 50 * 1024 * 1024) throw new Error(`${saved.model} is over Supabase's 50 MB file limit`);

const { supabase } = await signedIn("MODERATOR");
if (!must("check moderator", await supabase.rpc("is_moderator"))) {
  throw new Error("MODERATOR_EMAIL isn't a moderator. Run the is_moderator update in supabase/README.md first.");
}

const existing = must("look up the wall", await supabase.from("wall_models").select("version, status").eq("wall_uuid", wall));
if (existing.length) {
  console.log(`${saved.area.name} already has ${existing.map((m) => `v${m.version} (${m.status})`).join(", ")}. Nothing to do.`);
  process.exit(0);
}

const version = 1;
const glbPath = `${wall}/v${version}.glb`;
const model = must(
  "add the model row",
  await supabase
    .from("wall_models")
    .insert({
      wall_uuid: wall,
      version,
      glb_path: glbPath,
      bytes: bytes.length,
      triangles: countTriangles(modelFile),
      review_note: `Seeded from ${saved.model}`,
    })
    .select()
    .single(),
);

try {
  console.log(`Uploading ${saved.model} (${(bytes.length / 1e6).toFixed(1)} MB) to models/${glbPath}...`);
  const upload = await supabase.storage.from("models").upload(glbPath, bytes, {
    contentType: GLB_TYPE,
    // Versions never change, so caches can keep them forever.
    cacheControl: "31536000",
    upsert: false,
  });
  // Left by an earlier run that failed after uploading; it's the same file.
  if (upload.error && /exists/i.test(upload.error.message)) console.log("Already uploaded by an earlier run.");
  else must("upload the model", upload);
  const lines = saved.routes.filter((r) => r.points.length >= 2);
  must(
    "add the route lines",
    await supabase.from("route_lines").insert(
      lines.map((r) => ({
        wall_model_id: model.id,
        climb_uuid: r.openbeta_uuid,
        name: r.name,
        grade: r.grade || null,
        points: r.points,
        normals: r.normals,
      })),
    ),
  );
  must("publish", await supabase.from("wall_models").update({ status: "published" }).eq("id", model.id));
  console.log(`Published ${saved.area.name} v${version}: ${model.triangles?.toLocaleString("en-US")} triangles, ${lines.length} route lines`);
  console.log(supabase.storage.from("models").getPublicUrl(glbPath).data.publicUrl);
} catch (e) {
  // Leave nothing half-made. A file already in models stays: it can't be removed through the API.
  await supabase.from("wall_models").delete().eq("id", model.id);
  throw e;
}

function countTriangles(file) {
  const { json } = readGlb(file);
  let triangles = 0;
  for (const mesh of json.meshes) {
    for (const prim of mesh.primitives) {
      const accessor = json.accessors[prim.indices ?? prim.attributes.POSITION];
      triangles += accessor.count / 3;
    }
  }
  return Math.round(triangles);
}
