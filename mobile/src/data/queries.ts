import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ROOT_AREA, WALLS_WITH_MODELS } from '@/core/config';
import { type MapView, visibleNodes } from '@/core/map';
import { fetchArea, fetchClimb, fetchMapArea } from '@/core/openbeta/api';
import { fetchRoutesFile } from '@/core/routes-file';
import { MIN_QUERY_LENGTH, search } from '@/core/search';
import type { MapArea, MapNode, Uuid } from '@/core/types';

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

export function useRoutesFile(file: string) {
  return useQuery({
    queryKey: ['routes-file', file],
    queryFn: ({ signal }) => fetchRoutesFile(file, signal),
    // Lines change whenever someone saves in the author tool.
    staleTime: 0,
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

  const dots: MapDot[] = nodes.map((n) => ({ ...n, hasModel: WALLS_WITH_MODELS.includes(n.uuid) }));
  return { dots, loading: missing.length > 0, error };
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
