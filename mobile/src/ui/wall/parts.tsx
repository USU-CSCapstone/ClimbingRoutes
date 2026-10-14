import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps, type ReactElement, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
  type ViewToken,
} from 'react-native';

import { Colors, Difficulty, Spacing, TapTarget, UngradedLine } from '@/constants/theme';
import { difficultyBand, gradeValue } from '@/core/grades';
import type { Area, Grade, Uuid } from '@/core/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { climbCount, disciplineText } from '@/ui/components';
import { AppText } from '@/ui/text';
import type { ShownRoute } from '@/ui/wall/types';

/** Dark glass for controls that float over the model. */
export const OnModel = { background: 'rgba(15, 16, 19, 0.78)', text: Colors.dark.text, muted: Colors.dark.textSecondary };

/** The route's number on the wall: filled in its line color once drawn, dashed until then. */
export function NumberBadge({
  route,
  linesKnown,
  size = 28,
}: {
  route: ShownRoute;
  /** False until the route lines file has loaded, so "not drawn" isn't claimed early. */
  linesKnown: boolean;
  size?: number;
}) {
  const theme = useTheme();
  const drawn = route.line != null;
  return (
    <View
      style={[
        styles.number,
        { width: size, height: size, borderRadius: size / 2 },
        drawn
          ? { backgroundColor: route.color, borderColor: 'rgba(0, 0, 0, 0.25)' }
          : [linesKnown && styles.dashed, { borderColor: theme.textSecondary }],
      ]}>
      <AppText
        style={[
          styles.numberText,
          { fontSize: Math.round(size * 0.46), lineHeight: Math.round(size * 0.6) },
          { color: drawn ? '#000000' : theme.textSecondary },
        ]}>
        {route.number}
      </AppText>
    </View>
  );
}

/** A grade tinted by difficulty: green, blue, amber and red from easiest to hardest. */
export function GradePill({ grade, large }: { grade: Grade | null; large?: boolean }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const band = difficultyBand(grade);
  const tint = band == null ? { bg: theme.backgroundElement, text: theme.text } : Difficulty[band][dark ? 'dark' : 'light'];
  return (
    <View style={[styles.pill, large && styles.pillLarge, { backgroundColor: tint.bg }]}>
      <AppText style={[styles.pillText, large && styles.pillTextLarge, { color: tint.text }]}>{grade?.text ?? '?'}</AppText>
    </View>
  );
}

/** Short facts for the wall's header, like "6 sport", "5.5 to 5.10a" and "2 in 3D". */
export function wallFacts(routes: ShownRoute[], linesKnown: boolean): string[] {
  if (!routes.length) return [];
  const facts: string[] = [];
  const kinds = new Set(routes.map((r) => r.disciplines[0] ?? null));
  const [only] = kinds;
  facts.push(kinds.size === 1 && only ? `${routes.length} ${disciplineText([only]).toLowerCase()}` : climbCount(routes.length));
  const graded = routes
    .map((r) => ({ grade: r.grade, value: gradeValue(r.grade) }))
    .filter((g): g is { grade: Grade; value: number } => g.grade != null && g.value != null)
    .sort((a, b) => a.value - b.value);
  if (graded.length) {
    const low = graded[0].grade.text;
    const high = graded[graded.length - 1].grade.text;
    facts.push(low === high ? low : `${low} to ${high}`);
  }
  if (linesKnown) {
    const drawn = routes.filter((r) => r.line).length;
    facts.push(drawn ? `${drawn} in 3D` : 'None in 3D yet');
  }
  return facts;
}

export function FactChips({ facts, onModel }: { facts: string[]; onModel?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {facts.map((fact) => (
        <View
          key={fact}
          style={[styles.chip, { backgroundColor: onModel ? OnModel.background : theme.backgroundElement }]}>
          <AppText type="small" style={{ color: onModel ? OnModel.text : theme.text }}>
            {fact}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const BAND_LABELS = {
  yds: ['5.7 and under', '5.8 to 5.9', '5.10', '5.11 and up'],
  vscale: ['V0 to V2', 'V3 to V5', 'V6 to V8', 'V9 and up'],
};

/** How many routes fall in each difficulty band, as a small bar chart. */
export function GradeSpread({ routes }: { routes: ShownRoute[] }) {
  const theme = useTheme();
  const counts = [0, 0, 0, 0];
  let boulders = 0;
  for (const r of routes) {
    const band = difficultyBand(r.grade);
    if (band == null) continue;
    counts[band] += 1;
    if (r.grade?.system === 'vscale') boulders += 1;
  }
  const graded = counts.reduce((a, b) => a + b, 0);
  if (!graded) return null;
  const labels = boulders > graded / 2 ? BAND_LABELS.vscale : BAND_LABELS.yds;
  const most = Math.max(...counts);
  return (
    <View
      accessible
      accessibilityLabel={`Grades: ${counts.map((count, i) => `${count} ${Difficulty[i].name}`).join(', ')}`}
      style={styles.spread}>
      {counts.map((count, i) => (
        <View key={labels[i]} style={styles.spreadRow}>
          <AppText type="small" color="textSecondary" style={styles.spreadLabel}>
            {labels[i]}
          </AppText>
          <View style={[styles.spreadTrack, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.spreadBar, { width: `${(100 * count) / most}%`, backgroundColor: Difficulty[i].bar }]} />
          </View>
          <AppText type="small" color="textSecondary" style={styles.spreadCount}>
            {count}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Where the wall is, like "Logan Canyon, Utah". */
export function placeName(area: Area | null | undefined): string | null {
  const parent = area?.path.at(-1)?.name;
  if (!area || !parent) return null;
  const state = area.path[1]?.name;
  return state && state !== parent ? `${parent}, ${state}` : parent;
}

export function RoundButton({
  icon,
  label,
  onPress,
  disabled,
  onModel,
  size = 40,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Dark glass, for buttons that float over the model. */
  onModel?: boolean;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.round,
        { width: size, height: size, borderRadius: size / 2 },
        onModel
          ? { backgroundColor: OnModel.background }
          : { backgroundColor: theme.background, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Ionicons name={icon} size={Math.round(size * 0.55)} color={onModel ? OnModel.text : theme.text} />
    </Pressable>
  );
}

/** A labeled button in dark glass, for controls that float over the model. */
export function GlassButton({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.glass, pressed && styles.pressed]}>
      <Ionicons name={icon} size={16} color={OnModel.text} />
      <AppText type="small" style={styles.glassText}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** The wall's routes, left to right. A route picked elsewhere scrolls into view. */
export function RouteList({
  routes,
  selected,
  onPress,
  linesKnown,
  header,
  contentContainerStyle,
}: {
  routes: ShownRoute[];
  selected: Uuid | null;
  onPress: (uuid: Uuid) => void;
  linesKnown: boolean;
  header?: ReactElement;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const list = useRef<FlatList<ShownRoute>>(null);
  const visible = useRef(new Set<string>());
  const retries = useRef(0);
  // FlatList throws if this handler ever changes, so keep the first one (state survives hot reloads).
  const [onViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ViewToken<ShownRoute>[] }) => {
        visible.current = new Set(viewableItems.map((v) => v.key));
      },
  );
  const index = routes.findIndex((r) => r.uuid === selected);

  useEffect(() => {
    if (index < 0 || !selected || visible.current.has(selected)) return;
    retries.current = 0;
    list.current?.scrollToIndex({ index, viewPosition: 0.5 });
  }, [index, selected]);

  return (
    <FlatList
      ref={list}
      data={routes}
      keyExtractor={(r) => r.uuid}
      extraData={selected}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={VIEWABILITY}
      onScrollToIndexFailed={({ index: failed }) => {
        // Rows can't be scrolled to until they've been measured, so try again shortly.
        if (retries.current >= 3) return;
        retries.current += 1;
        setTimeout(() => list.current?.scrollToIndex({ index: failed, viewPosition: 0.5 }), 250);
      }}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <RouteRow route={item} selected={item.uuid === selected} onPress={onPress} linesKnown={linesKnown} />
      )}
      contentContainerStyle={contentContainerStyle}
    />
  );
}

/** A row counts as on screen once it's almost fully visible. */
const VIEWABILITY = { itemVisiblePercentThreshold: 90 };

function RouteRow({
  route,
  selected,
  onPress,
  linesKnown,
}: {
  route: ShownRoute;
  selected: boolean;
  onPress: (uuid: Uuid) => void;
  linesKnown: boolean;
}) {
  const theme = useTheme();
  const status = route.line ? 'In 3D' : linesKnown ? 'Not drawn yet' : null;
  const details = [disciplineText(route.disciplines), status].filter(Boolean).join(' · ');
  return (
    <Pressable
      role="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[`${route.number}. ${route.name}`, route.grade?.text ?? 'no grade', status?.toLowerCase()]
        .filter(Boolean)
        .join(', ')}
      onPress={() => onPress(route.uuid)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        (selected || pressed) && { backgroundColor: theme.backgroundElement },
      ]}>
      {selected ? (
        <View
          style={[styles.selectedBar, { backgroundColor: route.color === UngradedLine ? theme.text : route.color }]}
        />
      ) : null}
      <NumberBadge route={route} linesKnown={linesKnown} />
      <View style={styles.rowText}>
        <AppText numberOfLines={1} style={styles.rowTitle}>
          {route.name}
        </AppText>
        <AppText type="small" color="textSecondary" numberOfLines={1}>
          {details}
        </AppText>
      </View>
      <GradePill grade={route.grade} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  number: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  dashed: { borderStyle: 'dashed' },
  pill: { minWidth: 52, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: 6, alignItems: 'center' },
  pillLarge: { minWidth: 64, paddingVertical: Spacing.one },
  pillText: { fontSize: 15, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pillTextLarge: { fontSize: 17, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + Spacing.half },
  chip: { paddingHorizontal: Spacing.two + Spacing.half, paddingVertical: Spacing.half, borderRadius: 12 },
  spread: { gap: Spacing.one },
  spreadRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  spreadLabel: { width: 104 },
  spreadTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  spreadBar: { height: '100%', borderRadius: 4 },
  spreadCount: { width: 20, textAlign: 'right', fontVariant: ['tabular-nums'] },
  round: { alignItems: 'center', justifyContent: 'center' },
  glass: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three - Spacing.one,
    borderRadius: 18,
    backgroundColor: OnModel.background,
  },
  glassText: { color: OnModel.text, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  row: {
    minHeight: TapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectedBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  rowText: { flex: 1 },
  rowTitle: { fontWeight: '600' },
});
