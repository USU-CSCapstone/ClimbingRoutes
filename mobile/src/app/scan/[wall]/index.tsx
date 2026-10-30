import { type Href, router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, SerifFont, Spacing, TapTarget } from '@/constants/theme';
import { useArea } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { Loading, Message } from '@/ui/components';
import { AppText } from '@/ui/text';

const STEPS = [
  'A short guide to taking the photos',
  'Walk along the wall, taking about 30 photos',
  'Look through them, then upload on Wi-Fi',
  'The team makes the 3D model and draws the routes on it',
];

/**
 * /scan/<OpenBeta area uuid>: the start of the scan flow for one wall, opened
 * full screen from its "No 3D model yet" card. ?scan=<id> resumes an unfinished
 * scan once #44's scan storage exists. The guide (#50) starts from here.
 */
export default function ScanStartScreen() {
  const { wall, scan } = useLocalSearchParams<{ wall: string; scan?: string }>();
  const area = useArea(wall);
  const theme = useTheme();

  const close = () =>
    router.canGoBack() ? router.back() : router.replace(`/(tabs)/(explore)/area/${wall}` as Href);
  const header = (
    <Stack.Screen
      options={{
        title: scan ? 'Resume scan' : 'Scan this wall',
        headerLeft: () => (
          <Pressable
            role="button"
            onPress={close}
            hitSlop={12}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <AppText style={[styles.close, { color: theme.accent }]}>Close</AppText>
          </Pressable>
        ),
      }}
    />
  );

  let gate = null;
  if (area.isPending) gate = <Loading />;
  else if (area.error) gate = <Message title="Couldn't load this wall" detail={area.error.message} />;
  else if (!area.data) gate = <Message title="Wall not found" />;
  else if (!area.data.isLeaf) gate = <Message title="Pick a wall to scan" detail="A scan covers one wall, not a whole area." />;
  if (gate || !area.data) {
    return (
      <>
        {header}
        {gate}
      </>
    );
  }

  return (
    <>
      {header}
      <ScrollView contentContainerStyle={styles.page}>
        <AppText style={[styles.wallName, { fontFamily: SerifFont }]}>{area.data.name}</AppText>
        <AppText color="textSecondary">How scanning works:</AppText>
        {STEPS.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.backgroundElement }]}>
              <AppText style={styles.stepNumberText}>{i + 1}</AppText>
            </View>
            <AppText style={styles.flex}>{step}</AppText>
          </View>
        ))}
        <Pressable
          role="button"
          disabled
          style={[styles.start, { backgroundColor: theme.accent }, styles.disabled]}>
          <AppText style={[styles.startText, { color: theme.accentText }]}>Start</AppText>
        </Pressable>
        <AppText type="small" color="textSecondary" style={styles.center}>
          Coming soon: the guide and camera are next.
        </AppText>
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
  wallName: { fontSize: 30, lineHeight: 36 },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontWeight: '700' },
  flex: { flex: 1 },
  start: {
    minHeight: TapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginTop: Spacing.two,
  },
  startText: { fontWeight: '700' },
  disabled: { opacity: 0.5 },
  center: { textAlign: 'center' },
  closeButton: { paddingHorizontal: Spacing.three },
  close: { fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
