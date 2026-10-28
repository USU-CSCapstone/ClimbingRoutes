// Published wall models and the route lines drawn on them, as stored in
// Supabase (supabase/migrations/). A model version never changes, so anything
// keyed by its path can be kept for good.
import { SUPABASE_URL } from './config';
import type { Uuid } from './types';

/** A point or direction in model units, as [x, y, z]. */
export type Vec3 = [number, number, number];

export interface PublishedModel {
  id: string;
  wallUuid: Uuid;
  version: number;
  /** Path in the models bucket, like "<wall uuid>/v1.glb". */
  glbPath: string;
  bytes: number;
}

/** A route's line on one model version. */
export interface DrawnLine {
  climbUuid: Uuid;
  name: string;
  /** Grade text, like "5.10a". */
  grade: string | null;
  /** Points placed on the rock from the start upward. */
  points: Vec3[];
  /** Surface normal at each point, pointing out of the rock. */
  normals: Vec3[];
}

/**
 * Where the app downloads a model file from. Every model URL comes from here,
 * so moving the files (to Cloudflare R2, say) means changing only this.
 */
export function modelUrl(glbPath: string): string {
  const path = glbPath.split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/models/${path}`;
}

/** The JSON points or normals of a route_lines row, or null if they aren't a list of [x, y, z]. */
export function vec3List(json: unknown): Vec3[] | null {
  if (!Array.isArray(json)) return null;
  const ok = json.every((v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number'));
  return ok ? (json as Vec3[]) : null;
}
