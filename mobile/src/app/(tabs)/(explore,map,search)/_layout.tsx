import { Stack } from 'expo-router';

import { MAP_AREA } from '@/core/config';
import { useTheme } from '@/hooks/use-theme';

// Explore, Map and Search each get their own stack, sharing the area and climb pages.
export const unstable_settings = {
  explore: { anchor: 'explore' },
  map: { anchor: 'map' },
  search: { anchor: 'search' },
};

export default function SharedLayout({ segment }: { segment: string }) {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.text,
        headerBackButtonDisplayMode: 'minimal',
        headerTitleStyle: { fontWeight: '700' },
      }}>
      {segment === '(search)' ? (
        <Stack.Screen name="search" options={{ title: 'Search', headerShown: false }} />
      ) : segment === '(map)' ? (
        <Stack.Screen name="map" options={{ title: MAP_AREA.name }} />
      ) : (
        <Stack.Screen name="explore" options={{ title: 'Explore' }} />
      )}
    </Stack>
  );
}
