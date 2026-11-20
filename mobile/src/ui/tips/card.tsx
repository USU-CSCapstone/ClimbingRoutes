// What the photo tips cards share. Each card acts a tip out: a picture with the
// tip's words over its top, a control along its bottom, and a tick or a cross
// that follows what the control is set to.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Difficulty, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CLIP, Display, Fade, INK, NATIVE_DRIVER, useReduceMotion } from '@/ui/home/kit';
import { AppText } from '@/ui/text';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import { OnModel } from '@/ui/wall/parts';

/** The newest photo's frame: the blue the 3D view draws routes in. */
export const FRAME = Difficulty[1].line;
const RIGHT = Difficulty[0].bar;
export const WRONG = Difficulty[3].bar;
export const CARD_RADIUS = 28;

/** Whether what a card shows is the right way, the wrong way, or neither yet. */
export type MarkState = 'right' | 'wrong' | 'none';

/** The light tap a phone gives when a control changes. A phone that can't give one is left quiet. */
export function tick() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

/**
 * A dark picture card. `children` is the picture, which nothing in can be
 * pressed. The words sit on a shade over its top, and `control` is centered
 * along its bottom, beside the tick or cross.
 */
export function Shot({
  width,
  height,
  title,
  detail,
  mark,
  control,
  children,
  style,
}: {
  width: number;
  height: number;
  title: string;
  detail: string;
  mark: MarkState;
  control: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.shot, { width, height }, style]}>
      <View aria-hidden pointerEvents="none" style={StyleSheet.absoluteFill}>
        {children}
      </View>
      <View pointerEvents="none" style={styles.foot}>
        <Fade
          color={VIEWER_BACKGROUND}
          stops={[
            [0, 0],
            [1, 0.86],
          ]}
        />
      </View>
      <View pointerEvents="none" style={styles.top}>
        <Fade
          color={VIEWER_BACKGROUND}
          stops={[
            [0, 0.94],
            [0.52, 0.72],
            [1, 0],
          ]}
        />
        <Display style={styles.title}>{title}</Display>
        <AppText style={styles.detail}>{detail}</AppText>
      </View>
      <View pointerEvents="none" style={styles.markSpot}>
        <Mark state={mark} />
      </View>
      <View pointerEvents="box-none" style={styles.control}>
        {control}
      </View>
    </View>
  );
}

/** A green tick or a red cross in a circle, which pops a little each time it changes. */
export function Mark({ state }: { state: MarkState }) {
  const reduce = useReduceMotion();
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduce !== false) return;
    pop.setValue(0.6);
    const spring = Animated.spring(pop, { toValue: 1, speed: 26, bounciness: 10, useNativeDriver: NATIVE_DRIVER });
    spring.start();
    return () => spring.stop();
  }, [state, pop, reduce]);
  if (state === 'none') return null;
  const right = state === 'right';
  return (
    <Animated.View style={[styles.mark, { backgroundColor: right ? RIGHT : WRONG, transform: [{ scale: pop }] }]}>
      <Ionicons name={right ? 'checkmark' : 'close'} size={21} color="#FFFFFF" />
    </Animated.View>
  );
}

/** One choice in a `Seg`: either words, or a drawing given the color to draw in. */
export interface SegOption<T extends string> {
  value: T;
  /** What a screen reader calls it. */
  label: string;
  text?: string;
  glyph?: (color: string) => ReactNode;
}

/**
 * A pill of choices with one picked. On a picture it's dark glass with the
 * picked one in white; `plain` is for a card in the page's own colors.
 */
export function Seg<T extends string>({
  label,
  options,
  value,
  onChange,
  plain,
}: {
  label: string;
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
  plain?: boolean;
}) {
  const theme = useTheme();
  const picked = plain ? { fill: theme.accent, ink: theme.accentText } : { fill: '#FFFFFF', ink: INK };
  const rest = plain ? theme.text : OnModel.text;
  return (
    <View role="group" aria-label={label} style={[styles.seg, plain ? [styles.segPlain, { backgroundColor: theme.background }] : null]}>
      {options.map((option) => {
        const on = option.value === value;
        const color = on ? picked.ink : rest;
        return (
          <Pressable
            key={option.value}
            role="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.segButton, plain && styles.flex, on && { backgroundColor: picked.fill }, pressed && styles.pressed]}>
            {option.glyph ? option.glyph(color) : <AppText style={[styles.segText, { color }]}>{option.text ?? option.label}</AppText>}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Plays a card's short demo once, the first time the card is in view: each step
 * runs after its delay in milliseconds. It never starts once the card has been
 * used by hand, stops as soon as it is, and doesn't play at all when the phone
 * asks for less motion. Returns what to call when the card is used.
 */
export function useDemo(inView: boolean, steps: [number, () => void][]): () => void {
  const reduce = useReduceMotion();
  const state = useRef({ played: false, used: false, timers: [] as ReturnType<typeof setTimeout>[] });
  const latest = useRef(steps);
  useEffect(() => {
    latest.current = steps;
  });
  useEffect(() => {
    const now = state.current;
    if (!inView || now.played || now.used || reduce !== false) return;
    now.played = true;
    // Not cleared when the card leaves view, or a card swiped away mid-demo would be left showing the wrong way.
    now.timers = latest.current.map(([delay], i) =>
      setTimeout(() => {
        if (!now.used) latest.current[i][1]();
      }, delay),
    );
  }, [inView, reduce]);
  useEffect(() => {
    const now = state.current;
    return () => now.timers.forEach(clearTimeout);
  }, []);
  return () => {
    state.current.used = true;
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shot: { borderRadius: CARD_RADIUS, overflow: CLIP, backgroundColor: VIEWER_BACKGROUND },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 54 },
  title: { color: OnModel.text, fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
  detail: { color: OnModel.muted, fontSize: 15, lineHeight: 20, marginTop: Spacing.one },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
  markSpot: { position: 'absolute', left: Spacing.three, bottom: 22 },
  mark: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  control: { position: 'absolute', left: 0, right: 0, bottom: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', gap: Spacing.half, padding: Spacing.one, borderRadius: 999, backgroundColor: OnModel.background },
  segPlain: { alignSelf: 'stretch' },
  segButton: { minWidth: 54, height: 40, paddingHorizontal: 14, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
