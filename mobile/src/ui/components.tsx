import { Link, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Spacing, TapTarget } from '@/constants/theme';
import type { Crumb, Discipline, Grade } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';
import { useHrefs } from '@/ui/nav';
import { AppText } from '@/ui/text';

/** A full-width tappable list row. */
export function LinkRow({
  href,
  leading,
  title,
  subtitle,
  trailing,
}: {
  href: Href;
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  return (
    // A plain Pressable rather than <Link asChild>: on web the link wrapper drops the row's layout.
    <Pressable
      role="link"
      onPress={() => router.push(href)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      {leading}
      <View style={styles.rowText}>
        <AppText numberOfLines={2} style={styles.rowTitle}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText type="small" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

export function GradeBadge({ grade, large }: { grade: Grade | null; large?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme.text }, large && styles.badgeLarge]}>
      <AppText
        type={large ? 'heading' : 'body'}
        style={[styles.badgeText, { color: theme.background }]}>
        {grade?.text ?? '?'}
      </AppText>
    </View>
  );
}

/** Topo-style number for a route's position on a wall. */
export function TopoNumber({ n }: { n: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.topo, { borderColor: theme.text }]}>
      <AppText style={styles.badgeText}>{n}</AppText>
    </View>
  );
}

const DISCIPLINE_LABELS: Record<Discipline, string> = {
  sport: 'Sport',
  trad: 'Trad',
  tr: 'Top rope',
  boulder: 'Boulder',
  alpine: 'Alpine',
  ice: 'Ice',
  mixed: 'Mixed',
  aid: 'Aid',
  dws: 'Deep water solo',
  snow: 'Snow',
};

export function climbCount(n: number): string {
  return n === 1 ? '1 route' : `${n.toLocaleString()} routes`;
}

export function disciplineText(disciplines: Discipline[]): string {
  return disciplines.map((d) => DISCIPLINE_LABELS[d]).join(', ');
}

/** Tappable path back up the area hierarchy. */
export function Breadcrumb({ path }: { path: Crumb[] }) {
  const hrefs = useHrefs();
  const theme = useTheme();
  return (
    <View style={styles.crumbs}>
      {path.map((c, i) => (
        <View key={c.uuid} style={styles.crumb}>
          {i > 0 ? <AppText color="textSecondary"> › </AppText> : null}
          <Link href={hrefs.area(c.uuid)} asChild>
            <Pressable hitSlop={8}>
              <AppText style={[styles.crumbText, { color: theme.accent }]}>{c.name}</AppText>
            </Pressable>
          </Link>
        </View>
      ))}
    </View>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.text} />
    </View>
  );
}

export function Message({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.center}>
      <AppText type="heading" style={styles.centerText}>
        {title}
      </AppText>
      {detail ? (
        <AppText color="textSecondary" style={styles.centerText}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText type="label" color="textSecondary">
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1 },
  rowTitle: { fontWeight: '600' },
  badge: {
    minWidth: 64,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
    alignItems: 'center',
  },
  badgeLarge: { minWidth: 88, paddingVertical: Spacing.two },
  badgeText: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  topo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crumbs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  crumb: { flexDirection: 'row', alignItems: 'center' },
  crumbText: { fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  centerText: { textAlign: 'center' },
  section: { gap: Spacing.one },
});
