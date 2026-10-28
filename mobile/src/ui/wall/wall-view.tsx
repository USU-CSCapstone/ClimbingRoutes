import { type Href, router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Difficulty, SerifFont, Spacing, UngradedLine } from '@/constants/theme';
import { difficultyBand } from '@/core/grades';
import type { Grade, Uuid } from '@/core/types';
import type { PublishedModel } from '@/core/models';
import { wallRoutes } from '@/core/walls';
import { useRouteLines } from '@/data/models';
import { useArea } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/text';
import { ModelLayer, type ModelStatus, VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import {
  FactChips,
  GlassButton,
  GradeSpread,
  OnModel,
  placeName,
  RoundButton,
  RouteList,
  wallFacts,
} from '@/ui/wall/parts';
import { CARD_HEIGHT, RouteCard } from '@/ui/wall/route-card';
import { RouteStrip, stripHeight } from '@/ui/wall/route-strip';
import { RoutesSheet } from '@/ui/wall/routes-sheet';
import type { ShownRoute, WallInfo } from '@/ui/wall/types';
import type { Insets, ViewerRoute } from '@/viewer/types';

/** From this width the routes sit in a panel beside the model instead of along the bottom. */
const WIDE = 900;
const MARGIN = Spacing.three - Spacing.one;
const TITLE_HEIGHT = 56;
const BUTTON_HEIGHT = 36;
const PANEL_WIDTH = 360;
const EDGE = Spacing.three;

/**
 * A wall's 3D model filling the screen, with its routes drawn on the rock in
 * their difficulty's color. On a phone the routes run along the bottom as
 * pills, then as swipeable cards once one is picked; wider screens list them
 * in a panel beside the model.
 */
export function WallView({
  wall,
  model,
  selected,
  onSelect,
}: {
  wall: WallInfo;
  model: PublishedModel;
  selected: Uuid | null;
  onSelect: (uuid: Uuid | null) => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const wide = width >= WIDE;
  const area = useArea(wall.uuid);
  const saved = useRouteLines(model.id);
  const [status, setStatus] = useState<ModelStatus>({ attempt: 0, percent: null, info: null, error: null });
  const [fps, setFps] = useState<number | null>(null);
  const [wholeWall, setWholeWall] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // A copy saved on the device counts, so a wall that has loaded once works offline.
  const linesKnown = saved.data !== undefined;
  // Wait for OpenBeta's order so each route keeps its number.
  const routes: ShownRoute[] = area.data
    ? wallRoutes(area.data.climbs, saved.data ?? []).map((r) => ({ ...r, color: lineColor(r.grade) }))
    : [];
  const lines: ViewerRoute[] = routes.flatMap((r) =>
    r.line
      ? [{ uuid: r.uuid, name: r.name, grade: r.grade, color: r.color, points: r.line.points, normals: r.line.normals }]
      : [],
  );
  const index = routes.findIndex((r) => r.uuid === selected);
  const selectedRoute = routes[index] ?? null;
  const facts = wallFacts(routes, linesKnown);
  const place = placeName(area.data);
  const notice = selectedRoute && !selectedRoute.line && linesKnown ? `${selectedRoute.name} isn't drawn yet` : null;
  const routesMessage = area.isPending
    ? 'Loading routes…'
    : area.error
      ? `Couldn't load the routes: ${area.error.message}`
      : routes.length === 0
        ? 'OpenBeta lists no routes on this wall'
        : null;

  const insets: Insets = wide
    ? { top: 0, right: 0, bottom: selectedRoute ? CARD_HEIGHT + 2 * EDGE : 0, left: PANEL_WIDTH + 2 * EDGE }
    : {
        top: safe.top + MARGIN + TITLE_HEIGHT,
        right: 0,
        bottom: safe.bottom + MARGIN + stripHeight(index >= 0) + Spacing.two + BUTTON_HEIGHT,
        left: 0,
      };

  /** Tapping the selected route again clears the selection. */
  function toggle(uuid: Uuid) {
    onSelect(uuid === selectedRoute?.uuid ? null : uuid);
  }

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace(`/(tabs)/(explore)/area/${wall.uuid}` as Href);
  }

  function retry() {
    setStatus((s) => ({ attempt: s.attempt + 1, percent: null, info: null, error: null }));
    saved.refetch();
  }

  const devStats =
    __DEV__ && status.info ? (
      <View style={styles.glassChip}>
        <AppText type="small" style={styles.onModel}>
          {fps ?? '–'} fps · {(status.info.loadMs / 1000).toFixed(1)} s
        </AppText>
      </View>
    ) : null;
  const noticeChip = notice ? (
    <View style={styles.glassChip}>
      <AppText type="small" numberOfLines={1} style={styles.onModel}>
        {notice}
      </AppText>
    </View>
  ) : null;
  const showWholeWall = () => setWholeWall((n) => n + 1);

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: wall.name }} />
      <StatusBar style="light" />
      <ModelLayer
        model={model}
        lines={lines}
        highlighted={selectedRoute?.line ? selectedRoute.uuid : null}
        insets={insets}
        showWholeWall={wholeWall}
        status={status}
        onProgress={(percent) => setStatus((s) => (s.percent === percent ? s : { ...s, percent }))}
        onLoad={(info) => setStatus((s) => ({ ...s, info }))}
        onError={(error) => setStatus((s) => ({ ...s, error }))}
        onRetry={retry}
        onRouteTap={toggle}
        onEmptyTap={() => onSelect(null)}
        onFps={__DEV__ ? setFps : undefined}
      />

      {wide ? (
        <>
          <View style={[styles.panel, { backgroundColor: theme.background }]}>
            <RouteList
              routes={routes}
              selected={selectedRoute?.uuid ?? null}
              onPress={toggle}
              linesKnown={linesKnown}
              header={
                <View style={styles.panelHeader}>
                  <View style={styles.panelBack}>
                    <RoundButton icon="chevron-back" label="Back" onPress={back} size={34} />
                    <AppText type="small" color="textSecondary" numberOfLines={1} style={styles.flex}>
                      {place ?? ''}
                    </AppText>
                  </View>
                  <AppText style={[styles.panelTitle, { fontFamily: SerifFont }]}>{wall.name}</AppText>
                  <FactChips facts={facts} />
                  <GradeSpread routes={routes} />
                  <AppText type="label" color="textSecondary" style={styles.listLabel}>
                    {routesMessage ?? 'Routes, left to right'}
                  </AppText>
                </View>
              }
              contentContainerStyle={styles.panelList}
            />
          </View>
          <View style={styles.wideTools}>
            {devStats}
            <GlassButton icon="scan-outline" label="Whole wall" onPress={showWholeWall} />
          </View>
          {noticeChip ? (
            <View style={[styles.wideNotice, { bottom: EDGE + (selectedRoute ? CARD_HEIGHT + MARGIN : 0) }]}>
              {noticeChip}
            </View>
          ) : null}
          {selectedRoute ? (
            <RouteCard
              route={selectedRoute}
              index={index}
              total={routes.length}
              linesKnown={linesKnown}
              onPrevious={() => onSelect(routes[index - 1]?.uuid ?? selectedRoute.uuid)}
              onNext={() => onSelect(routes[index + 1]?.uuid ?? selectedRoute.uuid)}
              onClose={() => onSelect(null)}
              style={styles.wideCard}
            />
          ) : null}
        </>
      ) : (
        <>
          <View
            style={[
              styles.titleBar,
              { top: safe.top + MARGIN, left: safe.left + MARGIN, right: safe.right + MARGIN },
            ]}>
            <RoundButton icon="chevron-back" label="Back" onPress={back} onModel />
            <View style={styles.flex}>
              <AppText numberOfLines={1} style={[styles.titleName, { fontFamily: SerifFont }]}>
                {wall.name}
              </AppText>
              {place ? (
                <AppText type="small" numberOfLines={1} style={styles.titlePlace}>
                  {place}
                </AppText>
              ) : null}
            </View>
            <RoundButton icon="scan-outline" label="Show the whole wall" onPress={showWholeWall} onModel />
          </View>
          <View
            style={[
              styles.phoneTop,
              { top: safe.top + MARGIN + TITLE_HEIGHT + Spacing.two, left: safe.left + MARGIN, right: safe.right + MARGIN },
            ]}>
            <View style={styles.flex}>{selectedRoute ? null : <FactChips facts={facts} onModel />}</View>
            {devStats}
          </View>
          <View style={[styles.phoneBottom, { bottom: safe.bottom + MARGIN }]}>
            <View style={[styles.buttonRow, { paddingLeft: safe.left + MARGIN, paddingRight: safe.right + MARGIN }]}>
              {routesMessage ? (
                <View style={styles.glassChip}>
                  <AppText type="small" numberOfLines={1} style={styles.onModel}>
                    {routesMessage}
                  </AppText>
                </View>
              ) : (
                <GlassButton icon="list" label="All routes" onPress={() => setSheetOpen(true)} />
              )}
              {noticeChip}
            </View>
            <RouteStrip routes={routes} index={index} linesKnown={linesKnown} onSelect={onSelect} />
          </View>
          {sheetOpen ? (
            <RoutesSheet
              wall={wall}
              place={place}
              facts={facts}
              routes={routes}
              selected={selectedRoute?.uuid ?? null}
              linesKnown={linesKnown}
              onSelect={onSelect}
              onClose={() => setSheetOpen(false)}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

/** Lines are drawn in their difficulty's color, or white when the grade has no band. */
function lineColor(grade: Grade | null): string {
  const band = difficultyBand(grade);
  return band == null ? UngradedLine : Difficulty[band].line;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: VIEWER_BACKGROUND },
  flex: { flex: 1 },
  onModel: { color: OnModel.text },
  glassChip: {
    minHeight: BUTTON_HEIGHT - Spacing.two,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: 14,
    backgroundColor: OnModel.background,
    flexShrink: 1,
  },
  titleBar: {
    position: 'absolute',
    height: TITLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: TITLE_HEIGHT / 2,
    backgroundColor: OnModel.background,
  },
  titleName: { color: OnModel.text, fontSize: 20, lineHeight: 24 },
  titlePlace: { color: OnModel.muted },
  phoneTop: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  phoneBottom: { position: 'absolute', left: 0, right: 0, gap: Spacing.two },
  buttonRow: { height: BUTTON_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  panel: {
    position: 'absolute',
    top: EDGE,
    left: EDGE,
    bottom: EDGE,
    width: PANEL_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)',
  },
  panelHeader: { padding: Spacing.three, gap: Spacing.three },
  panelBack: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  panelTitle: { fontSize: 32, lineHeight: 38, marginTop: -Spacing.two },
  panelList: { paddingBottom: Spacing.four },
  listLabel: { marginTop: Spacing.one },
  wideTools: { position: 'absolute', top: EDGE, right: EDGE, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  wideNotice: { position: 'absolute', right: EDGE, maxWidth: PANEL_WIDTH },
  wideCard: { position: 'absolute', right: EDGE, bottom: EDGE, width: PANEL_WIDTH },
});
