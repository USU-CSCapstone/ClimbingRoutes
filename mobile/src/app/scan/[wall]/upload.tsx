import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { UNKNOWN_SIZE_MINIMUM } from '@/core/scan-plan';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton, scanHref } from '@/ui/scan/controls';
import { pickPhotos, skippedText } from '@/ui/scan/library';
import { AppText } from '@/ui/text';

/**
 * /scan/<wall>/upload: the upload lane, for photos taken outside the app. It goes
 * straight to picking them, from the phone's library or the computer, then on
 * to review (#52). How to take them is left to the photo tips on the landing
 * page, planned for a later milestone, so this only points there.
 */
export default function UploadScreen() {
  const { wall } = useLocalSearchParams<{ wall: string }>();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const from = Platform.OS === 'web' ? 'your computer' : "your phone's photo library";

  async function choose() {
    setBusy(true);
    setNote(null);
    try {
      const picked = await pickPhotos(wall, null);
      if (!picked) return;
      if (!picked.scan) {
        setNote(skippedText(picked.skipped));
        return;
      }
      // Replaced rather than pushed, so going back doesn't lead to a second scan.
      const params: Record<string, string> = { scan: picked.scan.id };
      if (picked.skipped) params.skipped = String(picked.skipped);
      router.replace(scanHref(wall, 'review', params));
    } catch (e) {
      setNote(`Couldn't add the photos: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Upload photos' }} />
      <ScrollView contentContainerStyle={styles.page}>
        <AppText>
          Choose the photos of this wall from {from}. You can pick them all at once, and you&apos;ll need at least{' '}
          {UNKNOWN_SIZE_MINIMUM}.
        </AppText>
        <ActionButton
          label={busy ? 'Adding photos…' : 'Choose photos'}
          icon="images-outline"
          primary
          disabled={busy}
          onPress={choose}
        />
        {note ? (
          <AppText type="small" color="danger" style={styles.center}>
            {note}
          </AppText>
        ) : null}
        <View style={[styles.tips, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.tipsHeading}>
            <Ionicons name="bulb-outline" size={22} color={theme.text} />
            <AppText type="heading">For the best model</AppText>
          </View>
          <AppText color="textSecondary">
            How the photos are taken makes a big difference to the model. Tips on taking them are coming soon to our
            website.
          </AppText>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  center: { textAlign: 'center' },
  tips: { gap: Spacing.two, padding: Spacing.three, borderRadius: 12, marginTop: Spacing.two },
  tipsHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
