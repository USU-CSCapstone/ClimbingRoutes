// Name search for climbs and areas. Typesense is the primary provider; if it
// fails, GraphQL area search keeps area results working (it can't search climbs).
import { ROOT_AREA, TYPESENSE_KEY, TYPESENSE_URL } from '../config';
import { hasFilters, matchesClimb, NO_FILTERS, rangesInUse, type RouteFilters } from '../filters';
import { gradeFromText } from '../grades';
import { gql } from '../openbeta/graphql';
import type { Discipline, LatLng, SearchResults } from '../types';

export const MIN_QUERY_LENGTH = 2;
const LIMIT = 25;
/** Grades are filtered here rather than by Typesense, so fetch more to still fill the list. */
const LIMIT_WITH_GRADES = 100;

/**
 * Type and distance filters go to Typesense. Distance applies to routes and
 * walls; bigger areas always show, since some of their walls may be close.
 * Without a user location, distance is ignored.
 */
export async function search(
  query: string,
  filters: RouteFilters = NO_FILTERS,
  user: LatLng | null = null,
  signal?: AbortSignal,
): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return { areas: [], climbs: [], best: 'climbs' };
  try {
    return await searchTypesense(q, filters, user, signal);
  } catch (err) {
    if (signal?.aborted) throw err;
    // The fallback can't filter, so with filters on it finds nothing rather than the wrong things.
    const areas = !hasFilters(filters) ? await searchAreasGraphql(q, signal) : [];
    return { areas, climbs: [], best: 'areas' };
  }
}

interface TsClimb {
  climbUUID: string;
  climbName: string;
  grade: string;
  disciplines: string[];
  areaNames: string[];
}

interface TsArea {
  areaUUID: string;
  name: string;
  pathTokens: string[];
  totalClimbs: number;
}

interface TsResponse {
  results: {
    hits?: {
      document: unknown;
      text_match: number;
      text_match_info?: { typo_prefix_score: number };
    }[];
    error?: string;
  }[];
}

async function searchTypesense(
  q: string,
  filters: RouteFilters,
  user: LatLng | null,
  signal?: AbortSignal,
): Promise<SearchResults> {
  const near = user && filters.withinMiles != null ? `(${user.lat},${user.lng},${filters.withinMiles} mi)` : null;
  const areaFilter = [`pathTokens:=${ROOT_AREA.name}`, near && `(leaf:false || areaLatLng:${near})`];
  const climbFilter = [
    `areaNames:=${ROOT_AREA.name}`,
    filters.types.length > 0 && `disciplines:=[${filters.types.map(fromDiscipline).join(',')}]`,
    near && `cragLatLng:${near}`,
  ];
  const ranges = rangesInUse(filters);
  const gradesOn = !!(ranges.yds || ranges.vscale);
  const res = await fetch(`${TYPESENSE_URL}/multi_search`, {
    method: 'POST',
    headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searches: [
        {
          collection: 'areas',
          q,
          query_by: 'name',
          filter_by: areaFilter.filter(Boolean).join(' && '),
          sort_by: '_text_match:desc,totalClimbs:desc',
          per_page: 10,
        },
        {
          collection: 'climbs',
          q,
          query_by: 'climbName',
          filter_by: climbFilter.filter(Boolean).join(' && '),
          per_page: gradesOn ? LIMIT_WITH_GRADES : LIMIT,
        },
      ],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Typesense returned HTTP ${res.status}`);
  const [areaResult, climbResult] = ((await res.json()) as TsResponse).results;
  if (areaResult.error || climbResult.error) {
    throw new Error(areaResult.error ?? climbResult.error);
  }

  const areas = (areaResult.hits ?? []).map(({ document }) => {
    const a = document as TsArea;
    return {
      kind: 'area' as const,
      uuid: a.areaUUID,
      name: a.name,
      totalClimbs: a.totalClimbs,
      path: a.pathTokens.slice(0, -1),
    };
  });

  // The climbs collection has some duplicate documents for the same climb.
  const seen = new Set<string>();
  const climbs = [];
  for (const { document } of climbResult.hits ?? []) {
    const c = document as TsClimb;
    if (seen.has(c.climbUUID)) continue;
    seen.add(c.climbUUID);
    const disciplines = c.disciplines.map(toDiscipline);
    const grade = gradeFromText(c.grade);
    if (climbs.length >= LIMIT || !matchesClimb({ grade, disciplines }, filters)) continue;
    climbs.push({
      kind: 'climb' as const,
      uuid: c.climbUUID,
      name: c.climbName,
      grade,
      disciplines,
      path: c.areaNames,
    });
  }
  // Areas go first when one matches the query exactly ("logan" → Logan Canyon).
  // Otherwise the better top hit wins ("hooked" → the route Hooked, not the area Mount Hooker).
  const topArea = areaResult.hits?.[0];
  const topClimb = climbResult.hits?.[0];
  const exactArea = topArea?.text_match_info?.typo_prefix_score === 0;
  const areasWin = !!topArea && (exactArea || topArea.text_match >= (topClimb?.text_match ?? 0));
  return { areas, climbs, best: areasWin ? 'areas' : 'climbs' };
}

function toDiscipline(d: string): Discipline {
  if (d === 'bouldering') return 'boulder';
  if (d === 'deepwatersolo') return 'dws';
  return d as Discipline;
}

function fromDiscipline(d: Discipline): string {
  if (d === 'boulder') return 'bouldering';
  if (d === 'dws') return 'deepwatersolo';
  return d;
}

async function searchAreasGraphql(q: string, signal?: AbortSignal) {
  // OpenBeta builds a regex from `match`, so escape anything special.
  const match = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const { areas } = await gql<{
    areas: { uuid: string; area_name: string; totalClimbs: number; pathTokens: string[] }[];
  }>(
    `query Search($match: String!) {
      areas(filter: { area_name: { match: $match } }, limit: 20) {
        uuid area_name totalClimbs pathTokens
      }
    }`,
    { match },
    signal,
  );
  return areas
    .filter((a) => a.pathTokens[0] === ROOT_AREA.name)
    .map((a) => ({
      kind: 'area' as const,
      uuid: a.uuid,
      name: a.area_name,
      totalClimbs: a.totalClimbs,
      path: a.pathTokens.slice(0, -1),
    }));
}
