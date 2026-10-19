import Ionicons from '@expo/vector-icons/Ionicons';
import { lazy, Suspense } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { LOCAL_DATA_URL } from '@/core/config';
import type { Uuid } from '@/core/types';
import type { Wall } from '@/core/walls';
import { WALL_DATA_URL } from '@/data/queries';
import { AppText } from '@/ui/text';
import type { Insets, ModelInfo, ViewerRoute } from '@/viewer/types';

// Loaded on demand so three.js stays out of the app's main web bundle.
const WallViewer = lazy(() => import('@/viewer/wall-viewer'));

export const VIEWER_BACKGROUND = '#1b1d21';
const ON_DARK = Colors.dark;

export interface ModelStatus {
  /** Bumped to reload the model after an error. */
  attempt: number;
  percent: number | null;
  info: ModelInfo | null;
  error: string | null;
}

/** The 3D model behind everything else on the Wall page, with its loading and error states. */
export function ModelLayer({
  wall,
  lines,
  highlighted,
  insets,
  showWholeWall,
  status,
  onProgress,
  onLoad,
  onError,
  onRetry,
  onRouteTap,
  onEmptyTap,
  onFps,
}: {
  wall: Wall;
  lines: ViewerRoute[];
  highlighted: Uuid | null;
  insets: Insets;
  showWholeWall: number;
  status: ModelStatus;
  onProgress: (percent: number) => void;
  onLoad: (info: ModelInfo) => void;
  onError: (message: string) => void;
  onRetry: () => void;
  onRouteTap: (uuid: Uuid) => void;
  onEmptyTap: () => void;
  onFps?: (fps: number) => void;
}) {
  // Messages sit in the middle of the area the page's controls leave uncovered.
  const area = {
    paddingTop: insets.top,
    paddingRight: insets.right + Spacing.four,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left + Spacing.four,
  };
  return (
    <View style={[StyleSheet.absoluteFill, styles.model]}>
      <Suspense fallback={null}>
        <WallViewer
          key={status.attempt}
          model={`${WALL_DATA_URL}/models/${encodeURIComponent(wall.model)}`}
          routes={lines}
          highlighted={highlighted}
          insets={insets}
          showWholeWall={showWholeWall}
          onProgress={(fraction) => onProgress(Math.floor(fraction * 100))}
          onLoad={onLoad}
          onError={onError}
          onRouteTap={onRouteTap}
          onEmptyTap={onEmptyTap}
          onFps={onFps}
          dom={{ style: styles.fill, scrollEnabled: false }}
        />
      </Suspense>
      {status.error ? (
        <View style={[styles.overlay, area]}>
          <Ionicons name="alert-circle-outline" size={44} color={ON_DARK.danger} />
          <AppText type="heading" style={styles.title}>
            Couldn&apos;t load the 3D model
          </AppText>
          <AppText type="small" style={styles.detail} numberOfLines={3}>
            {status.error}
          </AppText>
          {WALL_DATA_URL === LOCAL_DATA_URL ? (
            <AppText type="small" style={styles.detail}>
              Models come from the data server. Start it from the repo root with node scripts/viewer/serve.mjs
            </AppText>
          ) : null}
          <Pressable role="button" onPress={onRetry} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={20} color={VIEWER_BACKGROUND} />
            <AppText style={styles.retryText}>Try again</AppText>
          </Pressable>
        </View>
      ) : status.info ? null : (
        <View style={[styles.overlay, styles.passThrough, area]}>
          <AppText style={styles.title}>Loading the 3D wall</AppText>
          {status.percent == null ? (
            <ActivityIndicator color={ON_DARK.text} />
          ) : (
            <>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${status.percent}%` }]} />
              </View>
              <AppText type="small" style={styles.detail}>
                {status.percent < 100 ? `${status.percent}%` : 'Almost ready…'}
              </AppText>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  model: { backgroundColor: VIEWER_BACKGROUND },
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
    backgroundColor: VIEWER_BACKGROUND,
  },
  title: { color: ON_DARK.text, fontWeight: '700', textAlign: 'center' },
  detail: { color: ON_DARK.textSecondary, textAlign: 'center', maxWidth: 420 },
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
});
