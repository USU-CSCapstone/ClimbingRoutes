import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { photoTarget, WALL_SIZES, type WallSize } from '@/core/scan-plan';
import { ActionButton, Choice, Question, scanHref } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';

/**
 * /scan/<wall>/prepare: the last question before the camera (#50). The wall's
 * size sets the photo target the camera (#51) counts towards.
 */
export default function PrepareScreen() {
  const { wall } = useLocalSearchParams<{ wall: string }>();
  const [size, setSize] = useState<WallSize | null>(null);

  return (
    <>
      <Stack.Screen options={{ title: 'Before you start' }} />
      <ScrollView contentContainerStyle={styles.page}>
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

        {size ? (
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
              onPress={() => router.push(scanHref(wall, 'camera', { size }))}
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
  target: { gap: Spacing.two },
  center: { textAlign: 'center' },
});
