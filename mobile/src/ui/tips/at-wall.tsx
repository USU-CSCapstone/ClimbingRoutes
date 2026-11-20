// The four tips for at the wall, each a tall card that acts its tip out. On a
// phone they swipe sideways, like Home's walls; on a wide screen they're a grid.
// With before.tsx these are the capture checklist (docs/capture-checklist.md)
// for photos taken outside the app, so change that too.
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { EASE_OUT, Fade, INK, NATIVE_DRIVER, useReduceMotion } from '@/ui/home/kit';
import { AppText } from '@/ui/text';
import { WallCut } from '@/ui/tips/art';
import { FRAME, Seg, type SegOption, Shot, tick, useDemo, WRONG } from '@/ui/tips/card';
import { OnModel } from '@/ui/wall/parts';

const GUTTER = Spacing.three;
const GAP = Spacing.three - Spacing.one;
/** How much of the next card shows on a phone, so it's clear they swipe. */
const PEEK = 40;
const PHONE_HEIGHT = 430;
const WIDE_HEIGHT = 400;
/** The web has no interval snapping, so its browser is asked to rest on a card instead. */
const WEB_SNAP = Platform.OS === 'web' ? ({ scrollSnapType: 'x mandatory' } as ViewStyle) : null;
const WEB_SNAP_CARD = Platform.OS === 'web' ? ({ scrollSnapAlign: 'center' } as ViewStyle) : null;
/** On the web, a drag on the slider mustn't scroll the page or the row, or select what's around it. */
const WEB_SLIDER = Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none', cursor: 'pointer' } as ViewStyle) : null;
/** The size of the dot that walks along under the photos. */
const YOU = 16;

interface CardProps {
  width: number;
  height: number;
  /** True once the card is the one in view, which is when it plays its demo. */
  inView: boolean;
}

/**
 * The four cards. `width` is the room they have: the screen's on a phone, where
 * the row runs edge to edge, and the page's content width on a wide screen.
 */
export function AtWall({ width, wide }: { width: number; wide: boolean }) {
  const theme = useTheme();
  const [active, setActive] = useState(0);
  // The row holds still while the last card's slider is dragged.
  const [sliding, setSliding] = useState(false);

  if (wide) {
    const size = { width: (width - Spacing.three) / 2, height: WIDE_HEIGHT, inView: false };
    return (
      <View style={styles.grid}>
        <StepCard {...size} />
        <OverlapCard {...size} />
        <LensCard {...size} />
        <BackCard {...size} onSlide={setSliding} />
      </View>
    );
  }

  const size = { width: width - 2 * GUTTER - PEEK, height: PHONE_HEIGHT };
  const interval = size.width + GAP;
  const cards: ReactNode[] = [
    <StepCard key="step" {...size} inView={active === 0} />,
    <OverlapCard key="overlap" {...size} inView={active === 1} />,
    <LensCard key="lens" {...size} inView={active === 2} />,
    <BackCard key="back" {...size} inView={active === 3} onSlide={setSliding} />,
  ];
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        snapToAlignment="start"
        scrollEnabled={!sliding}
        scrollEventThrottle={32}
        // The card whose middle is nearest the screen's, however the row came to rest.
        onScroll={(e) => setActive(Math.max(0, Math.min(cards.length - 1, Math.round((e.nativeEvent.contentOffset.x + PEEK / 2) / interval))))}
        style={WEB_SNAP}
        contentContainerStyle={styles.rail}>
        {cards.map((card, i) => (
          <View key={i} style={WEB_SNAP_CARD}>
            {card}
          </View>
        ))}
      </ScrollView>
      <View aria-hidden style={styles.dots}>
        {cards.map((_, i) => (
          <View key={i} style={[styles.dot, i === active && styles.dotOn, { backgroundColor: i === active ? theme.text : theme.border }]} />
        ))}
      </View>
    </View>
  );
}

// ---- Step sideways

const STEPS = 6;
/** Each photo's left edge as a share of the card's width: a step on each time, the first and last a step past the wall. */
const SPOT = Array.from({ length: STEPS }, (_, i) => 0.015 + i * 0.142);
const PHOTO = 0.27;
const TAKEN_AT_FIRST = 3;

/** How strongly a photo's frame shows: the newest fully, older ones less, and ones not taken yet not at all. */
function glow(photo: number, taken: number): number {
  if (photo >= taken) return 0;
  return photo === taken - 1 ? 1 : Math.max(0.25, 0.9 - (taken - 1 - photo) * 0.17);
}

/**
 * A walk along the wall, one press of the shutter at a time: each press lands
 * the next photo a step on and moves the dot along. After the last it's ticked,
 * and the shutter starts the walk again.
 */
function StepCard({ width, height }: CardProps) {
  const reduce = useReduceMotion();
  const [taken, setTaken] = useState(TAKEN_AT_FIRST);
  const [tried, setTried] = useState(false);
  const [seen] = useState(() => SPOT.map((_, i) => new Animated.Value(glow(i, TAKEN_AT_FIRST))));
  const [landed] = useState(() => SPOT.map((_, i) => new Animated.Value(i < TAKEN_AT_FIRST ? 1 : 0)));
  const [you] = useState(() => new Animated.Value(TAKEN_AT_FIRST - 1));
  const [flash] = useState(() => new Animated.Value(0));
  const [ring] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const duration = reduce ? 0 : 420;
    const moves = Animated.parallel([
      ...SPOT.map((_, i) => Animated.timing(seen[i], { toValue: glow(i, taken), duration: duration * 0.8, useNativeDriver: NATIVE_DRIVER })),
      ...SPOT.map((_, i) => Animated.timing(landed[i], { toValue: i < taken ? 1 : 0, duration, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER })),
      Animated.timing(you, { toValue: taken - 1, duration: duration * 1.2, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER }),
    ]);
    moves.start();
    return () => moves.stop();
  }, [taken, seen, landed, you, reduce]);

  // A ring spreads from the shutter until it's first pressed, to show it's there to press.
  useEffect(() => {
    if (tried || reduce !== false) return;
    const pulse = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: NATIVE_DRIVER }));
    pulse.start();
    return () => pulse.stop();
  }, [tried, ring, reduce]);

  function shoot() {
    setTried(true);
    tick();
    setTaken((n) => (n === STEPS ? 1 : n + 1));
    if (reduce) return;
    flash.setValue(0.55);
    Animated.timing(flash, { toValue: 0, duration: 320, useNativeDriver: NATIVE_DRIVER }).start();
  }

  const done = taken === STEPS;
  const stage = { top: 148, height: height - 148 - 138 };
  /** Where the dot sits under a photo's middle. */
  const under = (photo: number) => (SPOT[photo] + PHOTO / 2) * width - YOU / 2;
  return (
    <Shot
      width={width}
      height={height}
      title="Step sideways"
      detail="A photo every step, starting and ending one step past the wall. Don’t turn on the spot."
      mark={done ? 'right' : 'none'}
      control={
        <Pressable
          role="button"
          accessibilityLabel={done ? 'Walk the wall again' : 'Take the next photo'}
          hitSlop={8}
          onPress={shoot}
          style={({ pressed }) => [styles.shutter, pressed && styles.pressed]}>
          {tried ? null : (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
                  transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.18] }) }],
                },
              ]}
            />
          )}
          <View style={styles.shutterDisc}>{done ? <Ionicons name="refresh" size={24} color={INK} /> : null}</View>
        </Pressable>
      }>
      <WallCut width={width} height={height} picWidth={height * 1.38 * 1.5} focusX={0.46} focusY={0.56} />
      <View style={[styles.stage, stage]}>
        {SPOT.map((left, i) => (
          <Animated.View
            key={left}
            style={[
              styles.photo,
              i === taken - 1 && styles.newest,
              {
                left: left * width,
                width: PHOTO * width,
                opacity: seen[i],
                transform: [{ scale: landed[i].interpolate({ inputRange: [0, 1], outputRange: [1.14, 1] }) }],
              },
            ]}
          />
        ))}
        <Svg width={width * 0.88} height={2} style={[styles.path, { left: width * 0.06 }]}>
          <Line x1="0" y1="1" x2="100%" y2="1" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="2 7" />
        </Svg>
        <Animated.View
          style={[styles.you, { transform: [{ translateX: you.interpolate({ inputRange: [0, STEPS - 1], outputRange: [under(0), under(STEPS - 1)] }) }] }]}
        />
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
    </Shot>
  );
}

// ---- Keep lots of overlap

type Gap = 'apart' | 'close';
/** Three photos' left edges as shares of the card's width, each photo `width` wide. */
const LAP = { width: 0.34, close: [0.17, 0.295, 0.42], apart: [0, 0.33, 0.66] };
const SPACINGS: SegOption<Gap>[] = [
  { value: 'apart', label: 'Far apart', glyph: (color) => <Photos color={color} lefts={[2, 9.5, 17]} width={5} /> },
  { value: 'close', label: 'Close together', glyph: (color) => <Photos color={color} lefts={[4, 7.5, 11]} width={9} /> },
];

/** Three photos on the rock, either barely meeting or sharing most of what they see, with the shared strip filled in. */
function OverlapCard({ width, height, inView }: CardProps) {
  const reduce = useReduceMotion();
  const [spacing, setSpacing] = useState<Gap>('close');
  const [apart] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const move = Animated.timing(apart, {
      toValue: spacing === 'apart' ? 1 : 0,
      duration: reduce ? 0 : 700,
      easing: EASE_OUT,
      useNativeDriver: NATIVE_DRIVER,
    });
    move.start();
    return () => move.stop();
  }, [spacing, apart, reduce]);
  const used = useDemo(inView, [
    [350, () => setSpacing('apart')],
    [1700, () => setSpacing('close')],
  ]);
  const stage = { top: 136, height: height - 136 - 112 };
  return (
    <Shot
      width={width}
      height={height}
      title="Keep lots of overlap"
      detail="Each photo should look almost like the one before it."
      mark={spacing === 'close' ? 'right' : 'wrong'}
      control={
        <Seg
          label="How far apart the photos are"
          options={SPACINGS}
          value={spacing}
          onChange={(next) => {
            used();
            tick();
            setSpacing(next);
          }}
        />
      }>
      <WallCut width={width} height={height} picWidth={height * 1.5 * 1.5} focusX={0.4} focusY={0.6} />
      <View style={[styles.stage, stage]}>
        {LAP.close.map((close, i) => {
          const newest = i === LAP.close.length - 1;
          return (
            <Animated.View
              key={close}
              style={[
                styles.photo,
                newest && styles.newest,
                {
                  left: 0,
                  width: LAP.width * width,
                  opacity: newest ? 1 : 0.5 + i * 0.25,
                  transform: [{ translateX: apart.interpolate({ inputRange: [0, 1], outputRange: [close * width, LAP.apart[i] * width] }) }],
                },
              ]}>
              {/* What the newest photo shares with the one before it, which goes as they move apart. */}
              {newest ? (
                <Animated.View
                  style={[
                    styles.shared,
                    {
                      width: (LAP.close[i - 1] + LAP.width - close) * width,
                      opacity: apart.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }),
                    },
                  ]}
                />
              ) : null}
            </Animated.View>
          );
        })}
      </View>
    </Shot>
  );
}

/** Three little photo outlines, for the buttons that set how far apart they are. */
function Photos({ color, lefts, width }: { color: string; lefts: number[]; width: number }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {lefts.map((x) => (
        <Rect key={x} x={x} y={6} width={width} height={12} rx={1.5} fill="none" stroke={color} strokeWidth={2} />
      ))}
    </Svg>
  );
}

// ---- Stay on 1x, hold still

type Lens = 'wide' | 'main' | 'zoom';
/** A phone camera's lens buttons, and how much closer each makes the picture than the widest. */
const LENSES: { value: Lens; text: string; label: string; scale: number }[] = [
  { value: 'wide', text: '.5', label: 'The wide lens', scale: 1 },
  { value: 'main', text: '1x', label: 'The main lens', scale: 1.9 },
  { value: 'zoom', text: '2', label: 'Zoomed in', scale: 3.6 },
];
const CORNERS: ViewStyle[] = [
  { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 8 },
  { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 8 },
  { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 8 },
  { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 8 },
];

/** A viewfinder with a camera's lens buttons: each one changes how much of the rock it sees, and 1x locks on. */
function LensCard({ width, height, inView }: CardProps) {
  const reduce = useReduceMotion();
  const [lens, setLens] = useState<Lens>('main');
  const picked = LENSES.find((l) => l.value === lens) ?? LENSES[1];
  const [zoom] = useState(() => new Animated.Value(picked.scale));
  const [lock] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const move = Animated.parallel([
      Animated.timing(zoom, { toValue: picked.scale, duration: reduce ? 0 : 700, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(lock, { toValue: lens === 'main' ? 1 : 0, duration: reduce ? 0 : 450, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER }),
    ]);
    move.start();
    return () => move.stop();
  }, [lens, picked.scale, zoom, lock, reduce]);
  const used = useDemo(inView, [
    [350, () => setLens('wide')],
    [1500, () => setLens('main')],
  ]);
  return (
    <Shot
      width={width}
      height={height}
      title="Stay on 1x, hold still"
      detail="Use the main lens with no zoom, and stop walking for each photo."
      mark={lens === 'main' ? 'right' : 'wrong'}
      control={
        <View role="group" aria-label="Lens" style={styles.lenses}>
          {LENSES.map((option) => {
            const on = option.value === lens;
            return (
              <Pressable
                key={option.value}
                role="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: on }}
                hitSlop={4}
                onPress={() => {
                  used();
                  tick();
                  setLens(option.value);
                }}
                style={({ pressed }) => [styles.lens, on && styles.lensOn, pressed && styles.pressed]}>
                <AppText style={[styles.lensText, on && styles.lensTextOn]}>{option.text}</AppText>
              </Pressable>
            );
          })}
        </View>
      }>
      <Animated.View style={[StyleSheet.absoluteFill, styles.lensPicture, { transform: [{ scale: zoom }] }]}>
        <WallCut width={width} height={height} picWidth={height * 1.12 * 1.5} focusX={0.46} focusY={0.54} />
      </Animated.View>
      <Animated.View style={[styles.view, { transform: [{ scale: lock.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }] }]}>
        {CORNERS.map((corner, i) => (
          <View key={i} style={[styles.corner, corner, { borderColor: lens === 'main' ? FRAME : '#FFFFFF' }]} />
        ))}
      </Animated.View>
    </Shot>
  );
}

// ---- Step back for the top

/** The side view, in its drawing's own units: 300 across and 214 down. */
const SIDE = { width: 300, height: 214, wall: 236, top: 16, ground: 180, eye: 150, near: 206 };
/** Standing the wall's height back from it. */
const FAR = SIDE.wall - (SIDE.ground - SIDE.top);
/** The card's height kept clear above the drawing, for the words, and below it, for the slider. */
const SIDE_TOP = 132;
const SIDE_BOTTOM = 84;
const TRACK = 210;
const THUMB = 30;

/**
 * The wall from the side, with a slider that walks the photographer back from
 * its base. Close in, the line of sight to the top is steep and dashed red;
 * about the wall's height back, it's blue and the view takes in the top.
 */
function BackCard({ width, height, inView, onSlide }: CardProps & { onSlide: (sliding: boolean) => void }) {
  /** How far back: 0 at the base, 1 at the wall's height away. */
  const [back, setBack] = useState(1);
  // The demo walks back by itself. It isn't on the native driver, since each step redraws the drawing.
  const [walk] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const id = walk.addListener(({ value }) => setBack(value));
    return () => walk.removeListener(id);
  }, [walk]);
  const used = useDemo(inView, [
    [0, () => walk.setValue(0)],
    [300, () => Animated.timing(walk, { toValue: 1, duration: 1500, easing: EASE_OUT, useNativeDriver: false }).start()],
  ]);
  function slide(to: number) {
    used();
    walk.stopAnimation();
    setBack(to);
  }

  const x = SIDE.near + (FAR - SIDE.near) * back;
  const good = back >= 0.85;
  const poor = back <= 0.4;
  // As big as fits between the words and the slider, in the middle of the card.
  const drawn = Math.min(width, ((height - SIDE_TOP - SIDE_BOTTOM) * SIDE.width) / SIDE.height);
  return (
    <Shot
      width={width}
      height={height}
      title="Step back for the top"
      detail="Then walk it again from about the wall’s height away, with the phone tilted up."
      mark={good ? 'right' : poor ? 'wrong' : 'none'}
      control={
        // Clear of the tick or cross beside it.
        <View style={styles.sliderSpot}>
          <Slider value={back} onChange={slide} onSlide={onSlide} />
        </View>
      }>
      <View style={[StyleSheet.absoluteFill, styles.side]}>
        <Fade
          color="#262930"
          stops={[
            [0, 1],
            [1, 0],
          ]}
        />
      </View>
      <Svg
        width={drawn}
        height={(drawn * SIDE.height) / SIDE.width}
        viewBox={`0 0 ${SIDE.width} ${SIDE.height}`}
        style={[styles.sideDrawing, { left: (width - drawn) / 2 }]}>
        <Rect x={SIDE.wall} y={SIDE.top - 2} width={52} height={SIDE.ground - SIDE.top + 2} rx={7} fill="#6B6F77" />
        <Path d={`M10 ${SIDE.ground}h280`} stroke="#4A4E55" strokeWidth={2} strokeLinecap="round" />
        {/* How much of the wall's top the phone sees well from here. */}
        <Path
          d={`M${x} ${SIDE.eye}L${SIDE.wall} ${SIDE.top}V${SIDE.top + 70 * back}z`}
          fill={FRAME}
          fillOpacity={0.16 * Math.max(0, (back - 0.3) / 0.7)}
        />
        <Line
          x1={x}
          y1={SIDE.eye}
          x2={SIDE.wall}
          y2={SIDE.top}
          stroke={good ? FRAME : poor ? WRONG : OnModel.muted}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeDasharray={good ? undefined : '6 6'}
        />
        <Circle cx={x} cy={SIDE.eye} r={8} fill="#FFFFFF" />
        <Line x1={x} y1={SIDE.eye + 10} x2={x} y2={SIDE.ground} stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" />
        <Path d={`M${x} 198H${SIDE.wall}M${x} 192v12M${SIDE.wall} 192v12`} fill="none" stroke={OnModel.muted} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </Shot>
  );
}

/**
 * A slider from 0 to 1: drag the thumb, or press anywhere along the track to
 * move it there. `onSlide` says when a drag starts and ends, so a list it's
 * inside can hold still meanwhile.
 */
function Slider({ value, onChange, onSlide }: { value: number; onChange: (value: number) => void; onSlide: (sliding: boolean) => void }) {
  /** Where the press began: along the slider, and across the screen, which later moves are measured from. */
  const from = useRef({ along: 0, page: 0 });
  const at = (along: number) => Math.max(0, Math.min(1, (along - THUMB / 2) / (TRACK - THUMB)));
  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      // Held on to, so a sideways list around it doesn't take the drag for a swipe.
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        from.current = { along: e.nativeEvent.locationX, page: e.nativeEvent.pageX };
        onSlide(true);
        onChange(at(from.current.along));
      }}
      onResponderMove={(e) => onChange(at(from.current.along + e.nativeEvent.pageX - from.current.page))}
      onResponderRelease={() => onSlide(false)}
      onResponderTerminate={() => onSlide(false)}
      accessibilityRole="adjustable"
      accessibilityLabel="How far back from the wall"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(1, value + (e.nativeEvent.actionName === 'increment' ? 0.25 : -0.25))))}
      style={[styles.slider, WEB_SLIDER]}>
      {/* Neither takes the press, so where it lands is measured along the slider itself. */}
      <View pointerEvents="none" style={styles.track} />
      <View pointerEvents="none" style={[styles.thumb, { left: value * (TRACK - THUMB) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { gap: GAP, paddingHorizontal: GUTTER },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingTop: Spacing.three - Spacing.one },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { width: 22 },
  pressed: { opacity: 0.8 },

  stage: { position: 'absolute', left: 0, right: 0 },
  photo: { position: 'absolute', top: 0, bottom: 0, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  newest: { borderWidth: 2.5, borderColor: FRAME, backgroundColor: 'rgba(63, 208, 255, 0.14)' },
  path: { position: 'absolute', bottom: -25 },
  you: { position: 'absolute', left: 0, bottom: -32, width: YOU, height: YOU, borderRadius: YOU / 2, backgroundColor: '#FFFFFF', boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.25)' },
  flash: { backgroundColor: '#FFFFFF' },
  shutter: { width: 66, height: 66, borderRadius: 33, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterDisc: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', top: -12, left: -12, right: -12, bottom: -12, borderRadius: 45, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.7)' },

  shared: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(63, 208, 255, 0.3)', borderTopLeftRadius: 7, borderBottomLeftRadius: 7 },

  lensPicture: { transformOrigin: '48% 52%' },
  view: { position: 'absolute', left: 30, right: 30, top: 150, bottom: 118 },
  corner: { position: 'absolute', width: 26, height: 26 },
  lenses: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lens: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: OnModel.background },
  lensOn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF' },
  lensText: { color: OnModel.text, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  lensTextOn: { color: INK, fontSize: 15, lineHeight: 19 },

  side: { backgroundColor: '#131417' },
  sideDrawing: { position: 'absolute', top: SIDE_TOP },
  sliderSpot: { paddingLeft: 46 },
  slider: { width: TRACK, height: 44, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.26)' },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)' },
});
