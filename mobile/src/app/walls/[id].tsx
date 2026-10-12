import { router, Stack, useLocalSearchParams } from 'expo-router';

import { findWall } from '@/core/walls';
import { Message } from '@/ui/components';
import { WallView } from '@/ui/wall-view';

/** /walls/<id>?route=<uuid> opens the wall with that route selected. */
export default function WallScreen() {
  const { id, route } = useLocalSearchParams<{ id: string; route?: string }>();
  const wall = findWall(id);

  if (!wall) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Wall not found' }} />
        <Message title="Wall not found" detail="There's no 3D model for this wall yet." />
      </>
    );
  }
  return (
    <WallView
      wall={wall}
      selected={route || null}
      onSelect={(uuid) => router.setParams({ route: uuid ?? undefined })}
    />
  );
}
