// What the moderator reviews: models the team PC made, waiting in the review
// bucket. Row-level security only shows them to the moderator account.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { WallModel } from '@/core/database';
import { type DrawnLine, modelUrl, type Vec3 } from '@/core/models';
import { supabase } from '@/data/supabase';

/** Models waiting for review, newest first. */
export function useReviewQueue() {
  return useQuery({
    queryKey: ['review-queue'],
    queryFn: async ({ signal }): Promise<WallModel[]> => {
      const { data, error } = await supabase
        .from('wall_models')
        .select()
        .eq('status', 'needs_review')
        .order('created_at', { ascending: false })
        .abortSignal(signal);
      if (error) throw new Error(`Couldn't load the review queue: ${error.message}`);
      return data;
    },
    // New models arrive whenever the team PC finishes one.
    staleTime: 30 * 1000,
  });
}

/** One model, in any status, for its review page. Null if it doesn't exist or this account can't see it. */
export function useWallModel(id: string) {
  return useQuery({
    queryKey: ['wall-model', id],
    queryFn: async ({ signal }): Promise<WallModel | null> => {
      const { data, error } = await supabase.from('wall_models').select().eq('id', id).abortSignal(signal).maybeSingle();
      if (error) throw new Error(`Couldn't load the model: ${error.message}`);
      return data;
    },
    staleTime: 0,
  });
}

/** Signed links to unpublished files last this long, longer than a review takes. */
const SIGNED_SECONDS = 60 * 60;

/**
 * Where to load the model's file from: a signed link into the private review
 * bucket while it waits, or its public URL once published. Null once rejected,
 * when the file is removed.
 */
export function useModelFileUrl(model: WallModel) {
  return useQuery({
    queryKey: ['model-file-url', model.id, model.status],
    queryFn: async (): Promise<string | null> => {
      if (model.status === 'published') return modelUrl(model.glb_path);
      if (model.status === 'rejected') return null;
      const { data, error } = await supabase.storage.from('review').createSignedUrl(model.glb_path, SIGNED_SECONDS);
      if (error) throw new Error(`Couldn't open the model file: ${error.message}`);
      return data.signedUrl;
    },
    // The viewer reloads whenever the URL changes, so keep the first link. It's only read when the
    // model loads; after an hour, retrying the load fetches a new one.
    staleTime: Infinity,
  });
}

/**
 * Saves one route's line on a model version, replacing any saved before. It
 * updates or inserts rather than upserting, because an upsert would also need
 * permission to change the row's model and route, which nobody has.
 */
export function useSaveRouteLine(modelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (line: DrawnLine) => {
      const values = { name: line.name, grade: line.grade, points: round(line.points), normals: round(line.normals) };
      const { data: existing, error: findError } = await supabase
        .from('route_lines')
        .select('id')
        .eq('wall_model_id', modelId)
        .eq('climb_uuid', line.climbUuid)
        .maybeSingle();
      if (findError) throw new Error(`Couldn't save the line: ${findError.message}`);
      const { error } = existing
        ? await supabase.from('route_lines').update(values).eq('id', existing.id)
        : await supabase.from('route_lines').insert({ wall_model_id: modelId, climb_uuid: line.climbUuid, ...values });
      if (error) throw new Error(`Couldn't save the line: ${error.message}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['route-lines', modelId] }),
  });
}

/** Deletes one route's saved line from a model version. */
export function useDeleteRouteLine(modelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (climbUuid: string) => {
      const { error } = await supabase.from('route_lines').delete().eq('wall_model_id', modelId).eq('climb_uuid', climbUuid);
      if (error) throw new Error(`Couldn't delete the line: ${error.message}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['route-lines', modelId] }),
  });
}

/** After a decision, everything that lists or shows models is out of date. */
function refreshModels(queryClient: ReturnType<typeof useQueryClient>, model: WallModel) {
  for (const queryKey of [
    ['review-queue'],
    ['wall-model', model.id],
    ['model-file-url', model.id],
    ['published-walls'],
    ['latest-model', model.wall_uuid],
  ]) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

/**
 * Publishes a model: copies its file from the private review bucket to the
 * public models bucket, then marks it published, which the database only
 * allows once the file is there. If publishing fails, the copy is removed, so
 * an unapproved file never stays public. The review copy goes last, to free
 * storage. The app shows the new version within a few minutes.
 */
export function useApproveModel(model: WallModel) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const copied = await supabase.storage
        .from('review')
        .copy(model.glb_path, model.glb_path, { destinationBucket: 'models' });
      // Already there from an approval that failed after copying: it's the same file.
      if (copied.error && !/exists/i.test(copied.error.message)) {
        throw new Error(`Couldn't copy the model to the public bucket: ${copied.error.message}`);
      }
      const { error } = await supabase.from('wall_models').update({ status: 'published' }).eq('id', model.id);
      if (error) {
        await supabase.storage.from('models').remove([model.glb_path]);
        throw new Error(`Couldn't publish the model: ${error.message}`);
      }
      await supabase.storage.from('review').remove([model.glb_path]);
    },
    onSettled: () => refreshModels(queryClient, model),
  });
}

/** Rejects a model with a note for the team, and removes its file from the review bucket. */
export function useRejectModel(model: WallModel) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (note: string) => {
      const { error } = await supabase
        .from('wall_models')
        .update({ status: 'rejected', review_note: note.trim() || null })
        .eq('id', model.id);
      if (error) throw new Error(`Couldn't reject the model: ${error.message}`);
      await supabase.storage.from('review').remove([model.glb_path]);
    },
    onSettled: () => refreshModels(queryClient, model),
  });
}

/** To 4 decimals, as the author tool saved them. */
function round(list: Vec3[]): Vec3[] {
  return list.map((v) => v.map((n) => Math.round(n * 1e4) / 1e4) as Vec3);
}
