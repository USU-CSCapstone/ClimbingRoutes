import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { hasSeenGuide, markGuideSeen } from '@/data/scan-guide';
import { scanHref } from '@/ui/scan/controls';
import { GuideCards, GuideReminder } from '@/ui/scan/guide';

/**
 * /scan/<wall>/guide: the capture guide (#50), for photos taken in the app. The
 * full set of cards the first time on this device, then a one-screen reminder
 * that can open the full set.
 */
export default function GuideScreen() {
  const { wall } = useLocalSearchParams<{ wall: string }>();
  const [full, setFull] = useState(() => !hasSeenGuide());

  function next() {
    markGuideSeen();
    router.push(scanHref(wall, 'prepare'));
  }

  return (
    <>
      <Stack.Screen options={{ title: full ? 'How to scan' : 'Quick reminder' }} />
      {full ? <GuideCards onDone={next} /> : <GuideReminder onContinue={next} onShowAll={() => setFull(true)} />}
    </>
  );
}
