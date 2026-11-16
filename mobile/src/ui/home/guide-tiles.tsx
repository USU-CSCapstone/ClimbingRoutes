import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ROOT_AREA } from '@/core/config';
import { useArea } from '@/data/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { climbCount } from '@/ui/components';
import { Display, Fade, GoCircle, Pressy } from '@/ui/home/kit';
import { AppText } from '@/ui/text';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';

/**
 * A piece of the app's own map, zoomed to Utah and Colorado with the other dots
 * left out, captured at 750 × 300. It's light in both themes, like the map.
 */
const MAP_PICTURE = require('@/assets/images/home-map.jpg');
const MAP_ASPECT = 2.5;

/**
 * The two ways into the guide, kept small beside the walls below them. Each
 * shows a little of what it opens: the last steps of the way down to a wall,
 * and a piece of the map.
 */
export function GuideTiles({ wide }: { wide: boolean }) {
  const usa = useArea(ROOT_AREA.uuid);
  return (
    <View style={styles.tiles}>
      <Tile
        title="Explore"
        detail={usa.data ? climbCount(usa.data.totalClimbs) : 'Browse by state'}
        href="/(tabs)/(explore)/explore">
        <PathPreview />
      </Tile>
      <Tile title="Map" detail="Crags and 3D walls" href="/(tabs)/(map)/map">
        <MapPreview wide={wide} />
      </Tile>
    </View>
  );
}

function Tile({ title, detail, href, children }: { title: string; detail: string; href: Href; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Pressy
      role="link"
      accessibilityLabel={`${title}: ${detail}`}
      onPress={() => router.navigate(href)}
      style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
      {/* The preview is a picture of the page, not something to read out. */}
      <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.preview}>
        {children}
      </View>
      <View style={styles.label}>
        <View style={styles.titleRow}>
          <Display style={styles.title}>{title}</Display>
          <GoCircle size={28} background={theme.text} color={theme.background} />
        </View>
        <AppText numberOfLines={1} color="textSecondary" style={styles.detail}>
          {detail}
        </AppText>
      </View>
    </Pressy>
  );
}

/** The last two steps down through Explore: a crag, then one of its walls, dark like everything that opens in 3D. */
function PathPreview() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  return (
    <View style={styles.path}>
      <View style={[styles.crumb, { backgroundColor: theme.background }]}>
        <AppText allowFontScaling={false} style={styles.crumbText}>
          Logan Canyon
        </AppText>
      </View>
      {/* Outlined in the tile's own color in light mode, and visibly in dark mode, where the tile is nearly as dark. */}
      <View style={[styles.crumb, styles.wallCrumb, { borderColor: dark ? theme.border : VIEWER_BACKGROUND }]}>
        <View style={[styles.elbow, { borderColor: theme.textSecondary }]} />
        <Ionicons name="cube-outline" size={12} color="#FFFFFF" />
        <AppText allowFontScaling={false} style={[styles.crumbText, styles.wallText]}>
          Date Wall
        </AppText>
      </View>
    </View>
  );
}

/**
 * The map still, centered and fading into the tile under it. On a phone it's a
 * little wider than the tile, which makes its dots big enough to read; a wide
 * tile already shows it large.
 */
function MapPreview({ wide }: { wide: boolean }) {
  const theme = useTheme();
  return (
    <>
      <View style={styles.mapFrame}>
        <Image source={MAP_PICTURE} contentFit="cover" style={[styles.map, wide && styles.mapWide]} />
      </View>
      <Fade
        color={theme.backgroundElement}
        stops={[
          [0.55, 0],
          [1, 1],
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Spacing.three - Spacing.one },
  tile: { flex: 1, height: 132, borderRadius: 22, overflow: 'hidden' },
  preview: { flex: 1, overflow: 'hidden' },
  label: { paddingLeft: Spacing.three - Spacing.half, paddingRight: Spacing.three - Spacing.one, paddingTop: 6, paddingBottom: Spacing.three - Spacing.one },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  title: { fontSize: 19, lineHeight: 24, letterSpacing: -0.5 },
  detail: { fontSize: 13.5, lineHeight: 17, marginTop: 1 },
  path: { alignItems: 'flex-start', gap: 5, paddingTop: Spacing.three - Spacing.one, paddingLeft: Spacing.three - Spacing.one },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, borderRadius: 10, paddingHorizontal: 9, borderWidth: 1, borderColor: 'transparent' },
  wallCrumb: { marginLeft: 14, backgroundColor: VIEWER_BACKGROUND, borderWidth: 1 },
  crumbText: { fontSize: 12.5, lineHeight: 20, fontWeight: '600' },
  wallText: { color: '#FFFFFF' },
  // Joins the wall to the crag above it: down from the crag's left end, then across.
  elbow: {
    position: 'absolute',
    left: -9,
    top: -6,
    width: 8,
    height: 16,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderBottomLeftRadius: 6,
    opacity: 0.45,
  },
  mapFrame: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  map: { width: '132%', aspectRatio: MAP_ASPECT },
  mapWide: { width: '100%' },
});
