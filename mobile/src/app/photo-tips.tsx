import { router, Stack, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useState } from 'react';
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SHEET_OVERLAP } from '@/ui/home/hero';
import { Display, GoCircle, INK, NATIVE_DRIVER, NO_CLICK_FOCUS, Pressy, useRise } from '@/ui/home/kit';
import { AppText } from '@/ui/text';
import { AtWall } from '@/ui/tips/at-wall';
import { CountCard, ShadeCard } from '@/ui/tips/before';
import { CARD_RADIUS } from '@/ui/tips/card';
import { PhoneTop, WideTop } from '@/ui/tips/top';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import { OnModel, RoundButton } from '@/ui/wall/parts';

/** From this width the picture sits beside the title and the cards are side by side, as Home changes at. */
const WIDE = 700;
/** How tall the picture at the top is on a phone. */
const TOP_HEIGHT = 340;
/** How far the page has scrolled when its rounded top reaches the Back button. */
const BACK_GONE = TOP_HEIGHT - SHEET_OVERLAP - 80;
const GUTTER = Spacing.three;
const GAP = Spacing.three - Spacing.one;
/** The heading over the two tips that aren't about the walk along the wall: the light, and how many photos. */
const SURE = 'Keep in mind';
/** How much of that section has to be on screen to count as seen: its heading and about half its first card. */
const SEEN_DEPTH = 180;

/**
 * /photo-tips: how to photograph a wall for a model, for people taking the
 * photos outside the app and uploading them (#72). Each tip is a card that acts
 * it out. Home links here, and so does the upload screen, which passes
 * `from=upload` so the card at the bottom leads back to it instead of off to
 * find a wall.
 */
export default function PhotoTipsScreen() {
  const theme = useTheme();
  const safe = useSafeAreaInsets();
  const focused = useIsFocused();
  const screen = useWindowDimensions();
  const wide = screen.width >= WIDE;
  const { from } = useLocalSearchParams<{ from?: string }>();
  const uploading = from === 'upload';

  const [scrollY] = useState(() => new Animated.Value(0));
  // The Back button floats over the picture, and goes once the page has slid up to it,
  // where it would sit on top of the tips. Scrolling back up, or the phone's own way back, still works.
  const [covered, setCovered] = useState(false);
  // The second section starts below the first screenful, and its light card plays its demo when it's first
  // scrolled to. Where it is in the page is the cards' top plus its own top within them.
  const [bodyTop, setBodyTop] = useState(0);
  const [sureTop, setSureTop] = useState<number | null>(null);
  const [sureReached, setSureReached] = useState(false);
  /** How far the page must be scrolled for enough of that section to show. */
  const sureAt = sureTop == null ? null : bodyTop + sureTop + SEEN_DEPTH - (screen.height - safe.top);
  const sureInView = sureReached || (sureAt != null && sureAt <= 0);
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: NATIVE_DRIVER,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      setCovered(y > BACK_GONE);
      if (sureAt != null && y >= sureAt) setSureReached(true);
    },
  });
  const backFade = scrollY.interpolate({ inputRange: [BACK_GONE - 60, BACK_GONE], outputRange: [1, 0], extrapolate: 'clamp' });

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const next = (
    <Pressy
      role="button"
      {...NO_CLICK_FOCUS}
      onPress={uploading ? back : () => router.navigate('/(tabs)/(search)/search')}
      style={styles.next}>
      <View style={styles.flex}>
        <Display style={styles.nextTitle}>Got your photos?</Display>
        <AppText style={styles.nextDetail}>
          {uploading ? 'Go back and choose them.' : 'Find the wall, open its page and choose Upload photos.'}
        </AppText>
      </View>
      <GoCircle size={52} background="#FFFFFF" color={INK} />
    </Pressy>
  );

  /** The room the cards have on a wide screen. */
  const inner = Math.min(screen.width, MaxContentWidth) - 2 * GUTTER;
  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Photo tips' }} />
      {/* The top of the page is dark in both themes. */}
      {focused ? <StatusBar style="light" /> : null}
      <View style={[styles.statusStrip, { height: safe.top }]} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
        {wide ? <WideTop width={screen.width} onBack={back} /> : <PhoneTop width={screen.width} height={TOP_HEIGHT} scrollY={scrollY} />}
        {wide ? (
          <View onLayout={(e) => setBodyTop(e.nativeEvent.layout.y)} style={[styles.wideBody, { paddingBottom: Spacing.five + safe.bottom }]}>
            <Rise delay={200} style={styles.group}>
              <Heading>At the wall</Heading>
              <AtWall wide width={inner} />
            </Rise>
            <Rise delay={280} style={styles.group} onLayout={setSureTop}>
              <Heading>{SURE}</Heading>
              <View style={styles.pair}>
                <ShadeCard width={(inner - GUTTER) / 2} height={300} inView={sureInView} />
                <View style={styles.flex}>
                  <CountCard />
                </View>
              </View>
            </Rise>
            <Rise delay={340}>{next}</Rise>
          </View>
        ) : (
          <View
            onLayout={(e) => setBodyTop(e.nativeEvent.layout.y)}
            style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: Spacing.five + safe.bottom }]}>
            {/* Not in the gutter: its cards run to the screen's edges. */}
            <Rise delay={200} style={styles.group}>
              <View style={styles.gutter}>
                <Heading>At the wall</Heading>
              </View>
              <AtWall wide={false} width={screen.width} />
            </Rise>
            <Rise delay={280} style={[styles.group, styles.gutter]} onLayout={setSureTop}>
              <Heading>{SURE}</Heading>
              <ShadeCard width={screen.width - 2 * GUTTER} inView={sureInView} />
              <CountCard />
            </Rise>
            <Rise delay={340} style={styles.gutter}>
              {next}
            </Rise>
          </View>
        )}
      </Animated.ScrollView>
      {wide ? null : (
        <Animated.View
          pointerEvents={covered ? 'none' : 'auto'}
          style={[
            styles.back,
            { top: safe.top + Spacing.three - Spacing.half, left: safe.left + Spacing.three - Spacing.half, opacity: backFade },
          ]}>
          <RoundButton icon="chevron-back" label="Back" onPress={back} onModel size={42} />
        </Animated.View>
      )}
    </View>
  );
}

function Heading({ children }: { children: string }) {
  return <Display style={styles.heading}>{children}</Display>;
}

/** A part of the page that fades and lifts into place when the page first shows. `onLayout` is told its top. */
function Rise({
  delay,
  style,
  onLayout,
  children,
}: {
  delay: number;
  style?: StyleProp<ViewStyle>;
  onLayout?: (top: number) => void;
  children: ReactNode;
}) {
  const rise = useRise(delay);
  return (
    <Animated.View onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined} style={[style, rise]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statusStrip: { backgroundColor: VIEWER_BACKGROUND },
  // Rounded where it rides up over the picture.
  sheet: { borderTopLeftRadius: SHEET_OVERLAP, borderTopRightRadius: SHEET_OVERLAP, paddingTop: Spacing.four - Spacing.half, gap: Spacing.four },
  wideBody: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: GUTTER, paddingTop: Spacing.four, gap: Spacing.four },
  gutter: { paddingHorizontal: GUTTER },
  group: { gap: GAP },
  heading: { fontSize: 24, lineHeight: 28, letterSpacing: -0.7, paddingHorizontal: Spacing.one },
  pair: { flexDirection: 'row', alignItems: 'center', gap: GUTTER },
  back: { position: 'absolute' },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.half,
    borderRadius: CARD_RADIUS,
    backgroundColor: VIEWER_BACKGROUND,
    paddingVertical: Spacing.three + Spacing.one,
    paddingLeft: Spacing.four - Spacing.half,
    paddingRight: Spacing.three + Spacing.half,
  },
  nextTitle: { color: OnModel.text, fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
  nextDetail: { color: OnModel.muted, fontSize: 15, lineHeight: 20, marginTop: 3 },
});
