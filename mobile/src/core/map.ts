// Which dots the map shows. Areas start as one dot and split into their
// children once zooming in gives each child room on screen, so zooming out
// of Logan Canyon folds its walls back into one dot.
import type { BBox, MapArea, MapNode, Uuid } from './types';

export interface MapView {
  bbox: BBox;
  zoom: number;
  /** Size of the map on screen, in pixels. */
  width: number;
  height: number;
}

/** Room each child dot needs, in pixels, before its area splits. */
const DOT_ROOM = 60;
/** At this zoom every area splits, even if its children share one point. */
const ALWAYS_SPLIT_ZOOM = 14;

/**
 * Walks down from `root`, splitting areas near the view. Returns the dots to
 * draw, the areas split into them, and the areas that must be loaded before
 * they can be split, nearest the middle of the view first.
 */
export function visibleNodes(
  root: Uuid,
  view: MapView,
  getArea: (uuid: Uuid) => MapArea | undefined,
): { nodes: MapNode[]; split: Uuid[]; missing: Uuid[] } {
  const nodes: MapNode[] = [];
  const split: Uuid[] = [];
  const missing: MapNode[] = [];
  // Look half a view beyond each edge, so areas centered just off screen
  // still split when their children reach into it.
  const near = grow(view.bbox, 0.5);
  const lng = (view.bbox[0] + view.bbox[2]) / 2;
  const lat = (view.bbox[1] + view.bbox[3]) / 2;
  const distance = (n: MapNode) => (n.location.lng - lng) ** 2 + (n.location.lat - lat) ** 2;

  // `closest` marks the sibling nearest the middle of the view. It loads even
  // when far off screen, since zoomed in on a canyon the state it's in has
  // its dot hundreds of miles away.
  const walk = (node: MapNode, closest: boolean) => {
    if (node.isLeaf) {
      nodes.push(node);
      return;
    }
    const area = getArea(node.uuid);
    if (!area) {
      if (closest || contains(near, node.location.lng, node.location.lat)) missing.push(node);
      nodes.push(node);
      return;
    }
    const extent = extentOf(area.children);
    if (!extent || !intersects(near, area.bbox ?? extent) || !shouldSplit(area, extent, view)) {
      nodes.push(node);
      return;
    }
    split.push(node.uuid);
    walkAll(area.children);
  };

  const walkAll = (children: MapNode[]) => {
    const closest = children.reduce<MapNode | null>(
      (best, c) => (!best || distance(c) < distance(best) ? c : best),
      null,
    );
    for (const c of children) walk(c, c === closest);
  };

  const top = getArea(root);
  if (!top) return { nodes, split, missing: [root] };
  walkAll(top.children);
  missing.sort((a, b) => distance(a) - distance(b));
  return { nodes, split, missing: missing.map((n) => n.uuid) };
}

/** Splits once the children spread far enough on screen that they'd rarely overlap. */
function shouldSplit(area: MapArea, extent: BBox, view: MapView): boolean {
  if (area.children.length === 1 || view.zoom >= ALWAYS_SPLIT_ZOOM) return true;
  return spreadPx(extent, view) >= roomNeeded(area);
}

/**
 * The lowest zoom, from the current view, at which `area` splits into its
 * children, so moving the map there shows them all. Each zoom level doubles
 * their spread on screen.
 */
export function splitZoom(area: MapArea, view: MapView): number {
  const extent = extentOf(area.children);
  if (!extent || shouldSplit(area, extent, view)) return view.zoom;
  // A little past the threshold, so rounding doesn't leave it just short. Children that share one
  // point only split at ALWAYS_SPLIT_ZOOM.
  return Math.min(ALWAYS_SPLIT_ZOOM, view.zoom + Math.log2(roomNeeded(area) / spreadPx(extent, view)) + 0.05);
}

/** How far apart the children are on screen, in pixels. */
function spreadPx(extent: BBox, view: MapView): number {
  return Math.max(
    ((extent[2] - extent[0]) / (view.bbox[2] - view.bbox[0])) * view.width,
    ((extent[3] - extent[1]) / (view.bbox[3] - view.bbox[1])) * view.height,
  );
}

function roomNeeded(area: MapArea): number {
  return DOT_ROOM * Math.sqrt(area.children.length);
}

function extentOf(nodes: MapNode[]): BBox | null {
  if (nodes.length === 0) return null;
  const lngs = nodes.map((n) => n.location.lng);
  const lats = nodes.map((n) => n.location.lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

function grow([w, s, e, n]: BBox, by: number): BBox {
  const dx = (e - w) * by;
  const dy = (n - s) * by;
  return [w - dx, s - dy, e + dx, n + dy];
}

function contains([w, s, e, n]: BBox, lng: number, lat: number): boolean {
  return lng >= w && lng <= e && lat >= s && lat <= n;
}

function intersects(a: BBox, b: BBox): boolean {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}
