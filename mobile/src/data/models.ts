// Published wall models and their route lines, from Supabase. Each query asks
// for published rows explicitly: the moderator can read unpublished ones too,
// but the guide pages show everyone the same thing.
import { useQuery } from '@tanstack/react-query';

import { type DrawnLine, type PublishedModel, vec3List } from '@/core/models';
import type { Uuid } from '@/core/types';
import { deviceCached } from '@/data/device-cache';
import { supabase } from '@/data/supabase';

/** New versions and redrawn lines show up within this long. */
const MODELS_STALE_MS = 5 * 60 * 1000;

/** Walls with at least one published model, for the map and the "View in 3D" links. */
export function usePublishedWalls() {
  return useQuery({
    ...deviceCached(['published-walls'], async ({ signal }) => {
      const { data, error } = await supabase
        .from('wall_models')
        .select('wall_uuid')
        .eq('status', 'published')
        .abortSignal(signal);
      if (error) throw new Error(`Couldn't load the 3D walls: ${error.message}`);
      return [...new Set(data.map((m) => m.wall_uuid))];
    }),
    select: (uuids: Uuid[]) => new Set(uuids),
    staleTime: MODELS_STALE_MS,
  });
}

/** True once the wall is known to have a published model. */
export function useHasModel(wallUuid: Uuid | undefined): boolean {
  const { data } = usePublishedWalls();
  return wallUuid != null && (data?.has(wallUuid) ?? false);
}

/** The wall's newest published model, or null if it has none. Not asked for while `enabled` is false. */
export function useLatestModel(wallUuid: Uuid, enabled = true) {
  return useQuery({
    ...deviceCached(['latest-model', wallUuid], async ({ signal }): Promise<PublishedModel | null> => {
      const { data, error } = await supabase
        .from('wall_models')
        .select('id, wall_uuid, version, glb_path, bytes')
        .eq('wall_uuid', wallUuid)
        .eq('status', 'published')
        .order('version', { ascending: false })
        .limit(1)
        .abortSignal(signal)
        .maybeSingle();
      if (error) throw new Error(`Couldn't look up the wall's 3D model: ${error.message}`);
      return data && { id: data.id, wallUuid: data.wall_uuid, version: data.version, glbPath: data.glb_path, bytes: data.bytes };
    }),
    enabled,
    staleTime: MODELS_STALE_MS,
  });
}

/** The route lines drawn on one model version. */
export function useRouteLines(modelId: string | undefined) {
  return useQuery({
    ...deviceCached(['route-lines', modelId], async ({ signal }): Promise<DrawnLine[]> => {
      const { data, error } = await supabase
        .from('route_lines')
        .select('climb_uuid, name, grade, points, normals')
        .eq('wall_model_id', modelId!)
        .abortSignal(signal);
      if (error) throw new Error(`Couldn't load the route lines: ${error.message}`);
      return data.flatMap((r) => {
        const points = vec3List(r.points);
        const normals = vec3List(r.normals);
        // The database checks the lengths match; a malformed line is skipped rather than breaking the wall.
        if (!points || !normals || points.length !== normals.length) return [];
        return [{ climbUuid: r.climb_uuid, name: r.name, grade: r.grade, points, normals }];
      });
    }),
    enabled: modelId != null,
    staleTime: MODELS_STALE_MS,
  });
}
