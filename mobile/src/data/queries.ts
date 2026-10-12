import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query';

import { fetchArea, fetchClimb } from '@/core/openbeta/api';
import { fetchRoutesFile } from '@/core/routes-file';
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

export function useRoutesFile(file: string) {
  return useQuery({
    queryKey: ['routes-file', file],
    queryFn: ({ signal }) => fetchRoutesFile(file, signal),
    // Lines change whenever someone saves in the author tool.
    staleTime: 0,
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
