// What the moderator reviews: models the team PC made, waiting in the review
// bucket. Row-level security only shows them to the moderator account.
import { useQuery } from '@tanstack/react-query';

import type { WallModel } from '@/core/database';
import { modelUrl } from '@/core/models';
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
