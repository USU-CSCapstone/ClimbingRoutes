import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { SerifFont, Spacing } from '@/constants/theme';
import type { ModelStatus, WallModel } from '@/core/database';
import type { DrawnLine } from '@/core/models';
import type { Uuid } from '@/core/types';
import { wallRoutes } from '@/core/walls';
import { useRouteLines } from '@/data/models';
import { useArea } from '@/data/queries';
import { useDeleteRouteLine, useModelFileUrl, useSaveRouteLine, useWallModel } from '@/data/review';
import { useTheme } from '@/hooks/use-theme';
import { Loading, Message } from '@/ui/components';
import { DecisionPanel } from '@/ui/review/decision-panel';
import { DrawPanel } from '@/ui/review/draw-panel';
import { modelSummary } from '@/ui/review/model-summary';
import { AppText } from '@/ui/text';
import { ModelLayer, type ModelStatus as LoadStatus, VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import { GlassButton, lineColor, RouteList } from '@/ui/wall/parts';
import type { ShownRoute } from '@/ui/wall/types';
import type { Insets, SurfaceHit, ViewerRoute } from '@/viewer/types';

const STATUS: Record<ModelStatus, string> = {
  needs_review: 'Waiting for review',
  published: 'Published',
  rejected: 'Rejected',
};
const PANEL_WIDTH = 360;
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

type Line = Pick<DrawnLine, 'points' | 'normals'>;

/** /moderate/<model id>: one model's review page, for a laptop browser. */
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const model = useWallModel(id);

  if (model.isPending) return <Loading />;
  if (model.error) return <Message title="Couldn't load the model" detail={model.error.message} />;
  if (!model.data) return <Message title="Model not found" />;
  return <Review model={model.data} />;
}

/**
 * The model beside the wall's routes, left to right, marking which are drawn on
 * this version. Pick a route to draw its line: clicks on the rock add points,
 * kept here until saved to route_lines.
 */
function Review({ model }: { model: WallModel }) {
  const theme = useTheme();
  const area = useArea(model.wall_uuid);
  const saved = useRouteLines(model.id);
  const file = useModelFileUrl(model);
  const saveLine = useSaveRouteLine(model.id);
  const deleteLine = useDeleteRouteLine(model.id);
  const [selected, setSelected] = useState<Uuid | null>(null);
  const [load, setLoad] = useState<LoadStatus>({ attempt: 0, percent: null, info: null, error: null });
  const [wholeWall, setWholeWall] = useState(0);
  // Lines changed since they were last saved, by route. An empty one was cleared.
  const [drafts, setDrafts] = useState<Record<Uuid, Line>>({});
  const [drawing, setDrawing] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  const name = area.data?.name ?? 'Wall';
  const linesKnown = saved.data !== undefined;
  const routes: ShownRoute[] = area.data
    ? wallRoutes(area.data.climbs, saved.data ?? []).map((r) => {
        const draft = drafts[r.uuid];
        const line = draft ? (draft.points.length ? draft : null) : r.line;
        return { ...r, line, color: lineColor(r.grade) };
      })
    : [];
  const lines: ViewerRoute[] = routes.flatMap((r) =>
    r.line
      ? [{ uuid: r.uuid, name: r.name, grade: r.grade, color: r.color, points: r.line.points, normals: r.line.normals }]
      : [],
  );
  const active = routes.find((r) => r.uuid === selected) ?? null;
  const activePoints = active?.line?.points.length ?? 0;
  const savedLine = saved.data?.find((l) => l.climbUuid === selected) ?? null;
  const unsaved = Object.keys(drafts).length > 0;

  function select(uuid: Uuid | null) {
    setSelected(uuid);
    setStatus(null);
    if (!uuid) setDrawing(false);
  }

  /**
   * Changes the selected route's line, starting from its latest draft, or its
   * saved line if it has none. Clicks can arrive faster than the screen renders,
   * so the change mustn't start from the line as last drawn.
   */
  function edit(change: (line: Line) => Line) {
    if (!active) return;
    const uuid = active.uuid;
    const base = savedLine ?? { points: [], normals: [] };
    setDrafts((d) => ({ ...d, [uuid]: change(d[uuid] ?? base) }));
    setStatus(null);
  }

  function addPoint(hit: SurfaceHit | null) {
    if (!drawing || !active) return;
    if (!hit) return setStatus({ text: 'That click missed the wall.' });
    edit((l) => ({ points: [...l.points, hit.point], normals: [...l.normals, hit.normal] }));
  }

  function undo() {
    if (activePoints) edit((l) => ({ points: l.points.slice(0, -1), normals: l.normals.slice(0, -1) }));
  }

  function clear() {
    if (activePoints && confirm(`Clear the line for ${active!.name}?`)) edit(() => ({ points: [], normals: [] }));
  }

  /** Forgets the route's draft once the server has the same line. */
  function settled(uuid: Uuid, text: string) {
    setDrafts(({ [uuid]: _, ...rest }) => rest);
    setStatus({ text });
  }

  function save() {
    if (!active?.line) return;
    const route = active;
    setDrawing(false);
    saveLine.mutate(
      { climbUuid: route.uuid, name: route.name, grade: route.grade?.text ?? null, ...route.line! },
      {
        onSuccess: () => settled(route.uuid, `Saved ${new Date().toLocaleTimeString()}`),
        onError: (e) => setStatus({ text: e.message, error: true }),
      },
    );
  }

  function remove() {
    if (!active || !confirm(`Delete the saved line for ${active.name}?`)) return;
    const uuid = active.uuid;
    setDrawing(false);
    deleteLine.mutate(uuid, {
      onSuccess: () => settled(uuid, 'Line deleted'),
      onError: (e) => setStatus({ text: e.message, error: true }),
    });
  }

  // Keyboard shortcuts while drawing, and a warning before leaving with unsaved lines. Web only.
  const keyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape' && drawing) setDrawing(false);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && drawing) {
      e.preventDefault();
      undo();
    }
  });
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (e: KeyboardEvent) => keyDown(e);
    addEventListener('keydown', onKeyDown);
    return () => removeEventListener('keydown', onKeyDown);
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web' || !unsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', onBeforeUnload);
    return () => removeEventListener('beforeunload', onBeforeUnload);
  }, [unsaved]);

  const routesMessage = area.isPending
    ? 'Loading routes…'
    : area.error
      ? `Couldn't load the routes: ${area.error.message}`
      : routes.length === 0
        ? 'OpenBeta lists no routes on this wall'
        : 'Routes, left to right';
  const toggle = (uuid: Uuid) => select(selected === uuid ? null : uuid);

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
          flyToHighlight={!drawing}
          dimOthers={false}
          showPoints
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
          // While drawing, a click adds a point instead of picking a route.
          onRouteTap={(uuid) => !drawing && toggle(uuid)}
          onEmptyTap={() => !drawing && select(null)}
          onSurfaceTap={addPoint}
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
          <View style={styles.list}>
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
                  {model.status === 'needs_review' ? (
                    <DecisionPanel
                      model={model}
                      name={name}
                      drawn={saved.data?.length ?? 0}
                      total={routes.length}
                      unsaved={unsaved}
                      ready={area.data != null && linesKnown}
                    />
                  ) : null}
                  <AppText type="label" color="textSecondary" style={styles.label}>
                    {routesMessage}
                  </AppText>
                </View>
              }
            />
          </View>
          {active ? (
            <DrawPanel
              route={active}
              points={activePoints}
              drawing={drawing}
              unsaved={active.uuid in drafts}
              savedLine={savedLine != null}
              status={status}
              busy={saveLine.isPending || deleteLine.isPending}
              onDraw={setDrawing}
              onUndo={undo}
              onClear={clear}
              onSave={save}
              onDelete={remove}
            />
          ) : (
            <AppText type="small" color="textSecondary" style={styles.pick}>
              Pick a route to draw or check its line.
            </AppText>
          )}
        </View>
        <View style={styles.model}>{viewer}</View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  panel: { width: PANEL_WIDTH, borderRightWidth: StyleSheet.hairlineWidth },
  list: { flex: 1 },
  pick: { padding: Spacing.three },
  header: { padding: Spacing.three, gap: Spacing.two },
  wall: { fontSize: 30, lineHeight: 36 },
  status: { fontWeight: '700' },
  label: { marginTop: Spacing.two },
  model: { flex: 1, backgroundColor: VIEWER_BACKGROUND },
  tools: { position: 'absolute', top: Spacing.three, right: Spacing.three },
});
