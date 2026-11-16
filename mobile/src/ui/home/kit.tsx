// Small pieces Home's sections share: how things move, and a few shapes.
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { type ReactNode, useEffect, useId, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AppText, type AppTextProps } from '@/ui/text';

/** The web has no native animation driver. */
export const NATIVE_DRIVER = Platform.OS !== 'web';
/** Quick to start, slow to settle. */
export const EASE_OUT = Easing.bezier(0.2, 0.7, 0.2, 1);
/**
 * `hidden` on phones. On the web a hidden box can still be scrolled, and the browser
 * does that to show whatever takes focus inside it, which slides a picture sideways.
 */
export const CLIP = (Platform.OS === 'web' ? 'clip' : 'hidden') as 'hidden';
/** Keeps a mouse click on the web from focusing what it clicks, which would scroll the page to it. Spread onto a pressable. */
export const NO_CLICK_FOCUS: object | null =
  Platform.OS === 'web' ? { onMouseDown: (e: { preventDefault(): void }) => e.preventDefault() } : null;
/** Text on a route's own color. */
export const INK = '#0B0C0E';

/** Whether the phone asks for less motion. Null until the phone has answered. */
export function useReduceMotion(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => live && setReduce(on));
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      listener.remove();
    };
  }, []);
  return reduce;
}

/** Fades and lifts something into place once, when the page first shows. */
export function useRise(delay: number, distance = 18) {
  const reduce = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce == null) return;
    if (reduce) return progress.setValue(1);
    const rise = Animated.timing(progress, { toValue: 1, duration: 520, delay, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER });
    rise.start();
    return () => rise.stop();
  }, [progress, delay, reduce]);
  return {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A pressable that gives a little under the finger. */
export function Pressy({
  style,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const [scale] = useState(() => new Animated.Value(1));
  const settle = (toValue: number) =>
    Animated.spring(scale, { toValue, speed: 40, bounciness: 4, useNativeDriver: NATIVE_DRIVER }).start();
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        settle(0.965);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        settle(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}>
      {children}
    </AnimatedPressable>
  );
}

/** A round arrow that says "this opens". */
export function GoCircle({ size, background, color }: { size: number; background: string; color: string }) {
  return (
    <View style={[styles.go, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}>
      <Ionicons name="arrow-forward" size={Math.round(size * 0.5)} color={color} style={styles.upRight} />
    </View>
  );
}

/**
 * Home's title and headings, in Inter ExtraBold, which ships with the app so they
 * look the same on every phone and browser. The system fonts don't all have a
 * weight this heavy: Windows and Android jump to their blackest cut instead.
 * Until the font has loaded, and if it can't, this falls back to the system's bold.
 */
export function Display({ style, ...rest }: AppTextProps) {
  const [loaded] = useFonts({ Inter_800ExtraBold });
  return <AppText {...rest} style={[loaded ? styles.display : styles.displayFallback, style]} />;
}

export function SectionTitle({ children }: { children: string }) {
  return <Display style={styles.sectionTitle}>{children}</Display>;
}

/** A top-to-bottom fade of one color, from `stops` of [share of the height, opacity]. Fills its parent. */
export function Fade({ color, stops, style }: { color: string; stops: [number, number][]; style?: StyleProp<ViewStyle> }) {
  // Gradient ids are global on the web, so each fade needs its own.
  const id = useId();
  return (
    <Svg pointerEvents="none" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1 1" style={[StyleSheet.absoluteFill, style]}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([at, opacity]) => (
            <Stop key={at} offset={at} stopColor={color} stopOpacity={opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="1" height="1" fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  go: { alignItems: 'center', justifyContent: 'center' },
  upRight: { transform: [{ rotate: '-45deg' }] },
  // No weight beside the family: the file is the weight, and asking for more would thicken it again on the web.
  display: { fontFamily: 'Inter_800ExtraBold' },
  displayFallback: { fontWeight: '700' },
  sectionTitle: { fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
});
