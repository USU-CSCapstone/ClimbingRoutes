import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ROOT_AREA } from '@/core/config';
import { usePublishedWalls } from '@/data/models';
import { useArea } from '@/data/queries';
import { FEATURED_WALL } from '@/ui/home/featured-wall';
import { CLIP, Display, EASE_OUT, Fade, NATIVE_DRIVER, useReduceMotion, useRise } from '@/ui/home/kit';
import { WallStage } from '@/ui/home/wall-stage';
import { AppText } from '@/ui/text';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import { OnModel } from '@/ui/wall/parts';

/** How far the page's rounded top reaches up over the picture on a phone. */
export const SHEET_OVERLAP = 28;
/** How far the search box reaches up into the dark band on a wide screen: half its height. */
export const SEAM_OVERLAP = 28;
/** Dark space kept under the picture, behind the page, for it to stretch into when the page is pulled down. */
const STRETCH_ROOM = 400;
/** The shade behind the title: solid, then thinning out over the rock. */
const SHADE_HEIGHT = 190;
/** The share of the picture's overflow cut from its left, which centers the routes on a phone. */
const FOCUS_X = 0.3;
/** The share of a wide screen's content width the picture takes. */
const WIDE_PICTURE = 0.55;

/**
 * The top of Home on a phone: the wall fills the screen's width and stays where
 * it is while the page slides up over it. It drifts and dims a little as it's
 * covered, and stretches when the page is pulled down. `scrollY` is how far the
 * page has scrolled.
 */
export function PhoneHero({ width, height, scrollY }: { width: number; height: number; scrollY: Animated.Value }) {
  const reduce = useReduceMotion();
  const title = useRise(120);

  // The picture starts a touch too close and eases back as the page opens.
  const [settle] = useState(() => new Animated.Value(1.09));
  useEffect(() => {
    if (reduce == null) return;
    if (reduce) return settle.setValue(1);
    const ease = Animated.timing(settle, { toValue: 1, duration: 1600, easing: EASE_OUT, useNativeDriver: NATIVE_DRIVER });
    ease.start();
    return () => ease.stop();
  }, [settle, reduce]);

  // Moving down exactly as fast as the page scrolls up is what holds it in place.
  const pinned = scrollY.interpolate({ inputRange: [-1, 0, height, height + 1], outputRange: [-1, 0, height, height] });
  const drift = scrollY.interpolate({ inputRange: [0, height], outputRange: [0, -0.12 * height], extrapolate: 'clamp' });
  const stretch = scrollY.interpolate({ inputRange: [-height, 0, height], outputRange: [2, 1, 1.12], extrapolateRight: 'clamp' });
  const dim = scrollY.interpolate({ inputRange: [0, height * 0.8], outputRange: [0, 0.55], extrapolate: 'clamp' });
  const titleFade = scrollY.interpolate({ inputRange: [0, 220], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    // Shorter than the picture, so the page's rounded top starts over it.
    <View style={{ height: height - SHEET_OVERLAP }}>
      <Animated.View style={[styles.pinned, { height: height + STRETCH_ROOM, transform: [{ translateY: pinned }] }]}>
        <Animated.View
          style={[styles.art, { width, height, transform: [{ translateY: drift }, { scale: Animated.multiply(settle, stretch) }] }]}>
          <WallStage width={width} height={height} focusX={FOCUS_X} />
        </Animated.View>
        <View pointerEvents="none" style={styles.shade}>
          <Fade
            color={VIEWER_BACKGROUND}
            stops={[
              [0, 1],
              [0.28, 1],
              [0.56, 0.72],
              [1, 0],
            ]}
          />
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, { opacity: dim }]} />
        <Animated.View
          pointerEvents="none"
          style={[styles.titles, { opacity: Animated.multiply(title.opacity, titleFade), transform: title.transform }]}>
          <Display style={styles.name}>Climbing Routes</Display>
          <AppText style={styles.tagline}>Find a route. See it on the rock.</AppText>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * The top of Home on a wide screen: a dark band with the app's name on the
 * left and the wall beside it. The search box isn't in here: the page lays it
 * over the band's bottom edge, which is what the extra room at the bottom is for.
 */
export function WideHero({ width }: { width: number }) {
  const inner = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const pictureWidth = Math.round(inner * WIDE_PICTURE);
  const pictureHeight = Math.round(pictureWidth / FEATURED_WALL.aspect);
  return (
    <View style={styles.band}>
      <View style={styles.wideRow}>
        <View style={styles.wideText}>
          <Display numberOfLines={1} adjustsFontSizeToFit style={[styles.name, styles.nameWide]}>
            Climbing Routes
          </Display>
          <AppText style={[styles.tagline, styles.taglineWide]}>Find a route. See it on the rock.</AppText>
          <Counts />
        </View>
        <View style={[styles.widePicture, { width: pictureWidth, height: pictureHeight }]}>
          <WallStage width={pictureWidth} height={pictureHeight} />
        </View>
      </View>
    </View>
  );
}

/** How much is in the guide, from the same data Explore and the map use. Blank until at least one count has loaded. */
function Counts() {
  const usa = useArea(ROOT_AREA.uuid);
  const walls = usePublishedWalls();
  const counts: [string, string][] = [];
  if (usa.data) counts.push([usa.data.totalClimbs.toLocaleString(), usa.data.totalClimbs === 1 ? 'route' : 'routes']);
  if (walls.data?.size) counts.push([String(walls.data.size), walls.data.size === 1 ? 'wall in 3D' : 'walls in 3D']);
  return (
    <AppText style={styles.counts}>
      {counts.map(([number, what], i) => (
        <AppText key={what} style={styles.counts}>
          {i ? ' · ' : ''}
          <AppText style={[styles.counts, styles.countNumber]}>{number}</AppText> {what}
        </AppText>
      ))}
    </AppText>
  );
}

const styles = StyleSheet.create({
  pinned: { position: 'absolute', top: 0, left: 0, right: 0, overflow: CLIP, backgroundColor: VIEWER_BACKGROUND },
  art: { transformOrigin: 'top' },
  shade: { position: 'absolute', top: 0, left: 0, right: 0, height: SHADE_HEIGHT },
  dim: { backgroundColor: VIEWER_BACKGROUND },
  titles: { position: 'absolute', top: Spacing.three, left: Spacing.three + Spacing.one, right: Spacing.three + Spacing.one },
  name: { color: OnModel.text, fontSize: 40, lineHeight: 42, letterSpacing: -1.4 },
  nameWide: { fontSize: 42, lineHeight: 46, letterSpacing: -1.5 },
  tagline: { color: OnModel.muted, fontSize: 17, lineHeight: 24, marginTop: 6 },
  taglineWide: { fontSize: 19, lineHeight: 26, marginTop: Spacing.two },
  counts: { color: '#9CA1AA', fontSize: 13, lineHeight: 18, marginTop: Spacing.three - Spacing.half },
  countNumber: { color: '#E3E5E9', fontWeight: '600' },
  band: { backgroundColor: VIEWER_BACKGROUND },
  wideRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three + Spacing.one,
    paddingBottom: Spacing.three + Spacing.one + SEAM_OVERLAP,
  },
  wideText: { flex: 1 },
  widePicture: { overflow: CLIP },
});
