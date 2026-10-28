// Small query results kept on the device, so a wall that has loaded once still
// opens with no signal. Uses localStorage: the browser's on web, and
// expo-sqlite's on iOS and Android. Model files are cached by the viewer instead
// (src/viewer/model-cache.ts), because they're too big for this.
import 'expo-sqlite/localStorage/install';

import type { QueryFunctionContext, QueryKey } from '@tanstack/react-query';

const PREFIX = 'query:';

/**
 * Query options that start from the copy saved on the device, refetch it
 * straight away, and save each new result. If the refetch fails, the saved
 * copy stays on screen.
 */
export function deviceCached<T>(queryKey: QueryKey, fetch: (context: QueryFunctionContext) => Promise<T>) {
  const key = PREFIX + JSON.stringify(queryKey);
  return {
    queryKey,
    queryFn: async (context: QueryFunctionContext) => {
      const value = await fetch(context);
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage full or unavailable: still show the result.
      }
      return value;
    },
    initialData: (): T | undefined => {
      try {
        const saved = localStorage.getItem(key);
        return saved == null ? undefined : (JSON.parse(saved) as T);
      } catch {
        return undefined;
      }
    },
    // The saved copy counts as old, so it's always refetched.
    initialDataUpdatedAt: 0,
  };
}
