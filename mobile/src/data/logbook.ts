// The signed-in account's saved routes and climbed routes, from Supabase.
// Row-level security keeps each account to its own. Changes show at once and
// are put back if the server refuses them.
import { type QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ClimbedRoute, SavedRoute } from '@/core/database';
import type { Uuid } from '@/core/types';
import { useUserId } from '@/data/auth';
import { supabase } from '@/data/supabase';

/** A route as it's kept with a save or a climb: enough to list it without asking OpenBeta. */
export interface RouteRef {
  climbUuid: Uuid;
  /** The OpenBeta area of the wall it's on. */
  wallUuid: Uuid;
  name: string;
  grade: string | null;
  wallName: string;
}

/** Both lists change rarely and only from this app, so they're kept a while between looks. */
const STALE_MS = 5 * 60 * 1000;
/** Postgres's code for "this row already exists". */
const DUPLICATE = '23505';

const savedKey = (userId: string | undefined): QueryKey => ['saved-routes', userId];
const climbedKey = (userId: string | undefined): QueryKey => ['climbed-routes', userId];

/** Routes this account saved, newest first. Stays undefined while signed out. */
export function useSavedRoutes() {
  const userId = useUserId();
  return useQuery({
    queryKey: savedKey(userId),
    queryFn: async ({ signal }): Promise<SavedRoute[]> => {
      const { data, error } = await supabase
        .from('saved_routes')
        .select()
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .abortSignal(signal);
      if (error) throw new Error(`Couldn't load your saved routes: ${error.message}`);
      return data;
    },
    enabled: userId != null,
    staleTime: STALE_MS,
  });
}

/** Routes this account climbed, the latest day first. Stays undefined while signed out. */
export function useClimbedRoutes() {
  const userId = useUserId();
  return useQuery({
    queryKey: climbedKey(userId),
    queryFn: async ({ signal }): Promise<ClimbedRoute[]> => {
      const { data, error } = await supabase
        .from('climbed_routes')
        .select()
        .eq('user_id', userId!)
        .order('climbed_on', { ascending: false })
        .order('created_at', { ascending: false })
        .abortSignal(signal);
      if (error) throw new Error(`Couldn't load your climbed routes: ${error.message}`);
      return data;
    },
    enabled: userId != null,
    staleTime: STALE_MS,
  });
}

/** Saves a route, or takes it off the list. */
export function useSetSaved() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const key = savedKey(userId);
  return useMutation({
    mutationFn: async ({ route, saved }: { route: RouteRef; saved: boolean }) => {
      if (!userId) throw new Error('Sign in to save routes.');
      if (saved) {
        const { error } = await supabase.from('saved_routes').insert({
          climb_uuid: route.climbUuid,
          wall_uuid: route.wallUuid,
          name: route.name,
          grade: route.grade,
          wall_name: route.wallName,
        });
        // Saved already, from another phone or a double tap: that's what was asked for.
        if (error && error.code !== DUPLICATE) throw new Error(`Couldn't save the route: ${error.message}`);
      } else {
        const { error } = await supabase.from('saved_routes').delete().eq('user_id', userId).eq('climb_uuid', route.climbUuid);
        if (error) throw new Error(`Couldn't remove the route: ${error.message}`);
      }
    },
    onMutate: async ({ route, saved }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<SavedRoute[]>(key);
      const rest = (before ?? []).filter((r) => r.climb_uuid !== route.climbUuid);
      queryClient.setQueryData<SavedRoute[]>(key, saved ? [row(route, userId), ...rest] : rest);
      return { before };
    },
    onError: (_error, _change, context) => queryClient.setQueryData(key, context?.before),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/** Marks a route climbed on a day, or moves an existing one to that day. */
export function useSetClimbed() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const key = climbedKey(userId);
  return useMutation({
    mutationFn: async ({ route, day, known }: { route: RouteRef; day: string; known?: boolean }) => {
      if (!userId) throw new Error('Sign in to keep track of what you’ve climbed.');
      // A new row, or a new day on the one that's there. Not an upsert: that would need permission to
      // rewrite the whole row, and only the day can change. `known` is whether this phone already had it.
      const move = async () => {
        const moved = await supabase.from('climbed_routes').update({ climbed_on: day }).eq('user_id', userId).eq('climb_uuid', route.climbUuid);
        if (moved.error) throw new Error(`Couldn't change the day: ${moved.error.message}`);
      };
      if (known) return move();
      const { error } = await supabase.from('climbed_routes').insert({
        climb_uuid: route.climbUuid,
        wall_uuid: route.wallUuid,
        name: route.name,
        grade: route.grade,
        wall_name: route.wallName,
        climbed_on: day,
      });
      if (!error) return;
      // Marked climbed from another phone since this one last looked.
      if (error.code === DUPLICATE) return move();
      throw new Error(`Couldn't mark the route climbed: ${error.message}`);
    },
    onMutate: async ({ route, day }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<ClimbedRoute[]>(key);
      const rest = (before ?? []).filter((r) => r.climb_uuid !== route.climbUuid);
      const next = [{ ...row(route, userId), climbed_on: day }, ...rest];
      // Latest day first, as the server sends them.
      queryClient.setQueryData<ClimbedRoute[]>(key, next.sort((a, b) => b.climbed_on.localeCompare(a.climbed_on)));
      return { before };
    },
    onError: (_error, _change, context) => queryClient.setQueryData(key, context?.before),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/** Takes a route off the climbed list. */
export function useRemoveClimbed() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const key = climbedKey(userId);
  return useMutation({
    mutationFn: async (climbUuid: Uuid) => {
      if (!userId) throw new Error('Sign in first.');
      const { error } = await supabase.from('climbed_routes').delete().eq('user_id', userId).eq('climb_uuid', climbUuid);
      if (error) throw new Error(`Couldn't remove it: ${error.message}`);
    },
    onMutate: async (climbUuid) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<ClimbedRoute[]>(key);
      queryClient.setQueryData<ClimbedRoute[]>(key, (before ?? []).filter((r) => r.climb_uuid !== climbUuid));
      return { before };
    },
    onError: (_error, _climb, context) => queryClient.setQueryData(key, context?.before),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/** The row a save makes, as it'll come back from the server, to show before it has. */
function row(route: RouteRef, userId: string | undefined): SavedRoute {
  return {
    user_id: userId ?? '',
    climb_uuid: route.climbUuid,
    wall_uuid: route.wallUuid,
    name: route.name,
    grade: route.grade,
    wall_name: route.wallName,
    created_at: new Date().toISOString(),
  };
}
