import { Stack, useLocalSearchParams } from 'expo-router';

import { findWall } from '@/core/walls';
import { Message } from '@/ui/components';
import { WallView } from '@/ui/wall-view';

export default function WallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wall = findWall(id);

  if (!wall) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Wall not found' }} />
        <Message title="Wall not found" detail="There's no 3D model for this wall yet." />
      </>
    );
  }
  return <WallView wall={wall} />;
}
