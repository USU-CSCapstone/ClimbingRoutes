// The signed-in account's uploaded captures and where each one is, from the
// server's captures table. The upload queue refreshes this when a scan finishes.
import { useQuery } from '@tanstack/react-query';

import type { Capture } from '@/core/database';
import { supabase } from '@/data/supabase';

/** The latest captures this account uploaded, newest first. */
export function useMyCaptures(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-captures', userId],
    queryFn: async ({ signal }): Promise<Capture[]> => {
      // The moderator can read everyone's, so ask for this account's explicitly.
      const { data, error } = await supabase
        .from('captures')
        .select()
        .eq('captured_by', userId!)
        .neq('status', 'uploading')
        .order('created_at', { ascending: false })
        .limit(20)
        .abortSignal(signal);
      if (error) throw new Error(`Couldn't load your scans: ${error.message}`);
      return data;
    },
    enabled: userId != null,
    // Statuses change as the team works through them.
    staleTime: 60 * 1000,
  });
}
