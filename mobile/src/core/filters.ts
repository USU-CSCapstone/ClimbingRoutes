// Route filters shared by Explore, Map, Search and the 3D viewer: grade ranges,
// route types and distance from the user.
import { gradeFromText, gradeSpan, V_STEPS, YDS_STEPS } from './grades';
import type { Discipline, Grade, LatLng } from './types';

/** Inclusive, in the values of YDS_STEPS or V_STEPS. */
export interface GradeRange {
  min: number;
  max: number;
}

export interface RouteFilters {
  /** Types to show. Empty shows every type. */
  types: Discipline[];
  /** For roped routes. Null is any grade. */
  yds: GradeRange | null;
  /** For boulders. Null is any grade. */
  vscale: GradeRange | null;
  /** Only walls this close to the user. Null is any distance. */
  withinMiles: number | null;
}

export const NO_FILTERS: RouteFilters = { types: [], yds: null, vscale: null, withinMiles: null };

/** The types offered, most common first. Deep water solo and snow are too rare in the USA to list. */
export const FILTER_TYPES: Discipline[] = ['sport', 'trad', 'tr', 'boulder', 'alpine', 'ice', 'mixed', 'aid'];

export const DISTANCES_MILES = [10, 25, 50, 100, 250];

/** The YDS range only means something when roped routes are shown, and the V range when boulders are. */
export function rangesInUse(f: RouteFilters): { yds: GradeRange | null; vscale: GradeRange | null } {
  const any = f.types.length === 0;
  return {
    yds: any || f.types.some((t) => t !== 'boulder') ? f.yds : null,
    vscale: any || f.types.includes('boulder') ? f.vscale : null,
  };
}

export function hasFilters(f: RouteFilters): boolean {
  const { yds, vscale } = rangesInUse(f);
  return f.types.length > 0 || !!yds || !!vscale || f.withinMiles != null;
}

/**
 * Whether a climb passes the type and grade filters. With a grade range set,
 * a YDS or V grade must fall in the range for its scale, so a route grade
 * filter hides boulders. Grades in other systems, like WI for ice, pass. A
 * missing or unreadable grade fails, since it can't be checked.
 */
export function matchesClimb(climb: { grade: Grade | null; disciplines: Discipline[] }, f: RouteFilters): boolean {
  if (f.types.length > 0 && !climb.disciplines.some((d) => f.types.includes(d))) return false;
  const ranges = rangesInUse(f);
  if (!ranges.yds && !ranges.vscale) return true;
  if (climb.grade && climb.grade.system !== 'yds' && climb.grade.system !== 'vscale') return true;
  const span = gradeSpan(climb.grade);
  if (!span) return false;
  const range = ranges[span.system];
  return !!range && span.hi >= range.min && span.lo <= range.max;
}

/** Climb counts for an area, from OpenBeta's aggregates. */
export interface AreaStats {
  /** Grade text, like "5.10a" or "V3", to the number of climbs with it. */
  byGrade: Record<string, number>;
  byType: Partial<Record<Discipline, number>>;
}

/**
 * Whether an area has climbs that could pass the type and grade filters.
 * OpenBeta counts grades and types separately, so an area with sport routes
 * and 5.10 boulders passes "sport, 5.10". Areas with no counts pass.
 */
export function areaMayMatch(stats: AreaStats | null, f: RouteFilters): boolean {
  if (!stats) return true;
  if (f.types.length > 0 && !f.types.some((t) => (stats.byType[t] ?? 0) > 0)) return false;
  const ranges = rangesInUse(f);
  if (!ranges.yds && !ranges.vscale) return true;
  return Object.entries(stats.byGrade).some(([label, count]) => {
    const span = count > 0 ? gradeSpan(gradeFromText(label)) : null;
    const range = span ? ranges[span.system] : null;
    return !!span && !!range && span.hi >= range.min && span.lo <= range.max;
  });
}

/**
 * Whether a spot is within the distance filter. Passes when there's no
 * distance filter or the user's location isn't known, and fails for a spot
 * with no location.
 */
export function withinDistance(user: LatLng | null, spot: LatLng | null, f: RouteFilters): boolean {
  if (f.withinMiles == null || !user) return true;
  return !!spot && milesBetween(user, spot) <= f.withinMiles;
}

const EARTH_RADIUS_MILES = 3958.8;

export function milesBetween(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export function rangeText(steps: { label: string; value: number }[], range: GradeRange): string {
  const label = (v: number) => steps.find((s) => s.value === v)?.label ?? String(v);
  const atBottom = range.min <= steps[0].value;
  const atTop = range.max >= steps[steps.length - 1].value;
  if (atBottom && atTop) return 'Any grade';
  if (atBottom) return `Up to ${label(range.max)}`;
  if (atTop) return `${label(range.min)} and up`;
  return range.min === range.max ? label(range.min) : `${label(range.min)}–${label(range.max)}`;
}

/** One chip per filter that's set, each with the filters it leaves when removed. */
export function filterChips(
  f: RouteFilters,
  typeLabel: (d: Discipline) => string,
): { key: string; label: string; without: RouteFilters }[] {
  const chips = [];
  const ranges = rangesInUse(f);
  if (f.types.length > 0) {
    chips.push({ key: 'types', label: f.types.map(typeLabel).join(', '), without: { ...f, types: [] } });
  }
  if (ranges.yds) chips.push({ key: 'yds', label: rangeText(YDS_STEPS, ranges.yds), without: { ...f, yds: null } });
  if (ranges.vscale) {
    chips.push({ key: 'vscale', label: rangeText(V_STEPS, ranges.vscale), without: { ...f, vscale: null } });
  }
  if (f.withinMiles != null) {
    chips.push({ key: 'distance', label: `Within ${f.withinMiles} mi`, without: { ...f, withinMiles: null } });
  }
  return chips;
}
