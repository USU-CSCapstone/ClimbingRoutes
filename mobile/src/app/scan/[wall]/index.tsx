import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router, Stack, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, SerifFont, Spacing, TapTarget } from '@/constants/theme';
import { useArea } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { Loading, Message } from '@/ui/components';
import { scanHref } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';

/**
 * /scan/<OpenBeta area uuid>: the start of the scan flow for one wall, opened
 * full screen from its "No 3D model yet" card. It asks how the photos will be
 * added: taken in the app, through the guide (#50) and the camera (#51), or
 * uploaded from photos already taken (#52). ?scan=<id> resumes an unfinished
 * scan once #44's scan storage exists.
 */
export default function ScanStartScreen() {
  const { wall, scan } = useLocalSearchParams<{ wall: string; scan?: string }>();
  const area = useArea(wall);
  const theme = useTheme();
  const web = Platform.OS === 'web';

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
        <AppText color="textSecondary">
          Photograph this wall, and the team will make it into a 3D model with its routes drawn on.
        </AppText>
        <AppText type="heading" style={styles.question}>
          How do you want to add the photos?
        </AppText>
        <LaneOption
          icon="camera-outline"
          title="Take photos in the app"
          detail={
            web
              ? 'Open the app on your phone to use the camera.'
              : 'The app guides you along the wall, one photo per step.'
          }
          disabled={web}
          onPress={() => router.push(scanHref(wall, 'guide'))}
        />
        <LaneOption
          icon="images-outline"
          title="Upload photos you took"
          detail={
            web ? 'Pick photos of the wall from your computer.' : "Pick photos of the wall from your phone's library."
          }
          onPress={() => router.push(scanHref(wall, 'upload'))}
        />
      </ScrollView>
    </>
  );
}

/** One way of adding the photos, as a row that opens that lane of the flow. */
function LaneOption({
  icon,
  title,
  detail,
  disabled,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      role="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.option,
        { borderColor: theme.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <View style={[styles.optionIcon, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name={icon} size={26} color={theme.text} />
      </View>
      <View style={styles.flex}>
        <AppText style={styles.optionTitle}>{title}</AppText>
        <AppText type="small" color="textSecondary">
          {detail}
        </AppText>
      </View>
      {disabled ? null : <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />}
    </Pressable>
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
  question: { marginTop: Spacing.two },
  option: {
    minHeight: TapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontWeight: '700' },
  flex: { flex: 1 },
  closeButton: { paddingHorizontal: Spacing.three },
  close: { fontWeight: '600' },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.5 },
});
