import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SerifFont, Spacing } from '@/constants/theme';
import type { ModelStatus, WallModel } from '@/core/database';
import type { Uuid } from '@/core/types';
import { wallRoutes } from '@/core/walls';
import { useRouteLines } from '@/data/models';
import { useArea } from '@/data/queries';
import { useModelFileUrl, useWallModel } from '@/data/review';
import { useTheme } from '@/hooks/use-theme';
import { Loading, Message } from '@/ui/components';
import { modelSummary } from '@/ui/review/model-summary';
import { AppText } from '@/ui/text';
import { ModelLayer, type ModelStatus as LoadStatus, VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import { GlassButton, lineColor, RouteList } from '@/ui/wall/parts';
import type { ShownRoute } from '@/ui/wall/types';
import type { Insets, ViewerRoute } from '@/viewer/types';

const STATUS: Record<ModelStatus, string> = {
  needs_review: 'Waiting for review',
  published: 'Published',
  rejected: 'Rejected',
};
const PANEL_WIDTH = 360;
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** /moderate/<model id>: one model's review page, for a laptop browser. */
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const model = useWallModel(id);

  if (model.isPending) return <Loading />;
  if (model.error) return <Message title="Couldn't load the model" detail={model.error.message} />;
  if (!model.data) return <Message title="Model not found" />;
  return <Review model={model.data} />;
}

/** The model beside the wall's routes, left to right, marking which are drawn on this version. */
function Review({ model }: { model: WallModel }) {
  const theme = useTheme();
  const area = useArea(model.wall_uuid);
  const saved = useRouteLines(model.id);
  const file = useModelFileUrl(model);
  const [selected, setSelected] = useState<Uuid | null>(null);
  const [load, setLoad] = useState<LoadStatus>({ attempt: 0, percent: null, info: null, error: null });
  const [wholeWall, setWholeWall] = useState(0);

  const name = area.data?.name ?? 'Wall';
  const linesKnown = saved.data !== undefined;
  const routes: ShownRoute[] = area.data
    ? wallRoutes(area.data.climbs, saved.data ?? []).map((r) => ({ ...r, color: lineColor(r.grade) }))
    : [];
  const lines: ViewerRoute[] = routes.flatMap((r) =>
    r.line
      ? [{ uuid: r.uuid, name: r.name, grade: r.grade, color: r.color, points: r.line.points, normals: r.line.normals }]
      : [],
  );
  const routesMessage = area.isPending
    ? 'Loading routes…'
    : area.error
      ? `Couldn't load the routes: ${area.error.message}`
      : routes.length === 0
        ? 'OpenBeta lists no routes on this wall'
        : 'Routes, left to right';
  const toggle = (uuid: Uuid) => setSelected((current) => (current === uuid ? null : uuid));

  let viewer;
  if (file.isPending) viewer = <Loading />;
  else if (file.error) viewer = <Message title="Couldn't open the model file" detail={file.error.message} />;
  else if (!file.data) viewer = <Message title="No model file" detail="A rejected model's file is removed." />;
  else {
    viewer = (
      <>
        <ModelLayer
          url={file.data}
          lines={lines}
          highlighted={selected && lines.some((l) => l.uuid === selected) ? selected : null}
          insets={NO_INSETS}
          showWholeWall={wholeWall}
          status={load}
          onProgress={(percent) => setLoad((s) => (s.percent === percent ? s : { ...s, percent }))}
          onLoad={(info) => setLoad((s) => ({ ...s, info }))}
          onError={(error) => setLoad((s) => ({ ...s, error }))}
          onRetry={() => {
            // The signed link may have run out, so get a new one too.
            file.refetch();
            setLoad((s) => ({ attempt: s.attempt + 1, percent: null, info: null, error: null }));
          }}
          onRouteTap={toggle}
          onEmptyTap={() => setSelected(null)}
        />
        <View style={styles.tools}>
          <GlassButton icon="scan-outline" label="Whole wall" onPress={() => setWholeWall((n) => n + 1)} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Review · ${name} v${model.version}` }} />
      <View style={styles.row}>
        <View style={[styles.panel, { backgroundColor: theme.background, borderRightColor: theme.border }]}>
          <RouteList
            routes={routes}
            selected={selected}
            onPress={toggle}
            linesKnown={linesKnown}
            header={
              <View style={styles.header}>
                <AppText style={[styles.wall, { fontFamily: SerifFont }]}>{name}</AppText>
                <AppText color="textSecondary">{modelSummary(model)}</AppText>
                <AppText style={styles.status}>{STATUS[model.status]}</AppText>
                {model.review_note ? <AppText color="textSecondary">{model.review_note}</AppText> : null}
                <AppText type="label" color="textSecondary" style={styles.label}>
                  {routesMessage}
                </AppText>
              </View>
            }
          />
        </View>
        <View style={styles.model}>{viewer}</View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  panel: { width: PANEL_WIDTH, borderRightWidth: StyleSheet.hairlineWidth },
  header: { padding: Spacing.three, gap: Spacing.two },
  wall: { fontSize: 30, lineHeight: 36 },
  status: { fontWeight: '700' },
  label: { marginTop: Spacing.two },
  model: { flex: 1, backgroundColor: VIEWER_BACKGROUND },
  tools: { position: 'absolute', top: Spacing.three, right: Spacing.three },
});
