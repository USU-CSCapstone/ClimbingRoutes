import { type Href, useSegments } from 'expo-router';

import type { Uuid } from '@/core/types';

/**
 * Area and climb pages are shared by the Explore and Search tabs. Links must
 * name the current tab's group so the page opens inside that tab's stack.
 */
export function useHrefs() {
  const segments = useSegments() as string[];
  const group = segments.includes('(search)') ? '(search)' : '(explore)';
  return {
    area: (uuid: Uuid) => `/(tabs)/${group}/area/${uuid}` as Href,
    climb: (uuid: Uuid) => `/(tabs)/${group}/climb/${uuid}` as Href,
  };
}
