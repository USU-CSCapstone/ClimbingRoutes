import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SerifFont, Spacing } from '@/constants/theme';
import type { Uuid } from '@/core/types';
import type { Wall } from '@/core/walls';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/text';
import { FactChips, GradeSpread, RoundButton, RouteList } from '@/ui/wall/parts';
import type { ShownRoute } from '@/ui/wall/types';

const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Every route on the wall, in a sheet that slides up over the model. Drag
 * the top of the sheet down, tap the model above it, or pick a route to
 * close it.
 */
export function RoutesSheet({
  wall,
  place,
  facts,
  routes,
  selected,
  linesKnown,
  onSelect,
  onClose,
}: {
  wall: Wall;
  place: string | null;
  facts: string[];
  routes: ShownRoute[];
  selected: Uuid | null;
  linesKnown: boolean;
  onSelect: (uuid: Uuid) => void;
  /** Called once the sheet has slid away. */
  onClose: () => void;
}) {
  const theme = useTheme();
  const safe = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * 0.8);
  const [offset] = useState(() => new Animated.Value(sheetHeight));
  const latest = useRef({ sheetHeight, onClose });
  useEffect(() => {
    latest.current = { sheetHeight, onClose };
  });

  const [dismiss] = useState(() => () => {
    Animated.timing(offset, {
      toValue: latest.current.sheetHeight,
      duration: 180,
      useNativeDriver: NATIVE_DRIVER,
    }).start(() => latest.current.onClose());
  });
  const [pan] = useState(() => {
    const settle = () =>
      Animated.spring(offset, { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: NATIVE_DRIVER }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => offset.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => (g.dy > 110 || g.vy > 0.8 ? dismiss() : settle()),
      onPanResponderTerminate: settle,
    });
  });

  useEffect(() => {
    Animated.spring(offset, { toValue: 0, bounciness: 0, speed: 16, useNativeDriver: NATIVE_DRIVER }).start();
  }, [offset]);

  const fade = offset.interpolate({ inputRange: [0, sheetHeight], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
        <Pressable accessibilityLabel="Close all routes" style={styles.fill} onPress={dismiss} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { height: sheetHeight, backgroundColor: theme.background, transform: [{ translateY: offset }] },
        ]}>
        <View {...pan.panHandlers} style={styles.top}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <View style={styles.heading}>
            <View style={styles.fill}>
              {place ? (
                <AppText type="small" color="textSecondary">
                  {place}
                </AppText>
              ) : null}
              <AppText style={[styles.title, { fontFamily: SerifFont }]}>{wall.name}</AppText>
            </View>
            <RoundButton icon="close" label="Close all routes" onPress={dismiss} />
          </View>
          <FactChips facts={facts} />
          <GradeSpread routes={routes} />
        </View>
        <RouteList
          routes={routes}
          selected={selected}
          linesKnown={linesKnown}
          onPress={(uuid) => {
            onSelect(uuid);
            dismiss();
          }}
          contentContainerStyle={{ paddingBottom: safe.bottom + Spacing.four }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  passThrough: { pointerEvents: 'box-none' },
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  fill: { flex: 1 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  top: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.three },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: Spacing.two },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { fontSize: 30, lineHeight: 36 },
});
