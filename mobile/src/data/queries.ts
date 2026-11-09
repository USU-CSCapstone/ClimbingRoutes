import { keepPreviousData, QueryClient, queryOptions, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ROOT_AREA } from '@/core/config';
import { type MapView, visibleNodes } from '@/core/map';
import { fetchArea, fetchClimb, fetchMapArea } from '@/core/openbeta/api';
import { MIN_QUERY_LENGTH, search } from '@/core/search';
import type { MapArea, MapNode, Uuid } from '@/core/types';
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
  const { nodes, split, missing } = visibleNodes(ROOT_AREA.uuid, view, (uuid) => areas.get(uuid));
  // A few at a time so OpenBeta isn't flooded; the rest load as these finish.
  const missingKey = missing.slice(0, MAP_FETCHES_AT_ONCE).join(',');

  useEffect(() => {
    if (!missingKey) return;
    for (const uuid of missingKey.split(',')) {
      queryClient
        .fetchQuery(mapAreaQuery(uuid))
        .then((area) => {
          // An area OpenBeta can't find is stored empty so it isn't asked for again.
          setAreas((prev) => new Map(prev).set(uuid, area ?? { uuid, path: [], bbox: null, children: [] }));
        })
        .catch((e: Error) => {
          // Only the root failing leaves the map empty; other areas stay one dot.
          if (uuid === ROOT_AREA.uuid) setError(e);
        });
    }
  }, [missingKey]);

  const dots = useWithModels(nodes);
  return { dots, split, loading: missing.length > 0, error };
}

/**
 * An area as the map draws it, with its children (those with a location and
 * routes) by name. Shares the map's cache.
 */
export function useMapArea(uuid: Uuid) {
  const { data, isPending, error } = useQuery({ ...mapAreaQuery(uuid), select: childrenByName });
  return { area: data, children: useWithModels(data?.children ?? []), isPending, error };
}

// No abort signal: React Query cancels a fetch that read it once its last observer goes, and an area's
// panel is often the only observer of a fetch the map is waiting on too. Closing the panel mid-load
// would then drop the map's copy, leaving that area unsplit.
function mapAreaQuery(uuid: Uuid) {
  return queryOptions({ queryKey: ['mapArea', uuid], queryFn: () => fetchMapArea(uuid) });
}

function childrenByName(area: MapArea | null): MapArea | null {
  return area && { ...area, children: [...area.children].sort((a, b) => a.name.localeCompare(b.name)) };
}

/** Map nodes marked with whether each wall has a published 3D model. */
function useWithModels(nodes: MapNode[]): MapDot[] {
  const published = usePublishedWalls().data;
  return nodes.map((n) => ({ ...n, hasModel: published?.has(n.uuid) ?? false }));
}

export function useSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['search', q.toLowerCase()],
    queryFn: ({ signal }) => search(q, signal),
    enabled: q.length >= MIN_QUERY_LENGTH,
    placeholderData: keepPreviousData,
  });
}
