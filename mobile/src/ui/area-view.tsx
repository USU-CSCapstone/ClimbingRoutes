import { Stack } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { hasFilters, matchesClimb, withinDistance } from '@/core/filters';
import type { Area, AreaSummary, ClimbSummary, Uuid } from '@/core/types';
import { useFilters } from '@/data/filters';
import { useUserLocation } from '@/data/location';
import { useHasModel } from '@/data/models';
import { shownArea, useArea, useChildStats } from '@/data/queries';
import {
  Breadcrumb,
  climbCount,
  disciplineText,
  GradeBadge,
  LinkRow,
  Loading,
  Message,
  TopoNumber,
  WallLink,
} from '@/ui/components';
import { FilterBar } from '@/ui/filters';
import { useHrefs } from '@/ui/nav';
import { ScanCard, useNeedsScan } from '@/ui/scan/scan-card';
import { AppText } from '@/ui/text';

type Item =
  | { kind: 'area'; area: AreaSummary }
  | { kind: 'climb'; climb: ClimbSummary; number: number };

/**
 * One page for every level of the hierarchy. Shows sub-areas, or at a wall,
 * its routes numbered left to right like a guidebook topo.
 */
export function AreaView({ uuid }: { uuid: Uuid }) {
  const { data: area, isPending, error, refetch, isRefetching } = useArea(uuid);
  const hrefs = useHrefs();
  const filters = useFilters();
  const { location } = useUserLocation();
  const stats = useChildStats(uuid);

  if (isPending) return <Loading />;
  if (error) return <Message title="Couldn't load this area" detail={error.message} />;
  if (!area) return <Message title="Area not found" />;

  // Routes keep their topo number when others are filtered out. A wall out of range hides all its routes.
  const wallInRange = withinDistance(location, area.location, filters);
  const items: Item[] = [
    ...area.children
      .filter((a) => shownArea(a, stats?.[a.uuid] ?? null, filters, location))
      .map((a) => ({ kind: 'area' as const, area: a })),
    ...area.climbs
      .map((c, i) => ({ kind: 'climb' as const, climb: c, number: i + 1 }))
      .filter((item) => (area.isLeaf ? wallInRange : true) && matchesClimb(item.climb, filters)),
  ];
  const hidden = area.children.length + area.climbs.length - items.length;

  return (
    <>
      <Stack.Screen options={{ title: area.name }} />
      <FlatList
        data={items}
        keyExtractor={(item) => (item.kind === 'area' ? item.area.uuid : item.climb.uuid)}
        ListHeaderComponent={<AreaHeader area={area} hidden={hidden} />}
        ListEmptyComponent={
          hidden > 0 ? (
            <Message title="Nothing matches your filters" detail="Change or clear the filters to see more." />
          ) : (
            <Message title="Nothing here yet" detail="OpenBeta has no sub-areas or routes for this area." />
          )
        }
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) =>
          item.kind === 'area' ? (
            <LinkRow
              href={hrefs.area(item.area.uuid)}
              title={item.area.name}
              subtitle={climbCount(item.area.totalClimbs)}
            />
          ) : (
            <LinkRow
              href={hrefs.climb(item.climb.uuid)}
              leading={<TopoNumber n={item.number} />}
              title={item.climb.name}
              subtitle={disciplineText(item.climb.disciplines)}
              trailing={<GradeBadge grade={item.climb.grade} />}
            />
          )
        }
      />
    </>
  );
}

function AreaHeader({ area, hidden }: { area: Area; hidden: number }) {
  const filtered = hasFilters(useFilters());
  const hasOrder = area.climbs.some((c) => c.leftRightIndex != null);
  const hasModel = useHasModel(area.uuid);
  const needsScan = useNeedsScan(area);
  return (
    <View style={styles.header}>
      <FilterBar style={styles.filters} />
      {area.path.length > 0 ? <Breadcrumb path={area.path} /> : null}
      <AppText type="title">{area.name}</AppText>
      <AppText color="textSecondary">{climbCount(area.totalClimbs)}</AppText>
      {area.description ? <AppText numberOfLines={6}>{area.description}</AppText> : null}
      {hasModel ? (
        <View style={styles.wallLink}>
          <WallLink wallUuid={area.uuid} label="View in 3D" />
        </View>
      ) : null}
      {needsScan ? (
        <View style={styles.wallLink}>
          <ScanCard wallUuid={area.uuid} />
        </View>
      ) : null}
      {filtered && hidden > 0 ? (
        <AppText type="small" color="textSecondary">
          {hidden === 1 ? '1 hidden by filters' : `${hidden} hidden by filters`}
        </AppText>
      ) : null}
      {area.climbs.length > 0 ? (
        <AppText type="label" color="textSecondary" style={styles.listLabel}>
          {hasOrder ? 'Routes, left to right' : 'Routes'}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingBottom: Spacing.five },
  header: { padding: Spacing.three, gap: Spacing.two },
  // The bar's chips scroll edge to edge, past the header's padding.
  filters: { marginHorizontal: -Spacing.three, marginBottom: Spacing.one },
  listLabel: { marginTop: Spacing.two },
  wallLink: { marginTop: Spacing.two },
});
