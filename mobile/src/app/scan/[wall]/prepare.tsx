import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { photoTarget, WALL_SIZES, type WallSize } from '@/core/scan-plan';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton, Choice, closeScan, Question, scanHref } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';

/**
 * /scan/<wall>/prepare: the last checks before the camera (#50). The sun check
 * suggests coming back in shade but lets the climber carry on, and the wall's
 * size sets the photo target the camera (#51) counts towards.
 */
export default function PrepareScreen() {
  const { wall } = useLocalSearchParams<{ wall: string }>();
  const theme = useTheme();
  const [sun, setSun] = useState<'sunny' | 'shade' | null>(null);
  const [scanInSun, setScanInSun] = useState(false);
  const [size, setSize] = useState<WallSize | null>(null);
  const sunAnswered = sun === 'shade' || (sun === 'sunny' && scanInSun);

  return (
    <>
      <Stack.Screen options={{ title: 'Before you start' }} />
      <ScrollView contentContainerStyle={styles.page}>
        <Question title="Is the wall in direct sun?">
          <Choice
            label="Yes, it's in the sun"
            icon="sunny-outline"
            selected={sun === 'sunny'}
            onPress={() => {
              setSun('sunny');
              setScanInSun(false);
            }}
          />
          <Choice label="No, it's in shade" icon="cloud-outline" selected={sun === 'shade'} onPress={() => setSun('shade')} />
        </Question>

        {sun === 'sunny' && !scanInSun ? (
          <View style={[styles.note, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.noteHeading}>
              <Ionicons name="partly-sunny-outline" size={22} color={theme.text} />
              <AppText type="heading">Shade works better</AppText>
            </View>
            <AppText color="textSecondary">
              Hard shadows get baked into the model. If you can, come back when the wall is in shade or the sky is
              overcast.
            </AppText>
            <ActionButton label="Come back later" onPress={closeScan} />
            <ActionButton label="Scan anyway" onPress={() => setScanInSun(true)} primary />
          </View>
        ) : null}

        {sunAnswered ? (
          <Question title="How big is the wall?">
            {WALL_SIZES.map((option) => (
              <Choice
                key={option.size}
                label={option.label}
                detail={option.detail}
                selected={size === option.size}
                onPress={() => setSize(option.size)}
              />
            ))}
          </Question>
        ) : null}

        {sunAnswered && size ? (
          <View style={styles.target}>
            <AppText type="title" style={styles.center}>
              Aim for about {photoTarget(size)} photos
            </AppText>
            <AppText color="textSecondary" style={styles.center}>
              One photo per step, from a step before one end of the wall to a step past the other.
            </AppText>
            <ActionButton
              label="Open the camera"
              icon="camera-outline"
              primary
              onPress={() => router.push(scanHref(wall, 'camera', { size, sun: sun === 'sunny' ? 'sunny' : 'shade' }))}
            />
          </View>
        ) : null}
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
    gap: Spacing.four,
  },
  note: { gap: Spacing.two, padding: Spacing.three, borderRadius: 12 },
  noteHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  target: { gap: Spacing.two },
  center: { textAlign: 'center' },
});
