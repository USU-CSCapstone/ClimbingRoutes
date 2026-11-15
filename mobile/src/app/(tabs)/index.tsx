import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ComponentRef, type ReactNode, useRef, useState } from 'react';
import { Animated, type ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GuideTiles } from '@/ui/home/guide-tiles';
import { PhoneHero, SEAM_OVERLAP, SHEET_OVERLAP, WideHero } from '@/ui/home/hero';
import { NATIVE_DRIVER, useRise } from '@/ui/home/kit';
import { ScanSection } from '@/ui/home/scan-section';
import { SearchBox } from '@/ui/home/search-box';
import { WallList } from '@/ui/home/wall-list';
import { AppText } from '@/ui/text';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';

/** From this width the wall sits beside the app's name instead of filling the top of the screen. */
const WIDE = 700;
/** The search bar's height while it's stuck to the top, which the page scrolls under. */
const SEARCH_BAR = 78;

/**
 * The app's first screen, at / on the phone and the web. On a phone the wall
 * fills the top and the rest of the page is a rounded sheet that slides up over
 * it, with the search box staying at the top. Below that: the two ways into
 * the guide, the walls that open in 3D, and how a wall gets scanned.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const safe = useSafeAreaInsets();
  const focused = useIsFocused();
  const screen = useWindowDimensions();
  const wide = screen.width >= WIDE;
  const heroHeight = Math.round(Math.max(380, Math.min(500, (screen.height - safe.top) * 0.62)));

  const [scrollY] = useState(() => new Animated.Value(0));
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: NATIVE_DRIVER });

  // Where the scan steps sit in the page, for the "Add a wall" card to scroll to.
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [bodyTop, setBodyTop] = useState(0);
  const [scanTop, setScanTop] = useState(0);
  const showScanSteps = () => scroller.current?.scrollTo({ y: bodyTop + scanTop - (wide ? Spacing.three : SEARCH_BAR), animated: true });

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      {/* The top of the page is dark in both themes. Other tabs keep their own status bar. */}
      {focused ? <StatusBar style="light" /> : null}
      <View style={[styles.statusStrip, { height: safe.top }]} />
      <Animated.ScrollView
        ref={scroller}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // The search bar is the second thing in the page on a phone, and stays at the top once reached.
        stickyHeaderIndices={wide ? undefined : [1]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {wide ? <WideHero width={screen.width} /> : <PhoneHero width={screen.width} height={heroHeight} scrollY={scrollY} />}
        {wide ? (
          // Half over the dark band, half over the page.
          <View style={styles.seam}>
            <SearchBox raised />
          </View>
        ) : (
          <View style={[styles.sheetTop, { backgroundColor: theme.background }]}>
            <SearchBox />
          </View>
        )}
        <View
          onLayout={(e) => setBodyTop(e.nativeEvent.layout.y)}
          style={[styles.body, { backgroundColor: theme.background }, wide && styles.wideBody]}>
          <Rise delay={360} style={styles.gutter}>
            <GuideTiles wide={wide} />
          </Rise>
          <Rise delay={430}>
            <WallList onAddWall={showScanSteps} />
          </Rise>
          <Rise delay={500} onLayout={setScanTop}>
            <ScanSection />
          </Rise>
          <AppText type="small" color="textSecondary" style={styles.credit}>
            Route data from OpenBeta
          </AppText>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

/** A section that fades and lifts into place when the page first shows. */
function Rise({ delay, style, onLayout, children }: { delay: number; style?: object; onLayout?: (y: number) => void; children: ReactNode }) {
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
  // The top of the sheet: rounded where it rides over the picture, and what stays at the top when scrolled.
  sheetTop: {
    borderTopLeftRadius: SHEET_OVERLAP,
    borderTopRightRadius: SHEET_OVERLAP,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three - Spacing.half,
    paddingBottom: Spacing.two + Spacing.half,
  },
  // Tucked a pixel under the search bar, so no line of the picture shows between the two.
  body: { gap: Spacing.five - Spacing.half, marginTop: -1, paddingTop: Spacing.two + 1, paddingBottom: Spacing.five },
  seam: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, marginTop: -SEAM_OVERLAP, zIndex: 1 },
  wideBody: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingTop: Spacing.three + Spacing.one },
  gutter: { paddingHorizontal: Spacing.three },
  credit: { textAlign: 'center' },
});
