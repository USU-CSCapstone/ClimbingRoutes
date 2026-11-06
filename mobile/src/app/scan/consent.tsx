import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { giveUploadConsent, startUpload } from '@/data/uploads';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';

const POINTS = [
  'Your photos go to the ClimbingRoutes team, who make them into the wall’s 3D model and then delete them.',
  'Where you stood is saved with each photo, so the team can find the wall.',
  'The finished model, with its routes drawn on, is shown to everyone in the app.',
  'Uploads wait for Wi-Fi unless you allow cellular on the Profile tab.',
];

/** /scan/consent?scan=<id>: shown once, before a phone's first upload (#45). */
export default function UploadConsentScreen() {
  const { scan } = useLocalSearchParams<{ scan: string }>();

  function agree() {
    giveUploadConsent();
    startUpload(scan);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Before you upload' }} />
      <ScrollView contentContainerStyle={styles.page}>
        <AppText type="heading">What happens to your photos</AppText>
        {POINTS.map((point) => (
          <View key={point} style={styles.point}>
            <AppText>•</AppText>
            <AppText style={styles.flex}>{point}</AppText>
          </View>
        ))}
        <View style={styles.actions}>
          <ActionButton icon="cloud-upload-outline" label="Agree and upload" onPress={agree} primary />
          <ActionButton label="Not now" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.three },
  point: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
});
