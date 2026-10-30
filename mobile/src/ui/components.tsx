import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Spacing, TapTarget } from '@/constants/theme';
import type { Crumb, Discipline, Grade, Uuid } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';
import { useHrefs } from '@/ui/nav';
import { AppText } from '@/ui/text';

/** A full-width tappable list row that opens `href`, or runs `onPress` instead. */
export function LinkRow({
  href,
  onPress,
  leading,
  title,
  subtitle,
  trailing,
  accessibilityLabel,
}: ({ href: Href; onPress?: never } | { onPress: () => void; href?: never }) & {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    // A plain Pressable rather than <Link asChild>: on web the link wrapper drops the row's layout.
    <Pressable
      role={href ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel}
      onPress={href ? () => router.push(href) : onPress}
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

/** A count with its noun, like "1 wall" or "1,204 walls". */
export function count(n: number, noun: string): string {
  return `${n.toLocaleString()} ${noun}${n === 1 ? '' : 's'}`;
}

export function climbCount(n: number): string {
  return count(n, 'route');
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

/** Opens a wall's 3D model, with one of its routes selected if given. */
export function WallLink({ wallUuid, route, label }: { wallUuid: Uuid; route?: Uuid; label: string }) {
  const theme = useTheme();
  const href = (route ? `/walls/${wallUuid}?route=${route}` : `/walls/${wallUuid}`) as Href;
  return (
    <Pressable
      role="link"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.wallLink, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
      <Ionicons name="cube-outline" size={22} color={theme.accentText} />
      <AppText style={[styles.wallLinkText, { color: theme.accentText }]}>{label}</AppText>
    </Pressable>
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
  wallLink: {
    minHeight: TapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 12,
  },
  wallLinkText: { fontWeight: '700' },
  pressed: { opacity: 0.8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  centerText: { textAlign: 'center' },
  section: { gap: Spacing.one },
});
