// The route lines drawn on one model, saved by the author tool to
// data/routes/<model>.json. scripts/viewer/serve.mjs checks the shape on save.
import type { Uuid } from './types';

/** A point or direction in model units, as [x, y, z]. */
type Vec3 = [number, number, number];

export interface RoutesFile {
  /** Repo path of the model the points belong to, like "data/models/wall47.glb". */
  model: string;
  /** The OpenBeta area the routes came from. */
  area: { name: string; openbeta_uuid: Uuid } | null;
  /** When the file was saved, as an ISO date. */
  updated: string;
  /** Only routes with at least one point. */
  routes: SavedRoute[];
}

export interface SavedRoute {
  openbeta_uuid: Uuid;
  name: string;
  /** Grade text, like "5.10a". */
  grade: string;
  /** Points the author placed on the rock, from the start upward, rounded to 4 decimals. */
  points: Vec3[];
  /** Surface normal at each point, pointing out of the rock. */
  normals: Vec3[];
}

/**
 * The lines saved for a model, or null if none have been drawn on it yet.
 * `dataUrl` is the data/ folder to read from, like DATA_URL in config.ts.
 */
export async function fetchRoutesFile(
  dataUrl: string,
  file: string,
  signal?: AbortSignal,
): Promise<RoutesFile | null> {
  const res = await fetch(`${dataUrl}/routes/${encodeURIComponent(file)}`, { cache: 'no-store', signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Couldn't load the route lines (HTTP ${res.status})`);
  return (await res.json()) as RoutesFile;
}
