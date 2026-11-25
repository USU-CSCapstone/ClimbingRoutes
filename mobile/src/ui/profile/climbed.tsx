import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing, TapTarget } from '@/constants/theme';
import type { ClimbedRoute } from '@/core/database';
import { dayName } from '@/core/days';
import { difficultyBand, gradeFromText, gradeValue } from '@/core/grades';
import type { Grade } from '@/core/types';
import { useClimbedRoutes } from '@/data/logbook';
import { useTheme } from '@/hooks/use-theme';
import { Busy, Empty, GUTTER, useTint } from '@/ui/profile/kit';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';
import { GradePill, GradeSpread } from '@/ui/wall/parts';

/** Opens a wall in 3D with one of its routes picked. A wall with no model yet offers a scan instead. */
export function routeOnWall(wallUuid: string, climbUuid: string): Href {
  return `/walls/${wallUuid}?route=${climbUuid}` as Href;
}

/**
 * The routes this account has climbed: how they spread across the grades, then
 * the list, a day at a time with the latest first. On a wide screen the chart
 * sits beside the list.
 */
export function ClimbedTab({ wide }: { wide: boolean }) {
  const climbed = useClimbedRoutes();

  if (climbed.error) {
    return (
      <Empty icon="cloud-offline-outline" title="Couldn't load what you've climbed" detail={climbed.error.message}>
        <ActionButton icon="refresh" label="Try again" onPress={() => climbed.refetch()} />
      </Empty>
    );
  }
  if (!climbed.data) return <Busy />;
  if (!climbed.data.length) {
    return (
      <Empty
        icon="checkmark-circle-outline"
        title="Nothing climbed yet"
        detail="Open a wall in 3D, pick a route you’ve done and tap Climbed it.">
        <ActionButton icon="compass-outline" label="Find a wall" onPress={() => router.navigate('/(tabs)/(explore)/explore')} primary />
      </Empty>
    );
  }

  const graded = climbed.data.map((r) => ({ grade: gradeFromText(r.grade) }));
  const top = hardest(graded.map((g) => g.grade));
  const chart = (
    <View style={styles.chart}>
      <View style={styles.chartHead}>
        <AppText type="label" color="textSecondary">
          By grade
        </AppText>
        {top ? (
          <AppText type="small" color="textSecondary">
            Hardest <AppText type="small" style={styles.bold}>{top}</AppText>
          </AppText>
        ) : null}
      </View>
      <GradeSpread routes={graded} />
    </View>
  );
  const list = byDay(climbed.data).map(({ day, routes }) => (
    <View key={day}>
      <AppText style={styles.day}>{dayName(day)}</AppText>
      {routes.map((route) => (
        <ClimbedRow key={route.climb_uuid} route={route} />
      ))}
    </View>
  ));

  if (wide) {
    return (
      <View style={styles.wide}>
        <View style={styles.wideChart}>{chart}</View>
        <View style={styles.flex}>{list}</View>
      </View>
    );
  }
  return (
    <View>
      {chart}
      <Line />
      {list}
    </View>
  );
}

function ClimbedRow({ route }: { route: ClimbedRoute }) {
  const theme = useTheme();
  const grade = gradeFromText(route.grade);
  return (
    <Pressable
      role="link"
      accessibilityLabel={`${route.name}, ${route.grade ?? 'no grade'}, ${route.wall_name}`}
      onPress={() => router.push(routeOnWall(route.wall_uuid, route.climb_uuid))}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border }, pressed && { backgroundColor: theme.backgroundElement }]}>
      <TickDot grade={grade} />
      <View style={styles.flex}>
        <AppText numberOfLines={1} style={styles.name}>
          {route.name}
        </AppText>
        <AppText type="small" color="textSecondary" numberOfLines={1}>
          {route.wall_name}
        </AppText>
      </View>
      <GradePill grade={grade} />
    </Pressable>
  );
}

/** A tick in the route's difficulty color. */
function TickDot({ grade }: { grade: Grade | null }) {
  const theme = useTheme();
  const band = difficultyBand(grade);
  const tint = useTint(band ?? 0);
  const colors = band == null ? { bg: theme.backgroundElement, text: theme.text } : tint;
  return (
    <View style={[styles.dot, { backgroundColor: colors.bg }]}>
      <Ionicons name="checkmark" size={18} color={colors.text} />
    </View>
  );
}

function Line() {
  const theme = useTheme();
  return <View style={[styles.line, { backgroundColor: theme.border }]} />;
}

/** The climbs of each day, keeping the order they came in: latest day first. */
function byDay(routes: ClimbedRoute[]): { day: string; routes: ClimbedRoute[] }[] {
  const days: { day: string; routes: ClimbedRoute[] }[] = [];
  for (const route of routes) {
    const last = days[days.length - 1];
    if (last?.day === route.climbed_on) last.routes.push(route);
    else days.push({ day: route.climbed_on, routes: [route] });
  }
  return days;
}

/** The hardest grade climbed, like "5.10a", or "5.10a · V4" when there are boulders too. Null if none can be read. */
function hardest(grades: (Grade | null)[]): string | null {
  const best: Partial<Record<'yds' | 'vscale', { text: string; value: number }>> = {};
  for (const grade of grades) {
    const value = gradeValue(grade);
    if (!grade || value == null || (grade.system !== 'yds' && grade.system !== 'vscale')) continue;
    const held = best[grade.system];
    if (!held || value > held.value) best[grade.system] = { text: grade.text, value };
  }
  const parts = [best.yds?.text, best.vscale?.text].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '700' },
  chart: { paddingHorizontal: GUTTER, paddingTop: Spacing.three - Spacing.half, paddingBottom: Spacing.three - Spacing.one, gap: Spacing.two },
  chartHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  line: { height: StyleSheet.hairlineWidth },
  day: { fontWeight: '700', paddingHorizontal: GUTTER, paddingTop: Spacing.three - Spacing.half, paddingBottom: Spacing.one },
  row: {
    minHeight: TapTarget + Spacing.one,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    paddingHorizontal: GUTTER,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { fontWeight: '600' },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  wide: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  wideChart: { width: 300 },
});
