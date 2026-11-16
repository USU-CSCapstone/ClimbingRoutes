import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { useId } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Difficulty, MaxContentWidth, SerifFont, Spacing, UngradedLine } from '@/constants/theme';
import { difficultyBand } from '@/core/grades';
import type { Grade, Uuid } from '@/core/types';
import { wallRoutes } from '@/core/walls';
import { useLatestModel, usePublishedWalls, useRouteLines } from '@/data/models';
import { useArea } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { FEATURED_WALL } from '@/ui/home/featured-wall';
import { Display, Fade, GoCircle, Pressy, SectionTitle } from '@/ui/home/kit';
import { AppText } from '@/ui/text';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import { OnModel, placeName, wallFacts } from '@/ui/wall/parts';
import type { ShownRoute } from '@/ui/wall/types';

const CARD = { width: 308, height: 264, gap: Spacing.three - Spacing.one };
/** The featured still is shown this many times the card's width, and shifted, so its routes fill the card. */
const STILL = { scale: 700 / CARD.width, left: -98 / CARD.width, top: -98 / CARD.width };

/**
 * Every wall with a published 3D model, as large picture cards that swipe
 * sideways, from the same list the map uses, so it works offline once loaded.
 * The last card leads to how a wall gets added. Hidden until the list has a wall.
 */
export function WallList({ onAddWall }: { onAddWall: () => void }) {
  const theme = useTheme();
  const screen = useWindowDimensions();
  const { data: published } = usePublishedWalls();
  // The featured wall first, then the rest in an order that stays put between visits.
  const walls = published ? [...published].sort((a, b) => Number(b === FEATURED_WALL.uuid) - Number(a === FEATURED_WALL.uuid) || a.localeCompare(b)) : [];
  if (!walls.length) return null;

  const width = Math.min(CARD.width, Math.round(Math.min(screen.width, MaxContentWidth) * 0.86));
  return (
    <View>
      <View style={styles.head}>
        <SectionTitle>Walls in 3D</SectionTitle>
        <AppText type="small" color="textSecondary">
          {walls.length === 1 ? '1 wall' : `${walls.length} walls`}
        </AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={width + CARD.gap}
        snapToAlignment="start"
        contentContainerStyle={styles.rail}>
        {walls.map((uuid) => (
          <WallCard key={uuid} uuid={uuid} width={width} />
        ))}
        <Pressy
          role="button"
          accessibilityLabel="Add a wall: how to scan one with your phone"
          onPress={onAddWall}
          style={[styles.add, { borderColor: theme.border }]}>
          <View style={[styles.plus, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="add" size={22} color={theme.accent} />
          </View>
          <Display style={styles.addTitle}>Add a wall</Display>
          <AppText color="textSecondary" style={styles.addDetail}>
            Scan one with your phone
          </AppText>
        </Pressy>
      </ScrollView>
    </View>
  );
}

/** One wall, dark like the 3D view it opens: its picture or its colors, what's drawn on it, and its grades as a bar. */
function WallCard({ uuid, width }: { uuid: Uuid; width: number }) {
  const area = useArea(uuid);
  const model = useLatestModel(uuid);
  const lines = useRouteLines(model.data?.id);
  const frame = [styles.card, { width }];

  // The card keeps its place while the wall's name loads. A wall OpenBeta no longer has is left out.
  if (!area.data) return area.isPending ? <View style={frame} /> : null;

  const linesKnown = lines.data !== undefined;
  const routes: ShownRoute[] = wallRoutes(area.data.climbs, lines.data ?? []).map((r) => ({ ...r, color: lineColor(r.grade) }));
  const drawn = routes.filter((r) => r.line).length;
  // wallFacts gives the count, then the grade range if any route is graded, then what's drawn.
  const range = wallFacts(routes, false)[1];
  const badges = [linesKnown ? (drawn === 1 ? '1 route drawn' : `${drawn} routes drawn`) : null, range ?? null].filter((b): b is string => b != null);
  const place = placeName(area.data);
  const counts = bandCounts(routes);
  const most = counts.indexOf(Math.max(...counts));

  return (
    <Pressy
      role="link"
      accessibilityLabel={[area.data.name, place, ...badges, 'View in 3D'].filter(Boolean).join(', ')}
      onPress={() => router.push(`/walls/${uuid}` as Href)}
      style={frame}>
      {uuid === FEATURED_WALL.uuid ? (
        <Image
          source={FEATURED_WALL.drawn}
          contentFit="fill"
          style={[styles.still, { width: width * STILL.scale, left: width * STILL.left, top: width * STILL.top }]}
        />
      ) : (
        // No picture of this wall yet, so it glows in the color of most of its routes.
        <Glow color={counts[most] ? Difficulty[most].line : UngradedLine} />
      )}
      <Fade
        color="#0F1013"
        stops={[
          [0.38, 0],
          [0.86, 0.94],
          [1, 0.94],
        ]}
      />
      <View style={styles.badges}>
        {badges.map((badge, i) => (
          <View key={badge} style={styles.badge}>
            {i === 0 && linesKnown ? <Ionicons name="cube-outline" size={14} color={OnModel.text} /> : null}
            <AppText style={styles.badgeText}>{badge}</AppText>
          </View>
        ))}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <View style={styles.flex}>
            <AppText numberOfLines={1} style={[styles.name, { fontFamily: SerifFont }]}>
              {area.data.name}
            </AppText>
            {place ? (
              <AppText numberOfLines={1} style={styles.place}>
                {place}
              </AppText>
            ) : null}
          </View>
          <GoCircle size={40} background={OnModel.text} color={VIEWER_BACKGROUND} />
        </View>
        {counts.some(Boolean) ? (
          <View style={styles.grades}>
            {counts.map((count, band) =>
              count ? <View key={Difficulty[band].name} style={[styles.grade, { flex: count, backgroundColor: Difficulty[band].line }]} /> : null,
            )}
          </View>
        ) : null}
      </View>
    </Pressy>
  );
}

/** A soft light of one color from the card's top right corner. */
function Glow({ color }: { color: string }) {
  // Gradient ids are global on the web, so each glow needs its own.
  const id = useId();
  return (
    <Svg pointerEvents="none" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1 1" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={id} cx="0.88" cy="0" rx="1.2" ry="0.95" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity="0.42" />
          <Stop offset="0.62" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="1" height="1" fill={`url(#${id})`} />
    </Svg>
  );
}

/** How many of the wall's routes fall in each difficulty band, easiest first. */
function bandCounts(routes: ShownRoute[]): number[] {
  const counts = [0, 0, 0, 0];
  for (const r of routes) {
    const band = difficultyBand(r.grade);
    if (band != null) counts[band] += 1;
  }
  return counts;
}

/** The color the 3D view draws a route's line in. */
function lineColor(grade: Grade | null): string {
  const band = difficultyBand(grade);
  return band == null ? UngradedLine : Difficulty[band].line;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: Spacing.three, marginBottom: Spacing.three - Spacing.one },
  rail: { gap: CARD.gap, paddingHorizontal: Spacing.three },
  card: { height: CARD.height, borderRadius: 28, overflow: 'hidden', backgroundColor: VIEWER_BACKGROUND },
  still: { position: 'absolute', aspectRatio: FEATURED_WALL.aspect },
  badges: { position: 'absolute', left: 14, top: 14, right: 14, flexDirection: 'row', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: OnModel.background, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { color: OnModel.text, fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  info: { position: 'absolute', left: 18, right: Spacing.three, bottom: Spacing.three },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  name: { color: OnModel.text, fontSize: 31, lineHeight: 35 },
  place: { color: OnModel.muted, fontSize: 14, lineHeight: 18 },
  grades: { flexDirection: 'row', gap: 3, marginTop: 14 },
  grade: { height: 5, borderRadius: 3 },
  add: { width: 156, height: CARD.height, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'flex-end', gap: 2, padding: Spacing.three },
  plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 'auto' },
  addTitle: { fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  addDetail: { fontSize: 13, lineHeight: 17 },
});
