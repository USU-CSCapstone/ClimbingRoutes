// What the moderator reviews: models the team PC made, waiting in the review
// bucket. Row-level security only shows them to the moderator account.
import { useQuery } from '@tanstack/react-query';

import type { WallModel } from '@/core/database';
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
