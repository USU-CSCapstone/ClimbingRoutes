// Geometry for the wall viewer: finding the captured face of a photogrammetry
// mesh, and laying route lines over its surface.
import * as THREE from 'three';

import type { DrapeStats } from '@/viewer/types';

export interface CapturedFace {
  /** Average normal of the face, pointing out of the wall. */
  facing: THREE.Vector3;
  /** Bounds of the face, used to frame the camera. */
  box: THREE.Box3;
  /** Share of triangles that belong to the face, from 0 to 1. */
  share: number;
  medianArea: number;
}

/**
 * Finds the part of the mesh that was actually photographed. Triangles more
 * than four times the median area are left out: they are the stretched filler
 * the reconstruction adds where the photos ran out.
 */
export function findCapturedFace(root: THREE.Object3D): CapturedFace {
  root.updateMatrixWorld(true);
  const tri = new THREE.Triangle();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const areas: number[] = [];
  const normals: number[] = [];
  const mids: number[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geometry: THREE.BufferGeometry = o.geometry;
    const pos = geometry.attributes.position;
    const idx = geometry.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      a.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(o.matrixWorld);
      tri.set(a, b, c);
      areas.push(tri.getArea());
      tri.getNormal(n);
      normals.push(n.x, n.y, n.z);
      tri.getMidpoint(mid);
      mids.push(mid.x, mid.y, mid.z);
    }
  });
  const sorted = Float64Array.from(areas).sort();
  const medianArea = sorted[Math.floor(sorted.length / 2)];
  const facing = new THREE.Vector3();
  const box = new THREE.Box3();
  const p = new THREE.Vector3();
  let kept = 0;
  for (let t = 0; t < areas.length; t++) {
    if (areas[t] > medianArea * 4) continue;
    facing.x += normals[3 * t];
    facing.y += normals[3 * t + 1];
    facing.z += normals[3 * t + 2];
    box.expandByPoint(p.set(mids[3 * t], mids[3 * t + 1], mids[3 * t + 2]));
    kept++;
  }
  return { facing: facing.normalize(), box, share: kept / Math.max(areas.length, 1), medianArea };
}

/** Edge length of an equilateral triangle with the median area: the mesh's typical spacing. */
export function typicalEdge(medianArea: number): number {
  return Math.sqrt(medianArea * 2.309);
}

/**
 * Lays a polyline over the surface so it follows the rock instead of cutting
 * through bulges or floating over hollows. Each segment between placed points
 * is sampled about once per mesh edge, each sample is projected onto the
 * surface along the interpolated normal, then lifted by `offset`.
 */
export function drape(
  targets: THREE.Object3D[],
  points: THREE.Vector3[],
  normals: THREE.Vector3[],
  edge: number,
  offset: number,
): { line: THREE.Vector3[]; stats: DrapeStats } {
  const raycaster = new THREE.Raycaster();
  const line: THREE.Vector3[] = [];
  const deviations: number[] = [];
  let misses = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const na = normals[i];
    const nb = normals[i + 1];
    const len = a.distanceTo(b);
    const steps = Math.min(600, Math.max(1, Math.ceil(len / edge)));
    const h = Math.max(len * 0.5, edge * 20);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const S = a.clone().lerp(b, t);
      const N = na.clone().lerp(nb, t).normalize();
      if (s === 0) {
        line.push(S.addScaledVector(N, offset));
        deviations.push(0);
        continue;
      }
      raycaster.set(S.clone().addScaledVector(N, h), N.clone().negate());
      raycaster.far = 2 * h;
      const hits = raycaster.intersectObjects(targets, false);
      if (!hits.length) {
        line.push(S.addScaledVector(N, offset));
        deviations.push(NaN);
        misses++;
        continue;
      }
      let best = hits[0];
      for (const hit of hits) if (Math.abs(hit.distance - h) < Math.abs(best.distance - h)) best = hit;
      deviations.push(h - best.distance);
      const hn = best.face!.normal.clone().transformDirection(best.object.matrixWorld);
      if (hn.dot(N) < 0) hn.negate();
      line.push(best.point.clone().addScaledVector(hn, offset));
    }
  }
  const last = points.length - 1;
  line.push(points[last].clone().addScaledVector(normals[last], offset));
  deviations.push(0);
  let length = 0;
  for (let i = 1; i < line.length; i++) length += line[i].distanceTo(line[i - 1]);
  return { line, stats: { length, samples: line.length, misses, offset, deviations } };
}
