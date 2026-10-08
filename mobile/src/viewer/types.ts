// Public types for the wall viewer. Everything here is plain data so it can
// cross the bridge between native screens and the DOM component.
import type { Grade, Uuid } from '@/core/types';

/** A point or direction in model units, as [x, y, z]. */
export type Vec3 = [number, number, number];

export interface ViewerRoute {
  /** OpenBeta climb uuid. */
  uuid: Uuid;
  name: string;
  grade: Grade | null;
  /** Points the author placed on the rock, from the start upward. */
  points: Vec3[];
  /** Surface normal at each point, pointing out of the rock. */
  normals: Vec3[];
  /** CSS color. Defaults to a palette color picked by the route's place in the list. */
  color?: string;
  /** Defaults to true. */
  visible?: boolean;
}

export interface ModelInfo {
  triangles: number;
  vertices: number;
  /** Size of each texture in pixels, like "8192×8192". */
  textures: string[];
  /** Download size, when the server sends a Content-Length. */
  bytes: number | null;
  /** Download plus parse time. */
  loadMs: number;
  /** Bounding box in model units. Models are not scaled to meters yet. */
  size: Vec3;
  /** Share of triangles that belong to the captured face of the wall, from 0 to 1. */
  capturedFace: number;
  /** Largest texture the GPU accepts, in pixels. */
  maxTextureSize: number;
}

/** A point on the model's surface. */
export interface SurfaceHit {
  point: Vec3;
  /** Points out of the rock, toward the camera. */
  normal: Vec3;
}

/** How a route's line was laid over the surface. */
export interface DrapeStats {
  /** Length of the draped line in model units. */
  length: number;
  /** Surface samples along the line. */
  samples: number;
  /** Samples where the line crossed a hole in the mesh. */
  misses: number;
  /** Height of the line above the surface. */
  offset: number;
  /**
   * How far a straight segment between placed points would be from the
   * surface at each sample: positive is sunk into the rock, negative is
   * floating. NaN (null after crossing the DOM bridge) over holes.
   */
  deviations: number[];
}

export interface ViewerOptions {
  /** URL of the wall's GLB. */
  model: string;
  routes?: ViewerRoute[];
  /** Keep the camera in front of the wall. Defaults to true. */
  frontArc?: boolean;
  /** Dim the other routes while one is highlighted. Defaults to true. */
  dimOthers?: boolean;
  /** CSS color behind the model. */
  background?: string;
  onProgress?: (fraction: number) => void;
  onLoad?: (info: ModelInfo) => void;
  onError?: (error: Error) => void;
  /** A tap landed on a route's line or label. */
  onRouteTap?: (uuid: Uuid) => void;
  /** Every tap on the model, with the surface under it, or null if it missed the wall. */
  onSurfaceTap?: (hit: SurfaceHit | null) => void;
  /** Frame rate, reported twice a second. */
  onFps?: (fps: number) => void;
}

export interface Viewer {
  /** Replaces the routes. Lines whose points haven't changed are not draped again. */
  setRoutes(routes: ViewerRoute[]): void;
  /** Thickens one route's line and, unless dimOthers is off, dims the rest. Null shows them all evenly. */
  highlight(uuid: Uuid | null): void;
  setFrontArc(on: boolean): void;
  /**
   * Moves the camera to an angle from straight in front of the wall, framing
   * the highlighted route or, with none, the whole wall.
   */
  setView(azimuthDeg: number, elevationDeg: number): void;
  /**
   * Extra marks on the highlighted route for drawing it: a dot on each placed
   * point, and the straight segments between them as a dashed line.
   */
  setOverlays(overlays: { points?: boolean; straight?: boolean }): void;
  routeStats(uuid: Uuid): DrapeStats | null;
  /** Stops rendering and loading, and frees the GPU memory. */
  dispose(): void;
}
