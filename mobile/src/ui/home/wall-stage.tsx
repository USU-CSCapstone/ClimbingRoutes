import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { type Href, router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useHasModel } from '@/data/models';
import { useArea } from '@/data/queries';
import { FEATURED_ROUTES, FEATURED_WALL, type FeaturedRoute } from '@/ui/home/featured-wall';
import { EASE_OUT, INK, NATIVE_DRIVER, NO_CLICK_FOCUS, Pressy, useReduceMotion } from '@/ui/home/kit';
import { AppText } from '@/ui/text';
import { OnModel } from '@/ui/wall/parts';

/** The stills are this many units across and down, which the routes are drawn in. */
const UNITS = { width: 1500, height: 1000 };
/** Line widths, in the same units: about 4.5 and 6.5 points on a phone. */
const LINE = 9;
const PICKED_LINE = 13;
/** How far a picked route's line and the picture lean in. */
const LEAN = 1.1;
/** How long each route stays lit while the wall steps through them by itself. */
const STEP_MS = 3200;
/** A tag's height plus the gap to the next one up. */
const TAG_STEP = 27;

/**
 * The wall at the top of Home, as a small version of the 3D view: the routes
 * draw themselves from the ground up, then each tag is a button. Tapping one
 * lights that route and dims the rest, and tapping it again opens the route on
 * the 3D wall. Until someone taps, it steps through the routes by itself.
 *
 * `width` and `height` are the space to fill. The picture covers it, shifted so
 * `focusX` of its overflow is cut from the left.
 */
export function WallStage({ width, height, focusX = 0.5 }: { width: number; height: number; focusX?: number }) {
  const picWidth = Math.max(width, height * FEATURED_WALL.aspect);
  const picHeight = picWidth / FEATURED_WALL.aspect;
  const picLeft = -(picWidth - width) * focusX;
  const picTop = -(picHeight - height) / 2;

  const published = useHasModel(FEATURED_WALL.uuid);
  const area = useArea(FEATURED_WALL.uuid);
  const focused = useIsFocused();
  const reduce = useReduceMotion();
  const [picked, setPicked] = useState<number | null>(null);
  const [hands, setHands] = useState(false);

  // Steps through the routes, then rests on the whole wall, until someone takes over.
  useEffect(() => {
    if (hands || !focused || reduce !== false) return;
    let step = 0;
    const timer = setInterval(() => {
      const next = step++ % (FEATURED_ROUTES.length + 1);
      setPicked(next < FEATURED_ROUTES.length ? next : null);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [hands, focused, reduce]);

  // The picture leans in from the foot of the picked route, so that route's tag stays put.
  const [lean] = useState(() => ({ x: new Animated.Value(0), y: new Animated.Value(0), scale: new Animated.Value(1) }));
  useEffect(() => {
    const scale = picked == null ? 1 : LEAN;
    const [footX, footY] = picked == null ? [0.5, 0.5] : FEATURED_ROUTES[picked].points[0];
    // Views scale about their middle, so the shift is what would otherwise move the foot.
    const to = { x: (footX - 0.5) * picWidth * (1 - scale), y: (footY - 0.5) * picHeight * (1 - scale), scale };
    const move = Animated.parallel(
      (['x', 'y', 'scale'] as const).map((key) =>
        Animated.timing(lean[key], { toValue: to[key], duration: reduce ? 0 : 760, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER }),
      ),
    );
    move.start();
    return () => move.stop();
  }, [picked, picWidth, picHeight, lean, reduce]);

  function choose(index: number | null) {
    setHands(true);
    if (index != null && index === picked) return openRoute(FEATURED_ROUTES[index]);
    if (index != null && Platform.OS !== 'web') Haptics.selectionAsync();
    setPicked(index);
  }

  function openRoute(route: FeaturedRoute) {
    if (!published) return;
    const climb = area.data?.climbs.find((c) => c.name.toLowerCase() === route.name.toLowerCase());
    router.push(`/walls/${FEATURED_WALL.uuid}${climb ? `?route=${climb.uuid}` : ''}` as Href);
  }

  const floor = FEATURED_ROUTES[0].points[0][1] * picHeight;

  return (
    <View style={{ width, height }}>
      <Animated.View
        style={[
          styles.picture,
          { width: picWidth, height: picHeight, left: picLeft, top: picTop },
          { transform: [{ translateX: lean.x }, { translateY: lean.y }, { scale: lean.scale }] },
        ]}>
        {/* A tap on bare rock goes back to the whole wall. */}
        <Pressable accessible={false} onPress={() => choose(null)} style={StyleSheet.absoluteFill}>
          <Image
            source={FEATURED_WALL.plain}
            contentFit="fill"
            style={StyleSheet.absoluteFill}
            accessibilityLabel={`${FEATURED_WALL.name}'s 3D model`}
          />
          {FEATURED_ROUTES.map((route, i) => (
            <RouteLine key={route.name} route={route} state={stateOf(i, picked)} width={picWidth} height={picHeight} delay={450 + i * 150} />
          ))}
        </Pressable>
        {FEATURED_ROUTES.map((route, i) => (
          <RouteTag
            key={route.name}
            route={route}
            state={stateOf(i, picked)}
            left={route.points[0][0] * picWidth - 1}
            top={floor - 12 - i * TAG_STEP}
            delay={1450 + i * 150}
            opens={published}
            onPress={() => choose(i)}
          />
        ))}
      </Animated.View>
      {published ? <WallChip top={floor + picTop - 13} /> : null}
    </View>
  );
}

type RouteState = 'idle' | 'picked' | 'aside';

function stateOf(index: number, picked: number | null): RouteState {
  return picked == null ? 'idle' : picked === index ? 'picked' : 'aside';
}

/** Fades a value to wherever `to` says, each time it changes. */
function useFade(to: number, start = to) {
  const reduce = useReduceMotion();
  const [value] = useState(() => new Animated.Value(start));
  useEffect(() => {
    const fade = Animated.timing(value, { toValue: to, duration: reduce ? 0 : 420, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER });
    fade.start();
    return () => fade.stop();
  }, [value, to, reduce]);
  return value;
}

/** One route's line: drawn up from its foot once, then brighter when picked and fainter when another is. */
function RouteLine({ route, state, width, height, delay }: { route: FeaturedRoute; state: RouteState; width: number; height: number; delay: number }) {
  const reduce = useReduceMotion();
  const points = route.points.map(([x, y]) => `${(x * UNITS.width).toFixed(1)},${(y * UNITS.height).toFixed(1)}`).join(' ');
  const presence = useFade(state === 'aside' ? 0.26 : 1);
  const glow = useFade(state === 'picked' ? 1 : 0);

  // Drawing is a window that opens upward from the foot, which a line this upright follows closely.
  const [drawn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce == null) return;
    if (reduce) return drawn.setValue(1);
    const draw = Animated.timing(drawn, { toValue: 1, duration: 1000, delay, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false });
    draw.start();
    return () => draw.stop();
  }, [drawn, delay, reduce]);
  const foot = route.points[0][1];
  const top = route.points[route.points.length - 1][1];
  const opening = drawn.interpolate({ inputRange: [0, 1], outputRange: [(1 - foot) * height - 6, (1 - top) * height + 12] });

  const line = (strokeWidth: number, strokeOpacity = 1) => (
    <Polyline points={points} fill="none" stroke={route.color} strokeWidth={strokeWidth} strokeOpacity={strokeOpacity} strokeLinecap="round" strokeLinejoin="round" />
  );
  const svg = { width, height, viewBox: `0 0 ${UNITS.width} ${UNITS.height}`, preserveAspectRatio: 'none' } as const;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: presence }]}>
      <Animated.View style={[styles.window, { height: opening }]}>
        <View style={[styles.windowContent, { height }]}>
          <Svg {...svg}>{line(LINE)}</Svg>
        </View>
      </Animated.View>
      {/* The picked look: a thicker line over a soft glow of its own color. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}>
        <Svg {...svg}>
          {line(PICKED_LINE * 2.6, 0.22)}
          {line(PICKED_LINE)}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/** A route's name and grade at its foot. Picked, it fills with the route's color and shows that it opens. */
function RouteTag({
  route,
  state,
  left,
  top,
  delay,
  opens,
  onPress,
}: {
  route: FeaturedRoute;
  state: RouteState;
  left: number;
  top: number;
  delay: number;
  opens: boolean;
  onPress: () => void;
}) {
  const reduce = useReduceMotion();
  const presence = useFade(state === 'aside' ? 0.5 : 1);
  const picked = state === 'picked';

  // Pops in once its line has finished drawing.
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce == null) return;
    if (reduce) return pop.setValue(1);
    const appear = Animated.timing(pop, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.back(1.6)), useNativeDriver: NATIVE_DRIVER });
    appear.start();
    return () => appear.stop();
  }, [pop, delay, reduce]);

  return (
    <Animated.View
      style={[
        styles.tagSpot,
        { left, top, opacity: Animated.multiply(presence, pop.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' })) },
        { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }] },
      ]}>
      <Pressable
        role="button"
        accessibilityLabel={`${route.name}, ${route.grade}${picked && opens ? ', open on the 3D wall' : ''}`}
        accessibilityState={{ selected: picked }}
        hitSlop={4}
        onPress={onPress}
        {...NO_CLICK_FOCUS}
        style={[styles.tag, { borderLeftColor: route.color, backgroundColor: picked ? route.color : OnModel.background }]}>
        <AppText allowFontScaling={false} style={[styles.tagText, picked && styles.ink]}>
          {route.name}
        </AppText>
        <AppText allowFontScaling={false} style={[styles.tagText, { color: picked ? INK : route.color }]}>
          {route.grade}
        </AppText>
        {picked && opens ? <Ionicons name="arrow-forward" size={14} color={INK} style={styles.upRight} /> : null}
      </Pressable>
    </Animated.View>
  );
}

/** Names the wall in the picture and opens it in 3D. */
function WallChip({ top }: { top: number }) {
  const reduce = useReduceMotion();
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce == null) return;
    if (reduce) return pop.setValue(1);
    const appear = Animated.timing(pop, { toValue: 1, duration: 380, delay: 1950, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER });
    appear.start();
    return () => appear.stop();
  }, [pop, reduce]);
  return (
    <Animated.View style={[styles.chipSpot, { top, opacity: pop }]}>
      <Pressy
        role="link"
        accessibilityLabel={`View ${FEATURED_WALL.name} in 3D`}
        onPress={() => router.push(`/walls/${FEATURED_WALL.uuid}` as Href)}
        {...NO_CLICK_FOCUS}
        style={styles.chip}>
        <Ionicons name="cube-outline" size={15} color={OnModel.text} />
        <AppText allowFontScaling={false} style={styles.tagText}>
          {FEATURED_WALL.name}
        </AppText>
        <Ionicons name="arrow-forward" size={14} color={OnModel.text} style={styles.upRight} />
      </Pressy>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  picture: { position: 'absolute' },
  window: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  windowContent: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  tagSpot: { position: 'absolute' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.two + 1,
    paddingVertical: 3,
  },
  tagText: { color: OnModel.text, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  ink: { color: INK },
  upRight: { transform: [{ rotate: '-45deg' }] },
  chipSpot: { position: 'absolute', right: Spacing.three - Spacing.one },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: OnModel.background,
    borderRadius: 999,
    paddingLeft: Spacing.three - Spacing.one,
    paddingRight: Spacing.three - Spacing.one - 1,
    paddingVertical: 7,
  },
});
