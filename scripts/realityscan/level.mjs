// Level a finished GLB using the photo cameras: gravity goes on -Y and the wall
// faces +Z. glb-finish.mjs assumes RealityScan's +Z is up, which can be tens of
// degrees off. Handheld photos have little roll, so every camera's right axis is
// level, and up is the direction most perpendicular to all of them. The mean
// image-up vector is only a fallback: it leans back by however far the cameras
// look up, about 25 degrees at the foot of a crag.
//
// Get the cameras with
//   RealityScan -headless -load <proj.rsproj> -selectMaximalComponent -exportXMPForSelectedComponent -quit
// which writes 00000.xmp... next to the photos (plus an undistorted PNG for each, which can be deleted).
//
// Usage: node level.mjs <in.glb> <xmp folder> <out.glb>
import fs from "fs";
import path from "path";
import { readGlb, writeGlb } from "./glb.mjs";

const [src, xmpDir, dst] = process.argv.slice(2);
if (!src || !xmpDir || !dst) {
  console.error("usage: node level.mjs <in.glb> <xmp folder> <out.glb>");
  process.exit(2);
}

const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const scale = (a, s) => a.map((v) => v * s);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const len = (a) => Math.sqrt(dot(a, a));
const unit = (a) => scale(a, 1 / len(a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const deg = (r) => (r * 180) / Math.PI;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// Eigenvalues and eigenvectors of a symmetric 3x3 matrix by Jacobi rotations, smallest first.
function eigen(m) {
  const a = m.map((row) => [...row]);
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    const [p, q] = [[0, 1], [0, 2], [1, 2]].reduce((best, pq) => (Math.abs(a[pq[0]][pq[1]]) > Math.abs(a[best[0]][best[1]]) ? pq : best));
    if (Math.abs(a[p][q]) < 1e-12) break;
    const t = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(t);
    const s = Math.sin(t);
    for (const k of [0, 1, 2]) [a[k][p], a[k][q]] = [c * a[k][p] - s * a[k][q], s * a[k][p] + c * a[k][q]];
    for (const k of [0, 1, 2]) [a[p][k], a[q][k]] = [c * a[p][k] - s * a[q][k], s * a[p][k] + c * a[q][k]];
    for (const k of [0, 1, 2]) [v[k][p], v[k][q]] = [c * v[k][p] - s * v[k][q], s * v[k][p] + c * v[k][q]];
  }
  return [0, 1, 2].map((i) => ({ value: a[i][i], vector: v.map((row) => row[i]) })).sort((x, y) => x.value - y.value);
}

// XMP Rotation is world-to-camera: its rows are the camera's right, down and forward axes in world space.
const cams = fs
  .readdirSync(xmpDir)
  .filter((f) => f.toLowerCase().endsWith(".xmp"))
  .map((f) => {
    const text = fs.readFileSync(path.join(xmpDir, f), "utf8");
    const nums = (tag) =>
      text
        .match(new RegExp(`<xcr:${tag}>([^<]+)</xcr:${tag}>|xcr:${tag}="([^"]+)"`))
        ?.slice(1)
        .find(Boolean)
        .trim()
        .split(/\s+/)
        .map(Number);
    const r = nums("Rotation");
    const pos = nums("Position");
    if (!r || r.length !== 9 || !pos) throw new Error(`no Rotation/Position in ${f}`);
    return { right: r.slice(0, 3), down: r.slice(3, 6), forward: r.slice(6, 9), pos };
  });
if (cams.length < 3) throw new Error(`need at least 3 cameras, found ${cams.length} in ${xmpDir}`);

const { json, view } = readGlb(src);
const vertices = json.meshes
  .flatMap((mesh) => mesh.primitives)
  .flatMap((p) => {
    const acc = json.accessors[p.attributes.POSITION];
    const bytes = view(acc.bufferView);
    const stride = json.bufferViews[acc.bufferView].byteStride || 12;
    const out = [];
    for (let i = 0; i < acc.count; i += 16) {
      const o = (acc.byteOffset || 0) + i * stride;
      out.push([bytes.readFloatLE(o), bytes.readFloatLE(o + 4), bytes.readFloatLE(o + 8)]);
    }
    return out;
  });

const downSum = cams.reduce((s, c) => add(s, c.down), [0, 0, 0]);
const scatter = [0, 1, 2].map((i) => [0, 1, 2].map((j) => cams.reduce((s, c) => s + c.right[i] * c.right[j], 0)));
const [least, middle, most] = eigen(scatter);
// With too little spread in where the cameras point, their right axes only pin down the side-to-side tilt.
const fromRightAxes = middle.value / cams.length > 0.05;
let up = fromRightAxes
  ? least.vector
  : unit(sub(downSum, scale(most.vector, dot(downSum, most.vector))));
if (dot(up, downSum) > 0) up = scale(up, -1);
const roll = median(cams.map((c) => Math.abs(deg(Math.asin(dot(c.right, up))))));
if (roll > 15) throw new Error(`cameras are rolled ${roll.toFixed(0)} deg from level on average; not leveling`);
// Photos are taken from the ground, so most of the wall should be above the cameras. If it isn't,
// the photos were rotated 180 degrees (EXIF orientation 3), which RealityScan ignores.
const flipped = median(vertices.map((v) => dot(v, up))) < median(cams.map((c) => dot(c.pos, up)));
if (flipped) up = scale(up, -1);
const fwdSum = cams.reduce((s, c) => add(s, c.forward), [0, 0, 0]);
const level = unit(sub(fwdSum, scale(up, dot(fwdSum, up))));
const facing = scale(level, -1);
const right = cross(up, facing);

// Rows map the RealityScan frame into glTF: right -> +X, up -> +Y, facing -> +Z.
const m = [right, up, facing];
const trace = m[0][0] + m[1][1] + m[2][2];
let q;
if (trace > 0) {
  const s = 0.5 / Math.sqrt(trace + 1);
  q = [(m[2][1] - m[1][2]) * s, (m[0][2] - m[2][0]) * s, (m[1][0] - m[0][1]) * s, 0.25 / s];
} else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
  const s = 2 * Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]);
  q = [0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s, (m[2][1] - m[1][2]) / s];
} else if (m[1][1] > m[2][2]) {
  const s = 2 * Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]);
  q = [(m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s, (m[0][2] - m[2][0]) / s];
} else {
  const s = 2 * Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]);
  q = [(m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s, (m[1][0] - m[0][1]) / s];
}
q = scale(q, 1 / len(q));

const center = scale(vertices.reduce(add, [0, 0, 0]), 1 / vertices.length);
const camCenter = scale(cams.reduce((s, c) => add(s, c.pos), [0, 0, 0]), 1 / cams.length);
const aim = median(cams.map((c) => deg(Math.acos(dot(c.forward, unit(sub(center, c.pos)))))));
const heights = cams.map((c) => dot(c.pos, up));
const pitch = median(cams.map((c) => deg(Math.asin(dot(c.forward, up)))));

if (aim > 45) throw new Error(`cameras don't point at the model (median ${aim.toFixed(0)} deg off); are the XMPs from this project?`);

for (const scene of json.scenes) {
  const root = json.nodes[scene.nodes[0]];
  if (scene.nodes.length !== 1 || root.mesh !== undefined || !root.rotation) {
    throw new Error("expected glb-finish.mjs output (one rotated root node per scene)");
  }
  root.name = "level from cameras";
  root.rotation = q;
}
const size = writeGlb(dst, json, view);

console.log(`${cams.length} cameras, median roll ${roll.toFixed(1)} deg`);
if (fromRightAxes) console.log(`up from the camera right axes (spread ${(middle.value / cams.length).toFixed(2)})`);
else console.log("the cameras all point one way, so up is from their image-up vectors: the forward/back tilt is off by their mean pitch");
if (flipped) console.log("most of the model was below the cameras, so up was flipped (photos rotated 180 degrees)");
console.log(`tilt vs RealityScan +Z: ${deg(Math.acos(Math.min(1, up[2]))).toFixed(1)} deg`);
console.log(`camera heights span ${(Math.max(...heights) - Math.min(...heights)).toFixed(2)}, median pitch ${pitch.toFixed(1)} deg`);
console.log(`wall center is ${dot(sub(center, camCenter), level).toFixed(2)} in front of the cameras, ${dot(sub(center, camCenter), up).toFixed(2)} above them`);
console.log(`rotation [${q.map((v) => v.toFixed(5)).join(", ")}]`);
console.log(`wrote ${dst} (${(size / 1e6).toFixed(1)} MB)`);
