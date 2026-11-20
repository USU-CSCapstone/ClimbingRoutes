// The two tips to settle before the walk along the wall: the light, and how
// many photos. The page shows them second, under "Keep in mind". With
// at-wall.tsx these are the capture checklist (docs/capture-checklist.md) for
// photos taken outside the app, so change that too.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { UNKNOWN_SIZE_MINIMUM, WALL_SIZES, type WallSize } from '@/core/scan-plan';
import { useTheme } from '@/hooks/use-theme';
import { Display, EASE_OUT, NATIVE_DRIVER, useReduceMotion } from '@/ui/home/kit';
import { AppText } from '@/ui/text';
import { WallCut } from '@/ui/tips/art';
import { CARD_RADIUS, Seg, type SegOption, Shot, tick, useDemo } from '@/ui/tips/card';

type Light = 'cloud' | 'sun';
const LIGHTS: SegOption<Light>[] = [
  { value: 'cloud', label: 'Cloud', glyph: (color) => <Ionicons name="cloud-outline" size={22} color={color} /> },
  { value: 'sun', label: 'Sun', glyph: (color) => <Ionicons name="sunny-outline" size={22} color={color} /> },
];

/**
 * The same rock in two lights. Cloud is even; the sun brightens it and sweeps a
 * hard shadow across it from the right. `inView` is true once the card has
 * been scrolled to, which is when it plays its demo.
 */
export function ShadeCard({ width, height = 280, inView }: { width: number; height?: number; inView: boolean }) {
  const reduce = useReduceMotion();
  const [light, setLight] = useState<Light>('cloud');
  const [sun] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const turn = Animated.timing(sun, {
      toValue: light === 'sun' ? 1 : 0,
      duration: reduce ? 0 : 900,
      easing: EASE_OUT,
      useNativeDriver: NATIVE_DRIVER,
    });
    turn.start();
    return () => turn.stop();
  }, [light, sun, reduce]);
  const used = useDemo(inView, [
    [450, () => setLight('sun')],
    [2250, () => setLight('cloud')],
  ]);
  return (
    <Shot
      width={width}
      height={height}
      title="Pick shade or cloud"
      detail="Overcast is best, or wait for full shade. Hard shadows end up in the model."
      mark={light === 'cloud' ? 'right' : 'wrong'}
      control={
        <Seg
          label="Light on the wall"
          options={LIGHTS}
          value={light}
          onChange={(next) => {
            used();
            tick();
            setLight(next);
          }}
        />
      }>
      <WallCut width={width} height={height} picWidth={Math.max(720, width * 1.9)} focusX={0.38} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.sunlight, { opacity: sun.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] }) }]} />
      {/* The shadow waits off the card's right edge. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateX: sun.interpolate({ inputRange: [0, 1], outputRange: [width * 0.8, 0] }) }] }]}>
        <Svg width={width} height={height}>
          <Path d={`M${width * 0.64} 0H${width}V${height}H${width * 0.26}z`} fill="#060A16" fillOpacity={0.76} />
        </Svg>
      </Animated.View>
    </Shot>
  );
}

/**
 * Each wall size in a few words. The scan flow's own wording is longer, for
 * picking one, and in meters: these are its 10 m and 20 m, rounded to feet.
 */
const SIZE_NOTE: Record<WallSize, string> = {
  small: 'up to 30 ft wide',
  medium: '30 to 65 ft wide',
  large: 'wider, or very tall',
};
const SIZES: SegOption<WallSize>[] = WALL_SIZES.map((size) => ({ value: size.size, label: size.label }));
/** One tick per photo of the biggest wall's count. */
const TICKS = Array.from({ length: Math.max(...WALL_SIZES.map((size) => size.photos)) }, (_, i) => i);
const START: WallSize = 'medium';

/**
 * How many photos a wall of each size needs: the count runs to the size
 * picked, and a tick per photo fills in, with the fewest an upload takes in
 * the accent color.
 */
export function CountCard() {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [size, setSize] = useState<WallSize>(START);
  const picked = WALL_SIZES.find((s) => s.size === size) ?? WALL_SIZES[1];
  const [count] = useState(() => new Animated.Value(picked.photos));
  useEffect(() => {
    const run = Animated.timing(count, { toValue: picked.photos, duration: reduce ? 0 : 420, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER });
    run.start();
    return () => run.stop();
  }, [count, picked.photos, reduce]);
  return (
    <View style={[styles.count, { backgroundColor: theme.backgroundElement }]}>
      <Display style={styles.title}>Plan how many photos</Display>
      <AppText color="textSecondary" style={styles.detail}>
        {`An upload needs at least ${UNKNOWN_SIZE_MINIMUM}. More never hurts.`}
      </AppText>
      <View style={styles.row}>
        <Running count={count} start={picked.photos} />
        <View style={styles.size}>
          <AppText style={styles.sizeName}>{picked.label}</AppText>
          <AppText color="textSecondary" style={styles.sizeNote}>
            {SIZE_NOTE[size]}
          </AppText>
        </View>
      </View>
      <View aria-hidden style={styles.ticks}>
        {TICKS.map((i) => {
          const needed = i < UNKNOWN_SIZE_MINIMUM;
          // 0 until the count reaches this photo, then 1.
          const on = count.interpolate({ inputRange: [i, i + 1], outputRange: [0, 1], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={i}
              style={[
                styles.tick,
                {
                  backgroundColor: needed ? theme.accent : theme.text,
                  opacity: on.interpolate({ inputRange: [0, 1], outputRange: [0.16, needed ? 1 : 0.8] }),
                  transform: [{ scaleY: on.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }],
                },
              ]}
            />
          );
        })}
      </View>
      <Seg
        plain
        label="Wall size"
        options={SIZES}
        value={size}
        onChange={(next) => {
          tick();
          setSize(next);
        }}
      />
    </View>
  );
}

/** The count as a number that runs up or down to where it's going. */
function Running({ count, start }: { count: Animated.Value; start: number }) {
  const [shown, setShown] = useState(start);
  useEffect(() => {
    const id = count.addListener(({ value }) => setShown(Math.round(value)));
    return () => count.removeListener(id);
  }, [count]);
  return <Display style={styles.number}>{String(shown)}</Display>;
}

const styles = StyleSheet.create({
  sunlight: { backgroundColor: '#FFF4D6' },
  count: { borderRadius: CARD_RADIUS, paddingHorizontal: 18, paddingTop: 18, paddingBottom: Spacing.three },
  title: { fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
  detail: { fontSize: 15, lineHeight: 20, marginTop: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.three - Spacing.one, marginTop: Spacing.three - Spacing.half },
  number: { fontSize: 64, lineHeight: 64, letterSpacing: -3, fontVariant: ['tabular-nums'] },
  size: { alignItems: 'flex-end', paddingBottom: 6 },
  sizeName: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  sizeNote: { fontSize: 14, lineHeight: 18 },
  ticks: { flexDirection: 'row', gap: 2, height: 30, marginTop: Spacing.three - Spacing.half, marginBottom: Spacing.three - Spacing.half },
  tick: { flex: 1, borderRadius: 2, transformOrigin: 'bottom' },
});
