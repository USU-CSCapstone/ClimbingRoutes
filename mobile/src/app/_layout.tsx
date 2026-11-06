import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { queryClient } from '@/data/queries';
import { useUploadQueue } from '@/data/uploads';

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <UploadQueue />
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* The scan flow covers the whole screen, tab bar included, and has its own Close button. */}
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Runs the scan upload queue for as long as the app is open, on every screen. */
function UploadQueue() {
  useUploadQueue();
  return null;
}
