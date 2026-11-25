// The signed-in account's uploaded captures and where each one is, from the
// server's captures table. The upload queue refreshes this when a scan finishes.
import { useQuery } from '@tanstack/react-query';

import type { Capture } from '@/core/database';
import { decidingModel, type ScanModel, scanStage, type ScanStage } from '@/core/scan-progress';
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

/** An uploaded scan and how far it has got: on its way, published, or not used and why. */
export interface MyScan {
  capture: Capture;
  stage: ScanStage;
}

/** More than anyone has sent, so the count of published walls is the true one. */
const MOST_SCANS = 200;

/**
 * This account's uploaded scans, newest first, each with what became of it.
 * The capture alone can't say: it stays `processed` whether the model made
 * from it was published or rejected, so the models made from these captures
 * are read too. An account can read its own captures' models in any status.
 */
export function useMyScans(userId: string | undefined) {
  return useQuery({
    // Starts like useMyCaptures' key, so whatever refreshes that refreshes this.
    queryKey: ['my-captures', userId, 'with-models'],
    queryFn: async ({ signal }): Promise<MyScan[]> => {
      const captures = await supabase
        .from('captures')
        .select()
        .eq('captured_by', userId!)
        .neq('status', 'uploading')
        .order('created_at', { ascending: false })
        .limit(MOST_SCANS)
        .abortSignal(signal);
      if (captures.error) throw new Error(`Couldn't load your scans: ${captures.error.message}`);
      if (!captures.data.length) return [];

      const models = await supabase
        .from('wall_models')
        .select('source_capture, status, review_note, version')
        .in('source_capture', captures.data.map((c) => c.id))
        .abortSignal(signal);
      if (models.error) throw new Error(`Couldn't load your scans: ${models.error.message}`);

      const byCapture = new Map<string, ScanModel[]>();
      for (const model of models.data) {
        if (!model.source_capture) continue;
        byCapture.set(model.source_capture, [...(byCapture.get(model.source_capture) ?? []), model]);
      }
      return captures.data.map((capture) => ({
        capture,
        stage: scanStage(capture, decidingModel(byCapture.get(capture.id) ?? [])),
      }));
    },
    enabled: userId != null,
    // Statuses change as the team works through them.
    staleTime: 60 * 1000,
  });
}
