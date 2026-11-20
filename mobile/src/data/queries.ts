import { keepPreviousData, QueryClient, useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ROOT_AREA } from '@/core/config';
import { areaMayMatch, type AreaStats, rangesInUse, type RouteFilters, withinDistance } from '@/core/filters';
import { type MapView, visibleNodes } from '@/core/map';
import { fetchArea, fetchChildStats, fetchClimb, fetchMapArea } from '@/core/openbeta/api';
import { MIN_QUERY_LENGTH, search } from '@/core/search';
import type { LatLng, MapArea, MapNode, Uuid } from '@/core/types';
import { useFilters } from '@/data/filters';
import { useUserLocation } from '@/data/location';
import { usePublishedWalls } from '@/data/models';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // OpenBeta data changes rarely, so keep it for a day.
      staleTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
});

export function useArea(uuid: Uuid) {
  return useQuery({
    queryKey: ['area', uuid],
    queryFn: ({ signal }) => fetchArea(uuid, signal),
  });
}

export function useClimb(uuid: Uuid) {
  return useQuery({
    queryKey: ['climb', uuid],
    queryFn: ({ signal }) => fetchClimb(uuid, signal),
  });
}

export type MapDot = MapNode & { hasModel: boolean };

const MAP_FETCHES_AT_ONCE = 6;

/**
 * The dots to draw for the current view. Areas load as the view reaches them
 * and stay cached, so panning back is instant.
 */
export function useMapDots(view: MapView) {
  const [areas, setAreas] = useState<Map<Uuid, MapArea>>(() => new Map());
  const [error, setError] = useState<Error | null>(null);
  const { nodes, missing } = visibleNodes(ROOT_AREA.uuid, view, (uuid) => areas.get(uuid));
  // A few at a time so OpenBeta isn't flooded; the rest load as these finish.
  const missingKey = missing.slice(0, MAP_FETCHES_AT_ONCE).join(',');

  useEffect(() => {
    if (!missingKey) return;
    for (const uuid of missingKey.split(',')) {
      queryClient
        .fetchQuery({ queryKey: ['mapArea', uuid], queryFn: ({ signal }) => fetchMapArea(uuid, signal) })
        .then((area) => {
          // An area OpenBeta can't find is stored empty so it isn't asked for again.
          setAreas((prev) => new Map(prev).set(uuid, area ?? { uuid, bbox: null, children: [] }));
        })
        .catch((e: Error) => {
          // Only the root failing leaves the map empty; other areas stay one dot.
          if (uuid === ROOT_AREA.uuid) setError(e);
        });
    }
  }, [missingKey]);

  const published = usePublishedWalls().data;
  const filters = useFilters();
  const { location } = useUserLocation();
  const parentOf = new Map<Uuid, Uuid>();
  for (const area of areas.values()) for (const c of area.children) parentOf.set(c.uuid, area.uuid);
  const stats = useStatsOf(
    [...new Set(nodes.map((n) => parentOf.get(n.uuid)).filter((p) => p != null))],
    filters,
  );
  const dots: MapDot[] = nodes
    .filter((n) => shownArea(n, stats.get(parentOf.get(n.uuid) ?? '')?.[n.uuid] ?? null, filters, location))
    .map((n) => ({ ...n, hasModel: published?.has(n.uuid) ?? false }));
  return { dots, loading: missing.length > 0, error };
}

/** Grade and type filters need the climb counts of each area, which are fetched separately. */
function needsStats(f: RouteFilters): boolean {
  const { yds, vscale } = rangesInUse(f);
  return f.types.length > 0 || !!yds || !!vscale;
}

/** Climb counts for the children of each parent, while a grade or type filter is set. */
function useStatsOf(parents: Uuid[], filters: RouteFilters): Map<Uuid, Record<Uuid, AreaStats>> {
  const enabled = needsStats(filters);
  const results = useQueries({
    queries: parents.map((uuid) => ({
      queryKey: ['childStats', uuid],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchChildStats(uuid, signal),
      enabled,
    })),
  });
  const byParent = new Map<Uuid, Record<Uuid, AreaStats>>();
  parents.forEach((uuid, i) => {
    const data = results[i]?.data;
    if (data) byParent.set(uuid, data);
  });
  return byParent;
}

/** Climb counts for an area's children, for filtering its list of sub-areas. */
export function useChildStats(uuid: Uuid): Record<Uuid, AreaStats> | null {
  return useStatsOf([uuid], useFilters()).get(uuid) ?? null;
}

/**
 * Whether an area or wall shows with the filters set. Distance applies to
 * walls only: a bigger area's middle can be far off while some of its walls
 * are close.
 */
export function shownArea(
  area: { isLeaf: boolean; location: LatLng | null },
  stats: AreaStats | null,
  filters: RouteFilters,
  user: LatLng | null,
): boolean {
  if (!areaMayMatch(stats, filters)) return false;
  return !area.isLeaf || withinDistance(user, area.location, filters);
}

export function useSearch(query: string) {
  const q = query.trim();
  const filters = useFilters();
  const { location } = useUserLocation();
  return useQuery({
    queryKey: ['search', q.toLowerCase(), filters, location],
    queryFn: ({ signal }) => search(q, filters, location, signal),
    enabled: q.length >= MIN_QUERY_LENGTH,
    placeholderData: keepPreviousData,
  });
}
