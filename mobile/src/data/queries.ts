import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query';

import { MAP_AREA, WALLS_WITH_MODELS } from '@/core/config';
import { fetchArea, fetchClimb, fetchWalls } from '@/core/openbeta/api';
import { MIN_QUERY_LENGTH, search } from '@/core/search';
import type { Uuid } from '@/core/types';

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

/** Walls on the map, marking the ones with a 3D model. */
export function useMapWalls() {
  return useQuery({
    queryKey: ['walls', MAP_AREA.path],
    queryFn: ({ signal }) => fetchWalls(MAP_AREA.path, signal),
    select: (walls) => walls.map((w) => ({ ...w, hasModel: WALLS_WITH_MODELS.includes(w.uuid) })),
  });
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
