import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { deletePhoto, readScan } from '@/data/scans';
import { useTheme } from '@/hooks/use-theme';
import { Message } from '@/ui/components';
import { closeScan, scanHref } from '@/ui/scan/controls';
import { pickPhotos, skippedText } from '@/ui/scan/library';
import { ScanReview } from '@/ui/scan/review';
import { AppText } from '@/ui/text';

/**
 * /scan/<wall>/review?scan=<id>: review (#52), where the camera's Done and the
 * upload lane's picker both lead. More photos come from where the scan's came
 * from: the camera for the camera lane, the picker for the upload lane, so a
 * scan never mixes the two. ?skipped=<n> says how many picked files were left out.
 */
export default function ReviewScreen() {
  const { wall, scan: id, skipped } = useLocalSearchParams<{ wall: string; scan: string; skipped?: string }>();
  const theme = useTheme();
  const [scan, setScan] = useState(() => readScan(id));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(() => (skipped ? skippedText(Number(skipped)) : null));

  // The camera and picker screens before this one were replaced by it, so back
  // would skip to an earlier step. Close leaves the flow, with the photos kept.
  const header = (
    <Stack.Screen
      options={{
        title: 'Review photos',
        headerBackVisible: false,
        gestureEnabled: false,
        headerLeft: () => (
          <Pressable
            role="button"
            onPress={closeScan}
            hitSlop={12}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <AppText style={[styles.close, { color: theme.accent }]}>Close</AppText>
          </Pressable>
        ),
      }}
    />
  );

  if (!scan) {
    return (
      <>
        {header}
        <Message
          title="This scan isn't here anymore"
          detail={Platform.OS === 'web' ? 'Photos picked on the web are only kept while the page is open.' : undefined}
        />
      </>
    );
  }

  async function addMore() {
    setBusy(true);
    setNote(null);
    try {
      const picked = await pickPhotos(wall, scan);
      if (!picked) return;
      if (picked.scan) setScan(picked.scan);
      if (picked.skipped) setNote(skippedText(picked.skipped));
    } catch (e) {
      setNote(`Couldn't add the photos: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const more =
    scan.source === 'camera'
      ? {
          label: 'Take more',
          icon: 'camera-outline' as const,
          onPress: () => router.replace(scanHref(wall, 'camera', { scan: scan.id })),
        }
      : { label: busy ? 'Adding…' : 'Add more', icon: 'images-outline' as const, onPress: addMore, busy };

  return (
    <>
      {header}
      <ScanReview
        scan={scan}
        note={note}
        more={more}
        onDelete={(photo) => setScan(deletePhoto(scan, photo))}
        onUpload={() =>
          setNote(
            `Coming soon: sending the photos to the team is next. Until then they're kept ${
              Platform.OS === 'web' ? 'in this page' : 'on this phone'
            }.`,
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  closeButton: { paddingHorizontal: Spacing.three },
  close: { fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
