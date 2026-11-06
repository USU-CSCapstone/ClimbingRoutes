import { Stack, useLocalSearchParams } from 'expo-router';

import type { ScanPlan } from '@/core/capture';
import { photoTarget, WALL_SIZES } from '@/core/scan-plan';
import { GuidedCamera } from '@/ui/scan/camera';
import { closeScan } from '@/ui/scan/controls';

/**
 * /scan/<wall>/camera?size=…: the guided camera (#51), opened from "Before you
 * start" (#50) with the wall's size, which goes into the scan.
 */
export default function CameraScreen() {
  const { wall, size } = useLocalSearchParams<{ wall: string; size?: string }>();
  const wallSize = WALL_SIZES.find((option) => option.size === size)?.size ?? 'medium';
  const plan: ScanPlan = { wallSize, target: photoTarget(wallSize) };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <GuidedCamera wallUuid={wall} plan={plan} onClose={closeScan} />
    </>
  );
}
