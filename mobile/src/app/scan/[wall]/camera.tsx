import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import type { ScanPlan } from '@/core/capture';
import { photoTarget, WALL_SIZES } from '@/core/scan-plan';
import { readScan } from '@/data/scans';
import { Message } from '@/ui/components';
import { GuidedCamera } from '@/ui/scan/camera';
import { closeScan, scanHref } from '@/ui/scan/controls';

/**
 * /scan/<wall>/camera?size=…: the guided camera (#51), opened from "Before you
 * start" (#50) with the wall's size, which goes into the scan. ?scan=<id> carries
 * on with a scan instead, for review's "Take more" (#52). Done replaces it with
 * review, which comes back here the same way.
 */
export default function CameraScreen() {
  const { wall, size, scan: scanId } = useLocalSearchParams<{ wall: string; size?: string; scan?: string }>();
  const [existing] = useState(() => (scanId ? readScan(scanId) : null));

  if (scanId && !existing) {
    return (
      <>
        <Stack.Screen options={{ title: 'Camera' }} />
        <Message title="This scan isn't here anymore" />
      </>
    );
  }

  const wallSize = WALL_SIZES.find((option) => option.size === size)?.size ?? 'medium';
  const plan: ScanPlan = existing?.plan ?? { wallSize, target: photoTarget(wallSize) };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <GuidedCamera
        wallUuid={wall}
        plan={plan}
        initial={existing}
        onClose={closeScan}
        onDone={(scan) => router.replace(scanHref(wall, 'review', { scan: scan.id }))}
      />
    </>
  );
}
