import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Platform, type StyleProp, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { MapView } from '@/core/map';
import type { BBox, Uuid } from '@/core/types';
import { useLatestModel } from '@/data/models';
import { type MapDot, useMapDots } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { climbCount, LinkRow, Message, WallLink } from '@/ui/components';
import { DOM_WEBVIEW } from '@/ui/dom';
import { useHrefs } from '@/ui/nav';
import WallMap from '@/ui/wall-map';
import { useWallRoutes } from '@/ui/wall/use-wall-routes';
import { PANEL_WIDTH, WallPanel, WIDE } from '@/ui/wall/wall-panel';

/** The lower 48 states. */
const USA_BOUNDS: BBox = [-125, 24, -66, 50];
/** Room for the map credits along the bottom edge. */
const ATTRIBUTION_HEIGHT = 32;
const EDGE = Spacing.three;
/** On a phone, a wall's panel sits above the credits and fills about the bottom half of the map. */
const PHONE_BOTTOM = ATTRIBUTION_HEIGHT + Spacing.two;
const PHONE_SHARE = 0.5;
const NATIVE_DRIVER = Platform.OS !== 'web';

export default function MapScreen() {
  // Replaced by the real view as soon as the map loads.
  const [view, setView] = useState<MapView>({ bbox: USA_BOUNDS, zoom: 3, width: 1, height: 1 });
  const [selected, setSelected] = useState<Uuid | null>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const { dots, error } = useMapDots(view);
  const { width } = useWindowDimensions();
  const hrefs = useHrefs();
  const theme = useTheme();

  // Zooming out or panning away can fold the selected dot into its area. That closes its details for good,
  // rather than reopening them when the dot comes back.
  const dot = dots.find((d) => d.uuid === selected);
  if (selected && !dot) setSelected(null);
  const wall = dot?.isLeaf ? dot : null;
  // The last wall picked stays in its panel while the panel slides away.
  const [shownWall, setShownWall] = useState<MapDot | null>(null);
  if (wall && (wall.uuid !== shownWall?.uuid || wall.hasModel !== shownWall.hasModel)) setShownWall(wall);

  if (error) return <Message title="Couldn't load the map" detail={error.message} />;

  const wide = width >= WIDE;
  const phoneHeight = Math.round(mapHeight * PHONE_SHARE);
  // How far the panel reaches in from its edge, margins included.
  const covered = wide ? PANEL_WIDTH + 2 * EDGE : phoneHeight + PHONE_BOTTOM;
  const details = [climbCount(dot?.totalClimbs ?? 0), dot?.hasModel ? '3D model' : null];

  return (
    <View style={styles.screen} onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}>
      <WallMap
        initialBounds={USA_BOUNDS}
        dots={dots}
        selected={selected}
        onSelect={async (uuid) => setSelected(uuid)}
        onViewChange={async (v) => setView(v)}
        wallOffset={wide ? [covered / 2, 0] : [0, -covered / 2]}
        dom={{ ...DOM_WEBVIEW, style: styles.screen, scrollEnabled: false, bounces: false }}
      />
      {/* A wall opens its routes, as on its 3D page. */}
      {shownWall ? (
        <SlideIn
          open={wall != null}
          from={wide ? 'left' : 'bottom'}
          distance={covered}
          onClosed={() => setShownWall(null)}
          style={wide ? styles.widePanel : [styles.phonePanel, { height: phoneHeight }]}>
          <WallDetails key={shownWall.uuid} dot={shownWall} compact={!wide} onBack={() => setSelected(null)} />
        </SlideIn>
      ) : null}
      {/* An area shows in a card at the bottom, within thumb reach, above the map credits. */}
      {dot && !dot.isLeaf ? (
        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <LinkRow href={hrefs.area(dot.uuid)} title={dot.name} subtitle={details.filter(Boolean).join(' · ')} />
        </View>
      ) : null}
    </View>
  );
}

/** The picked wall's routes, with a way into its 3D model when it has one. */
function WallDetails({ dot, compact, onBack }: { dot: MapDot; compact: boolean; onBack: () => void }) {
  const hrefs = useHrefs();
  const model = useLatestModel(dot.uuid, dot.hasModel);
  const { routes, linesKnown, facts, place, message } = useWallRoutes(dot.uuid, model.data?.id);
  return (
    <WallPanel
      wall={dot}
      place={place}
      facts={facts}
      routes={routes}
      message={message}
      selected={null}
      linesKnown={linesKnown}
      onPress={(uuid) => router.push(hrefs.climb(uuid))}
      onBack={onBack}
      backLabel="Close"
      compact={compact}
      footer={dot.hasModel ? <WallLink wallUuid={dot.uuid} label="View in 3D" /> : null}
      style={styles.fill}
    />
  );
}

/** Slides in from off one edge while `open`, and back out before `onClosed`. */
function SlideIn({
  open,
  from,
  distance,
  onClosed,
  style,
  children,
}: {
  open: boolean;
  from: 'left' | 'bottom';
  /** How far off screen it starts, in pixels. */
  distance: number;
  onClosed: () => void;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [shown] = useState(() => new Animated.Value(0));
  const latest = useRef(onClosed);
  useEffect(() => {
    latest.current = onClosed;
  });

  useEffect(() => {
    const animation = open
      ? Animated.spring(shown, { toValue: 1, bounciness: 0, speed: 16, useNativeDriver: NATIVE_DRIVER })
      : Animated.timing(shown, { toValue: 0, duration: 180, useNativeDriver: NATIVE_DRIVER });
    animation.start(({ finished }) => {
      if (finished && !open) latest.current();
    });
    return () => animation.stop();
  }, [open, shown]);

  const offset = shown.interpolate({ inputRange: [0, 1], outputRange: [from === 'left' ? -distance : distance, 0] });
  const transform = from === 'left' ? [{ translateX: offset }] : [{ translateY: offset }];
  return <Animated.View style={[style, { transform }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  card: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: ATTRIBUTION_HEIGHT + Spacing.two,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  // The credits are bottom right, so a panel down the left leaves them clear.
  widePanel: { position: 'absolute', top: EDGE, left: EDGE, bottom: EDGE, width: PANEL_WIDTH },
  phonePanel: { position: 'absolute', left: EDGE, right: EDGE, bottom: PHONE_BOTTOM },
});
