import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SerifFont, Spacing, TapTarget } from '@/constants/theme';
import type { SavedRoute } from '@/core/database';
import { dayLabel } from '@/core/days';
import { gradeFromText } from '@/core/grades';
import { wallRoutes } from '@/core/walls';
import { useClimbedRoutes, useSavedRoutes, useSetSaved } from '@/data/logbook';
import { useLatestModel, useRouteLines } from '@/data/models';
import { useArea } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { disciplineText } from '@/ui/components';
import { FEATURED_WALL } from '@/ui/home/featured-wall';
import { CLIP } from '@/ui/home/kit';
import { routeOnWall } from '@/ui/profile/climbed';
import { Busy, Empty, GUTTER, PillButton } from '@/ui/profile/kit';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import { GradePill, lineColor, NumberBadge, OnModel, placeName } from '@/ui/wall/parts';
import type { ShownRoute } from '@/ui/wall/types';

const THUMB = { width: 72, height: 54 };
/** The featured still, sized and shifted so its routes fill the small picture, as Home's wall card does. */
const STILL = { scale: 2.27, left: -0.32, top: -0.32 };
const BADGE = 28;

/** The routes this account saved, under the wall each is on, with the wall saved to most recently first. */
export function SavedTab() {
  const saved = useSavedRoutes();
  const climbed = useClimbedRoutes();

  if (saved.error) {
    return (
      <Empty icon="cloud-offline-outline" title="Couldn't load your saved routes" detail={saved.error.message}>
        <ActionButton icon="refresh" label="Try again" onPress={() => saved.refetch()} />
      </Empty>
    );
  }
  if (!saved.data) return <Busy />;
  if (!saved.data.length) {
    return (
      <Empty icon="bookmark-outline" title="No saved routes yet" detail="Open a wall in 3D, pick a route and tap its bookmark to keep it here.">
        <ActionButton icon="compass-outline" label="Find a wall" onPress={() => router.navigate('/(tabs)/(explore)/explore')} primary />
      </Empty>
    );
  }

  const walls = new Map<string, SavedRoute[]>();
  for (const route of saved.data) walls.set(route.wall_uuid, [...(walls.get(route.wall_uuid) ?? []), route]);
  const climbedOn = new Map((climbed.data ?? []).map((c) => [c.climb_uuid, c.climbed_on]));

  return (
    <View>
      {[...walls].map(([wallUuid, routes]) => (
        <WallGroup key={wallUuid} wallUuid={wallUuid} saved={routes} climbedOn={climbedOn} />
      ))}
      <AppText type="small" color="textSecondary" style={styles.note}>
        Tap a route to open its wall with that route picked. Tap its bookmark to take it off this list.
      </AppText>
    </View>
  );
}

/**
 * One wall and the routes saved on it. The names and grades come with the
 * saves, so the list shows at once; each route's number on the wall and
 * whether it's drawn in 3D fill in once the wall has loaded.
 */
function WallGroup({ wallUuid, saved, climbedOn }: { wallUuid: string; saved: SavedRoute[]; climbedOn: Map<string, string> }) {
  const theme = useTheme();
  const area = useArea(wallUuid);
  const model = useLatestModel(wallUuid);
  const lines = useRouteLines(model.data?.id);
  const setSaved = useSetSaved();

  const hasModel = model.data != null;
  const linesKnown = lines.data !== undefined;
  const onWall = new Map<string, ShownRoute>(
    area.data ? wallRoutes(area.data.climbs, lines.data ?? []).map((r) => [r.uuid, { ...r, color: lineColor(r.grade) }]) : [],
  );
  const name = area.data?.name ?? saved[0].wall_name;
  const place = placeName(area.data);

  return (
    <View>
      <View style={styles.wall}>
        <View style={styles.thumb}>
          {wallUuid === FEATURED_WALL.uuid ? (
            <Image
              source={FEATURED_WALL.drawn}
              contentFit="fill"
              style={[styles.still, { width: THUMB.width * STILL.scale, left: THUMB.width * STILL.left, top: THUMB.width * STILL.top }]}
            />
          ) : (
            <Ionicons name="cube-outline" size={24} color={OnModel.muted} />
          )}
        </View>
        <View style={styles.flex}>
          <AppText numberOfLines={1} style={[styles.wallName, { fontFamily: SerifFont }]}>
            {name}
          </AppText>
          {place ? (
            <AppText type="small" color="textSecondary" numberOfLines={1}>
              {place}
            </AppText>
          ) : null}
        </View>
        {hasModel ? (
          <PillButton icon="cube-outline" label="3D" hint={`Open ${name} in 3D`} onPress={() => router.push(`/walls/${wallUuid}` as Href)} />
        ) : null}
      </View>
      <View style={[styles.rows, { borderTopColor: theme.border }]}>
        {saved.map((route) => {
          const found = onWall.get(route.climb_uuid);
          const drawn = hasModel && linesKnown && found ? (found.line ? 'In 3D' : 'Not drawn yet') : null;
          const day = climbedOn.get(route.climb_uuid);
          const kind = found ? disciplineText(found.disciplines) : '';
          // With a climb to mention there's no room for the type as well.
          const details = (day ? [drawn, `Climbed ${dayLabel(day)}`] : [kind, drawn]).filter(Boolean).join(' · ');
          return (
            <Pressable
              key={route.climb_uuid}
              role="link"
              accessibilityLabel={[route.name, route.grade ?? 'no grade', details].filter(Boolean).join(', ')}
              onPress={() => router.push(routeOnWall(wallUuid, route.climb_uuid))}
              style={({ pressed }) => [styles.row, { borderBottomColor: theme.border }, pressed && { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.badge}>{found ? <NumberBadge route={found} linesKnown={linesKnown} size={BADGE} /> : null}</View>
              <View style={styles.flex}>
                <AppText numberOfLines={1} style={styles.name}>
                  {route.name}
                </AppText>
                {details ? (
                  <AppText type="small" color="textSecondary" numberOfLines={1}>
                    {details}
                  </AppText>
                ) : null}
              </View>
              <Pressable
                role="button"
                accessibilityLabel={`Take ${route.name} off your saved routes`}
                hitSlop={10}
                onPress={() =>
                  setSaved.mutate({
                    route: { climbUuid: route.climb_uuid, wallUuid, name: route.name, grade: route.grade, wallName: route.wall_name },
                    saved: false,
                  })
                }
                style={({ pressed }) => pressed && styles.pressed}>
                <Ionicons name="bookmark" size={22} color={theme.accent} />
              </Pressable>
              <GradePill grade={gradeFromText(route.grade)} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  wall: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - Spacing.one, paddingHorizontal: GUTTER, paddingTop: Spacing.three - Spacing.half, paddingBottom: Spacing.two + Spacing.half },
  thumb: { ...THUMB, borderRadius: 12, overflow: CLIP, backgroundColor: VIEWER_BACKGROUND, alignItems: 'center', justifyContent: 'center' },
  still: { position: 'absolute', aspectRatio: FEATURED_WALL.aspect },
  wallName: { fontSize: 22, lineHeight: 26 },
  rows: { borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    minHeight: TapTarget + Spacing.one,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    paddingHorizontal: GUTTER,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: { width: BADGE, height: BADGE },
  name: { fontWeight: '600' },
  pressed: { opacity: 0.6 },
  note: { paddingHorizontal: GUTTER, paddingVertical: Spacing.three - Spacing.half },
});
