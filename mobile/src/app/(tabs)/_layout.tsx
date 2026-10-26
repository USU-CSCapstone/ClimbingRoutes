import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontWeight: '600' },
      }}>
      <Tabs.Screen name="(explore)" options={{ title: 'Explore', tabBarIcon: tabIcon('compass') }} />
      <Tabs.Screen name="(map)" options={{ title: 'Map', tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen name="(search)" options={{ title: 'Search', tabBarIcon: tabIcon('search') }} />
      {/* Saved comes after v1. */}
      <Tabs.Screen name="saved" options={{ title: 'Saved', href: null }} />
    </Tabs>
  );
}

/** The tint colors above are strings, but tabs pass any ColorValue, which icons don't all take. */
function tabIcon(name: ComponentProps<typeof Ionicons>['name']) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />;
  };
}
