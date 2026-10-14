import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { lazy, Suspense } from 'react';
import { Platform } from 'react-native';

import { Loading, Message } from '@/ui/components';

// Loaded on demand so three.js and the tool stay out of the app's main web bundle.
const AuthorTool = lazy(() => import('@/author/author-tool'));

/**
 * Route authoring for the team: drawing route lines on a wall's model and
 * saving them to data/routes/. Development only, in a desktop browser, with
 * scripts/viewer/serve.mjs running. ?model=<file>.glb picks the model.
 */
export default function AuthorScreen() {
  const { model } = useLocalSearchParams<{ model?: string }>();

  if (!__DEV__) return <Redirect href="/" />;
  if (Platform.OS !== 'web') {
    return (
      <Message
        title="Authoring runs in a desktop browser"
        detail="Press w in the Expo terminal, then open /author."
      />
    );
  }
  return (
    <>
      <Stack.Screen options={{ title: 'Route authoring' }} />
      <Suspense fallback={<Loading />}>
        <AuthorTool key={model} model={model ?? null} onModelChange={(file) => router.setParams({ model: file })} />
      </Suspense>
    </>
  );
}
