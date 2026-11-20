import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

import type { LatLng } from '@/core/types';
import { useFilters } from '@/data/filters';

/**
 * The user's location, asked for only while the distance filter is on. Shared
 * by every tab and refreshed every few minutes.
 */
export function useUserLocation() {
  const wanted = useFilters().withinMiles != null;
  const query = useQuery({
    queryKey: ['userLocation'],
    queryFn: getLocation,
    enabled: wanted,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return {
    location: wanted ? (query.data ?? null) : null,
    /** Why distance can't be used, when it's on but there's no location. */
    problem: wanted && query.error ? query.error.message : null,
    loading: wanted && query.isPending,
  };
}

async function getLocation(): Promise<LatLng> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) throw new Error('Location is off for this app, so distance is ignored.');
  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}
