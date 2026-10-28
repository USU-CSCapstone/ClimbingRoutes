import { Stack } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ROOT_AREA } from '@/core/config';
import type { Area, AreaSummary, ClimbSummary, Uuid } from '@/core/types';
import { useHasModel } from '@/data/models';
import { useArea } from '@/data/queries';
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
import { useHrefs } from '@/ui/nav';
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

  if (isPending) return <Loading />;
  if (error) return <Message title="Couldn't load this area" detail={error.message} />;
  if (!area) return <Message title="Area not found" />;

  const items: Item[] = [
    ...area.children.map((a) => ({ kind: 'area' as const, area: a })),
    ...area.climbs.map((c, i) => ({ kind: 'climb' as const, climb: c, number: i + 1 })),
  ];

  return (
    <>
      <Stack.Screen options={{ title: area.name }} />
      <FlatList
        data={items}
        keyExtractor={(item) => (item.kind === 'area' ? item.area.uuid : item.climb.uuid)}
        ListHeaderComponent={<AreaHeader area={area} />}
        ListEmptyComponent={<Message title="Nothing here yet" detail="OpenBeta has no sub-areas or routes for this area." />}
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

function AreaHeader({ area }: { area: Area }) {
  const hasOrder = area.climbs.some((c) => c.leftRightIndex != null);
  const hasModel = useHasModel(area.uuid);
  return (
    <View style={styles.header}>
      {area.path.length > 0 ? <Breadcrumb path={area.path} /> : null}
      <AppText type="title">{area.name}</AppText>
      <AppText color="textSecondary">{climbCount(area.totalClimbs)}</AppText>
      {area.description ? <AppText numberOfLines={6}>{area.description}</AppText> : null}
      {hasModel ? (
        <View style={styles.wallLink}>
          <WallLink wallUuid={area.uuid} label="View in 3D" />
        </View>
      ) : null}
      {/* Throwaway: the camera test for issue #48. Remove with app/camera-test.tsx. */}
      {__DEV__ && area.uuid === ROOT_AREA.uuid ? (
        <LinkRow href="/camera-test" title="Camera test" subtitle="Development only, for issue #48" />
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
  listLabel: { marginTop: Spacing.two },
  wallLink: { marginTop: Spacing.two },
});
