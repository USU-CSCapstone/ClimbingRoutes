import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { MIN_PHOTOS } from '@/core/scan-plan';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';

/**
 * /scan/<wall>/upload: the upload lane, for photos taken outside the app. It goes
 * straight to picking them, from the phone's library or the computer, which
 * comes with review in #52. How to take them is left to the photo tips on the
 * landing page, planned for a later milestone, so this only points there.
 */
export default function UploadScreen() {
  const theme = useTheme();
  const from = Platform.OS === 'web' ? 'your computer' : "your phone's photo library";

  return (
    <>
      <Stack.Screen options={{ title: 'Upload photos' }} />
      <ScrollView contentContainerStyle={styles.page}>
        <AppText>
          Choose the photos of this wall from {from}. You&apos;ll need at least {MIN_PHOTOS}.
        </AppText>
        <ActionButton label="Choose photos" icon="images-outline" primary disabled />
        <AppText type="small" color="textSecondary" style={styles.center}>
          Coming soon: picking photos is next.
        </AppText>
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
