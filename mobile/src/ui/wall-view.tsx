import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { lazy, Suspense, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, TapTarget } from '@/constants/theme';
import { DATA_URL } from '@/core/config';
import type { Area } from '@/core/types';
import { type Wall, type WallRoute, wallRoutes } from '@/core/walls';
import { useArea, useRoutesFile } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { climbCount, disciplineText, GradeBadge, Loading, Message } from '@/ui/components';
import { AppText } from '@/ui/text';
import { ROUTE_COLORS } from '@/viewer/colors';
import type { ModelInfo, ViewerRoute } from '@/viewer/types';

// Loaded on demand so three.js stays out of the app's main web bundle.
const WallViewer = lazy(() => import('@/viewer/wall-viewer'));

/** Model and route list side by side from this width, stacked below it. */
const WIDE = 900;
const VIEWER_BACKGROUND = '#1b1d21';
const ON_DARK = Colors.dark;

type ColoredRoute = WallRoute & { color: string };

/** A wall's 3D model with its routes drawn on the rock, and the route list. */
export function WallView({ wall }: { wall: Wall }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const area = useArea(wall.areaUuid);
  const saved = useRoutesFile(wall.routes);

  // Wait for OpenBeta's order so each route keeps its number and color.
  const routes: ColoredRoute[] = area.data
    ? wallRoutes(area.data.climbs, saved.data?.routes ?? []).map((r) => ({
        ...r,
        color: ROUTE_COLORS[(r.number - 1) % ROUTE_COLORS.length],
      }))
    : [];
  const lines: ViewerRoute[] = routes.flatMap((r) =>
    r.line
      ? [{ uuid: r.uuid, name: r.name, grade: r.grade, color: r.color, points: r.line.points, normals: r.line.normals }]
      : [],
  );
  const drawn = lines.length;
  const linesNote = saved.error
    ? 'route lines unavailable'
    : saved.isPending
      ? null
      : drawn === routes.length && drawn > 0
        ? 'all drawn on the model'
        : `${drawn} drawn on the model`;

  return (
    <View style={[styles.page, wide && styles.pageWide, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: wall.name }} />
      <StatusBar style="light" />
      <ModelPane
        wall={wall}
        lines={lines}
        onRetry={() => saved.refetch()}
        style={wide ? styles.modelWide : styles.modelNarrow}
      />
      <View
        style={[
          wide ? styles.panelWide : styles.panelNarrow,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}>
        <RouteList wall={wall} area={area} routes={routes} linesKnown={saved.isSuccess} linesNote={linesNote} />
      </View>
    </View>
  );
}

function ModelPane({
  wall,
  lines,
  onRetry,
  style,
}: {
  wall: Wall;
  lines: ViewerRoute[];
  onRetry: () => void;
  style: StyleProp<ViewStyle>;
}) {
  const [attempt, setAttempt] = useState(0);
  const [percent, setPercent] = useState<number | null>(null);
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState<number | null>(null);

  function retry() {
    setError(null);
    setInfo(null);
    setPercent(null);
    setAttempt((n) => n + 1);
    onRetry();
  }

  return (
    <View style={[styles.model, style]}>
      <Suspense fallback={null}>
        <WallViewer
          key={attempt}
          model={`${DATA_URL}/models/${encodeURIComponent(wall.model)}`}
          routes={lines}
          onProgress={(fraction) => setPercent(Math.floor(fraction * 100))}
          onLoad={setInfo}
          onError={setError}
          onFps={__DEV__ ? setFps : undefined}
          dom={{ style: styles.fill, scrollEnabled: false }}
        />
      </Suspense>
      {error ? <LoadError message={error} onRetry={retry} /> : info ? null : <LoadProgress percent={percent} />}
      {__DEV__ && info ? <DevStats info={info} fps={fps} /> : null}
      <BackButton wall={wall} />
    </View>
  );
}

function LoadProgress({ percent }: { percent: number | null }) {
  return (
    <View style={[styles.overlay, styles.passThrough]}>
      <AppText style={styles.overlayTitle}>Loading the 3D wall</AppText>
      {percent == null ? (
        <ActivityIndicator color={ON_DARK.text} />
      ) : (
        <>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${percent}%` }]} />
          </View>
          <AppText type="small" style={styles.overlayDetail}>
            {percent < 100 ? `${percent}%` : 'Almost ready…'}
          </AppText>
        </>
      )}
    </View>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.overlay}>
      <Ionicons name="alert-circle-outline" size={44} color={ON_DARK.danger} />
      <AppText type="heading" style={styles.overlayTitle}>
        Couldn&apos;t load the 3D model
      </AppText>
      <AppText type="small" style={styles.overlayDetail} numberOfLines={3}>
        {message}
      </AppText>
      {__DEV__ ? (
        <AppText type="small" style={styles.overlayDetail}>
          Models come from the data server. Start it from the repo root with node scripts/viewer/serve.mjs
        </AppText>
      ) : null}
      <Pressable role="button" onPress={onRetry} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
        <Ionicons name="refresh" size={20} color={VIEWER_BACKGROUND} />
        <AppText style={styles.retryText}>Try again</AppText>
      </Pressable>
    </View>
  );
}

/** Frame rate and load time, for checking the model on a phone. Development only. */
function DevStats({ info, fps }: { info: ModelInfo; fps: number | null }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.devStats, styles.passThrough, { top: insets.top + Spacing.two }]}>
      <AppText type="small" style={styles.devText}>
        {fps ?? '–'} fps · {(info.loadMs / 1000).toFixed(1)} s · {(info.triangles / 1e6).toFixed(1)}M tris
      </AppText>
    </View>
  );
}

function BackButton({ wall }: { wall: Wall }) {
  const insets = useSafeAreaInsets();
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace(`/(tabs)/(explore)/area/${wall.areaUuid}` as Href);
  }
  return (
    <Pressable
      role="button"
      accessibilityLabel="Back"
      onPress={back}
      hitSlop={8}
      style={({ pressed }) => [
        styles.back,
        { top: insets.top + Spacing.two, left: insets.left + Spacing.two },
        pressed && styles.pressed,
      ]}>
      <Ionicons name="chevron-back" size={26} color={ON_DARK.text} />
    </Pressable>
  );
}

function RouteList({
  wall,
  area,
  routes,
  linesKnown,
  linesNote,
}: {
  wall: Wall;
  area: ReturnType<typeof useArea>;
  routes: ColoredRoute[];
  /** False until the route lines file has loaded, so "not drawn" isn't claimed early. */
  linesKnown: boolean;
  linesNote: string | null;
}) {
  const insets = useSafeAreaInsets();
  if (area.isPending) return <Loading />;
  if (area.error) return <Message title="Couldn't load the routes" detail={area.error.message} />;
  if (!area.data) return <Message title="Routes not found" detail="OpenBeta has no area for this wall." />;

  return (
    <FlatList
      data={routes}
      keyExtractor={(r) => r.uuid}
      ListHeaderComponent={<ListHeader wall={wall} area={area.data} count={routes.length} linesNote={linesNote} />}
      ListEmptyComponent={<Message title="No routes yet" detail="OpenBeta lists no routes on this wall." />}
      ListFooterComponent={
        <AppText type="small" color="textSecondary" style={styles.credit}>
          Route data from OpenBeta (CC0)
        </AppText>
      }
      renderItem={({ item }) => <RouteRow route={item} linesKnown={linesKnown} />}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.four }}
    />
  );
}

function ListHeader({
  wall,
  area,
  count,
  linesNote,
}: {
  wall: Wall;
  area: Area;
  count: number;
  linesNote: string | null;
}) {
  const place = area.path
    .slice(-2)
    .map((c) => c.name)
    .join(' › ');
  const hasOrder = area.climbs.some((c) => c.leftRightIndex != null);
  return (
    <View style={styles.header}>
      {place ? (
        <AppText type="label" color="textSecondary">
          {place}
        </AppText>
      ) : null}
      <AppText type="title">{wall.name}</AppText>
      <AppText color="textSecondary">{[climbCount(count), linesNote].filter(Boolean).join(' · ')}</AppText>
      <AppText type="label" color="textSecondary" style={styles.listLabel}>
        {hasOrder ? 'Routes, left to right' : 'Routes'}
      </AppText>
    </View>
  );
}

function RouteRow({ route, linesKnown }: { route: ColoredRoute; linesKnown: boolean }) {
  const theme = useTheme();
  const drawn = route.line != null;
  const status = drawn ? 'Drawn on the model' : linesKnown ? 'Not drawn yet' : null;
  const details = [disciplineText(route.disciplines), status].filter(Boolean).join(' · ');
  return (
    <View
      accessible
      accessibilityLabel={[`${route.number}. ${route.name}`, route.grade?.text ?? 'no grade', status?.toLowerCase()]
        .filter(Boolean)
        .join(', ')}
      style={[styles.row, { borderBottomColor: theme.border }]}>
      <View
        style={[
          styles.number,
          drawn
            ? { backgroundColor: route.color, borderColor: 'rgba(0, 0, 0, 0.25)' }
            : [linesKnown && styles.numberEmpty, { borderColor: theme.textSecondary }],
        ]}>
        <AppText style={[styles.numberText, { color: drawn ? '#000000' : theme.textSecondary }]}>
          {route.number}
        </AppText>
      </View>
      <View style={styles.rowText}>
        <AppText numberOfLines={1} style={styles.rowTitle}>
          {route.name}
        </AppText>
        <AppText type="small" color="textSecondary" numberOfLines={1}>
          {details}
        </AppText>
      </View>
      <GradeBadge grade={route.grade} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageWide: { flexDirection: 'row' },
  model: { backgroundColor: VIEWER_BACKGROUND, overflow: 'hidden' },
  modelNarrow: { height: '55%' },
  modelWide: { flex: 1 },
  // The list slides up over the bottom edge of the model, like a sheet.
  panelNarrow: {
    flex: 1,
    marginTop: -Spacing.three,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  panelWide: { width: 400, borderLeftWidth: StyleSheet.hairlineWidth },
  fill: { flex: 1 },
  passThrough: { pointerEvents: 'none' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
    backgroundColor: VIEWER_BACKGROUND,
  },
  overlayTitle: { color: ON_DARK.text, fontWeight: '700', textAlign: 'center' },
  overlayDetail: { color: ON_DARK.textSecondary, textAlign: 'center', maxWidth: 420 },
  track: {
    width: 220,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: 3, backgroundColor: ON_DARK.text },
  retry: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 24,
    backgroundColor: ON_DARK.text,
  },
  retryText: { color: VIEWER_BACKGROUND, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  back: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  devStats: {
    position: 'absolute',
    right: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  devText: { color: ON_DARK.text, fontVariant: ['tabular-nums'] },
  header: { padding: Spacing.three, paddingTop: Spacing.four, gap: Spacing.one },
  listLabel: { marginTop: Spacing.three },
  row: {
    minHeight: TapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  number: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberEmpty: { borderStyle: 'dashed' },
  numberText: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  rowText: { flex: 1 },
  rowTitle: { fontWeight: '600' },
  credit: { padding: Spacing.three },
});
