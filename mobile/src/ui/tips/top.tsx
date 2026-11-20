// The top of the photo tips page, dark like Home's: the Date Wall still with a
// row of overlapping photos across it, which is the whole idea in one picture.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { SHEET_OVERLAP } from '@/ui/home/hero';
import { CLIP, Display, Fade, useRise } from '@/ui/home/kit';
import { AppText } from '@/ui/text';
import { PhotoFrames, WallCut } from '@/ui/tips/art';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import { OnModel } from '@/ui/wall/parts';

const TITLE = 'Photo tips';
const LEAD = 'How to photograph a wall so it makes a good 3D model.';
/** Dark space kept under the picture, behind the page, which is what shows when the page is pulled down. */
const PULL_ROOM = 400;
/** How far the title's top is above the picture's bottom edge: the page's overlap, the two lines under it and a margin. */
const TITLE_RISE = 144;
/** The share of a wide screen's content width the picture takes, as on Home. */
const WIDE_PICTURE = 0.55;

/**
 * The top on a phone. As on Home, the picture stays where it is while the page
 * slides up over it, and dims as it's covered. `scrollY` is how far the page
 * has scrolled.
 *
 * Unlike Home's, it doesn't stretch when the page is pulled down. The title is
 * at the bottom here, on a shade that ends solid, so a stretched picture showed
 * as a strip of rock between that shade and the page. Pulling down shows more
 * of the dark behind the picture instead, which carries the shade on.
 */
export function PhoneTop({ width, height, scrollY }: { width: number; height: number; scrollY: Animated.Value }) {
  const title = useRise(120);
  // Moving down exactly as fast as the page scrolls up is what holds it in place.
  const pinned = scrollY.interpolate({ inputRange: [-1, 0, height, height + 1], outputRange: [-1, 0, height, height] });
  const dim = scrollY.interpolate({ inputRange: [0, height * 0.8], outputRange: [0, 0.55], extrapolate: 'clamp' });
  const titleFade = scrollY.interpolate({ inputRange: [0, 180], outputRange: [1, 0], extrapolate: 'clamp' });
  return (
    // Shorter than the picture, so the page's rounded top starts over it.
    <View style={{ height: height - SHEET_OVERLAP }}>
      <Animated.View style={[styles.pinned, { height: height + PULL_ROOM, transform: [{ translateY: pinned }] }]}>
        <View style={{ width, height }}>
          <WallCut width={width} height={height} picWidth={Math.max(760, width * 1.6)} focusX={0.46} />
          <View pointerEvents="none" style={styles.frames}>
            <PhotoFrames width={Math.min(264, width - Spacing.five * 2)} />
          </View>
        </View>
        <View pointerEvents="none" style={[styles.shadeTop, { height: height * 0.3 }]}>
          <Fade
            color={VIEWER_BACKGROUND}
            stops={[
              [0, 0.7],
              [1, 0],
            ]}
          />
        </View>
        {/* Solid for its last fifth, so the dark under the picture meets it without a seam. */}
        <View pointerEvents="none" style={[styles.shadeBottom, { top: height * 0.42, height: height * 0.58 }]}>
          <Fade
            color={VIEWER_BACKGROUND}
            stops={[
              [0, 0],
              [0.45, 0.9],
              [0.8, 1],
              [1, 1],
            ]}
          />
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, { opacity: dim }]} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.titles,
            { top: height - TITLE_RISE, opacity: Animated.multiply(title.opacity, titleFade), transform: title.transform },
          ]}>
          <Display style={styles.name}>{TITLE}</Display>
          <AppText style={styles.lead}>{LEAD}</AppText>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** The top on a wide screen: a dark band with the title on the left and the picture beside it. */
export function WideTop({ width, onBack }: { width: number; onBack: () => void }) {
  const inner = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const pictureWidth = Math.round(inner * WIDE_PICTURE);
  const pictureHeight = Math.round(pictureWidth * 0.6);
  return (
    <View style={styles.band}>
      <View style={styles.wideRow}>
        <View style={styles.wideText}>
          <Pressable role="button" onPress={onBack} hitSlop={12} style={({ pressed }) => [styles.crumb, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={18} color={OnModel.muted} />
            <AppText style={styles.crumbText}>Back</AppText>
          </Pressable>
          <Display style={[styles.name, styles.nameWide]}>{TITLE}</Display>
          <AppText style={[styles.lead, styles.leadWide]}>{LEAD}</AppText>
        </View>
        <View style={[styles.widePicture, { width: pictureWidth, height: pictureHeight }]}>
          <WallCut width={pictureWidth} height={pictureHeight} picWidth={pictureWidth * 1.6} focusX={0.46} focusY={0.56} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
            <PhotoFrames width={Math.min(300, pictureWidth - Spacing.five * 2)} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pinned: { position: 'absolute', top: 0, left: 0, right: 0, overflow: CLIP, backgroundColor: VIEWER_BACKGROUND },
  frames: { position: 'absolute', top: 52, left: 0, right: 0, alignItems: 'center' },
  shadeTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  shadeBottom: { position: 'absolute', left: 0, right: 0 },
  dim: { backgroundColor: VIEWER_BACKGROUND },
  titles: { position: 'absolute', left: Spacing.three + Spacing.one, right: Spacing.three + Spacing.one },
  name: { color: OnModel.text, fontSize: 40, lineHeight: 42, letterSpacing: -1.4 },
  nameWide: { fontSize: 42, lineHeight: 46, letterSpacing: -1.5 },
  lead: { color: OnModel.muted, fontSize: 17, lineHeight: 24, marginTop: 6 },
  leadWide: { fontSize: 19, lineHeight: 26, marginTop: Spacing.two },
  band: { backgroundColor: VIEWER_BACKGROUND },
  wideRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  wideText: { flex: 1 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-start', marginBottom: Spacing.three },
  crumbText: { color: OnModel.muted, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  widePicture: { borderRadius: 22, overflow: CLIP },
  center: { alignItems: 'center', justifyContent: 'center' },
});
