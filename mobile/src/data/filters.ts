// The route filters, shared by every tab and kept on the device between launches.
// localStorage is the browser's on web and expo-sqlite's on iOS and Android.
import 'expo-sqlite/localStorage/install';

import { useSyncExternalStore } from 'react';

import { NO_FILTERS, type RouteFilters } from '@/core/filters';

const KEY = 'route-filters';

let current: RouteFilters = load();
const listeners = new Set<() => void>();

function load(): RouteFilters {
  try {
    const saved = localStorage.getItem(KEY);
    // Spread over the defaults so filters saved by an older version still load.
    return saved ? { ...NO_FILTERS, ...(JSON.parse(saved) as Partial<RouteFilters>) } : NO_FILTERS;
  } catch {
    return NO_FILTERS;
  }
}

export function setFilters(next: RouteFilters) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the filters still apply until the app closes.
  }
  for (const listener of listeners) listener();
}

export function clearFilters() {
  setFilters(NO_FILTERS);
}

export function useFilters(): RouteFilters {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
