import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Platform, type StyleProp, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { MapView } from '@/core/map';
import type { BBox, MapNode } from '@/core/types';
import { useHasModel, useLatestModel, usePublishedWalls } from '@/data/models';
import { type MapDot, useArea, useMapArea, useMapDots } from '@/data/queries';
import { AreaPanel } from '@/ui/area-panel';
import { Message, WallLink } from '@/ui/components';
import { DOM_WEBVIEW } from '@/ui/dom';
import { useHrefs } from '@/ui/nav';
import { PANEL_WIDTH, WIDE } from '@/ui/side-panel';
import WallMap, { type MapFocus } from '@/ui/wall-map';
import { placeName } from '@/ui/wall/parts';
import { useWallRoutes } from '@/ui/wall/use-wall-routes';
import { WallPanel } from '@/ui/wall/wall-panel';

/** The lower 48 states. */
const USA_BOUNDS: BBox = [-125, 24, -66, 50];
/** Room for the map credits along the bottom edge. */
const ATTRIBUTION_HEIGHT = 32;
const EDGE = Spacing.three;
/** On a phone, a panel sits above the credits and fills about the bottom half of the map. */
const PHONE_BOTTOM = ATTRIBUTION_HEIGHT + Spacing.two;
const PHONE_SHARE = 0.5;
const NATIVE_DRIVER = Platform.OS !== 'web';

/** The picked dot, and whether the map has shown it since, as a dot or split into its children. */
interface Selection {
  node: MapNode;
  seen: boolean;
}

export default function MapScreen() {
  // Replaced by the real view as soon as the map loads.
  const [view, setView] = useState<MapView>({ bbox: USA_BOUNDS, zoom: 3, width: 1, height: 1 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const { dots, split, error } = useMapDots(view);
  const { width } = useWindowDimensions();

  // Zooming out or panning away can fold the picked dot into its parent. That closes its panel for good,
  // rather than reopening it when the dot comes back. A dot picked from a list may not have loaded yet,
  // so it only counts once the map has shown it.
  const selected = selection?.node ?? null;
  const onMap = selected != null && (dots.some((d) => d.uuid === selected.uuid) || split.includes(selected.uuid));
  if (selection && onMap && !selection.seen) setSelection({ ...selection, seen: true });
  if (selection?.seen && !onMap) setSelection(null);
  // The last dot picked stays in its panel while the panel slides away.
  const [shown, setShown] = useState<MapNode | null>(null);
  if (selected && selected !== shown) setShown(selected);

  if (error) return <Message title="Couldn't load the map" detail={error.message} />;

  const wide = width >= WIDE;
  const phoneHeight = Math.round(mapHeight * PHONE_SHARE);
  // How far the panel reaches in from its edge, margins included.
  const covered = wide ? PANEL_WIDTH + 2 * EDGE : phoneHeight + PHONE_BOTTOM;
  const close = () => setSelection(null);
  /** A wall or area picked from a panel's list: opens its panel and moves the map to it. */
  const pick = (node: MapNode) => {
    setSelection({ node, seen: false });
    setFocus((f) => ({ location: node.location, isLeaf: node.isLeaf, seq: (f?.seq ?? 0) + 1 }));
  };

  return (
    <View style={styles.screen} onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}>
      <WallMap
        initialBounds={USA_BOUNDS}
        dots={dots}
        selected={selected?.uuid ?? null}
        onSelect={async (uuid) => {
          const dot = dots.find((d) => d.uuid === uuid);
          setSelection(dot ? { node: dot, seen: true } : null);
        }}
        onViewChange={async (v) => setView(v)}
        panelOffset={wide ? [covered / 2, 0] : [0, -covered / 2]}
        focus={focus}
        dom={{ ...DOM_WEBVIEW, style: styles.screen, scrollEnabled: false, bounces: false }}
      />
      {/* A wall opens its routes, as on its 3D page; an area opens its walls and sub-areas. */}
      {shown ? (
        <SlideIn
          open={selected != null}
          from={wide ? 'left' : 'bottom'}
          distance={covered}
          onClosed={() => setShown(null)}
          style={wide ? styles.widePanel : [styles.phonePanel, { height: phoneHeight }]}>
          {shown.isLeaf ? (
            <WallDetails key={shown.uuid} node={shown} compact={!wide} onBack={close} />
          ) : (
            <AreaDetails key={shown.uuid} node={shown} onPick={pick} onBack={close} />
          )}
        </SlideIn>
      ) : null}
    </View>
  );
}

/** The picked wall's routes, with a way into its 3D model when it has one. */
function WallDetails({ node, compact, onBack }: { node: MapNode; compact: boolean; onBack: () => void }) {
  const hrefs = useHrefs();
  const hasModel = useHasModel(node.uuid);
  const model = useLatestModel(node.uuid, hasModel);
  const { routes, linesKnown, facts, place, message } = useWallRoutes(node.uuid, model.data?.id);
  return (
    <WallPanel
      wall={node}
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
      footer={hasModel ? <WallLink wallUuid={node.uuid} label="View in 3D" /> : null}
      style={styles.fill}
    />
  );
}

/** The picked area's walls and sub-areas, as the map draws them, by name. */
function AreaDetails({
  node,
  onPick,
  onBack,
}: {
  node: MapNode;
  onPick: (node: MapNode) => void;
  onBack: () => void;
}) {
  const children = useMapArea(node.uuid);
  const area = useArea(node.uuid);
  const published = usePublishedWalls().data;
  const items: MapDot[] = (children.data?.children ?? [])
    .map((c) => ({ ...c, hasModel: published?.has(c.uuid) ?? false }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const message = children.isPending
    ? 'Loading…'
    : children.error
      ? `Couldn't load this area: ${children.error.message}`
      : items.length === 0
        ? 'OpenBeta has nothing here to show on the map'
        : null;
  return (
    <AreaPanel
      name={node.name}
      place={placeName(area.data)}
      totalClimbs={node.totalClimbs}
      items={items}
      message={message}
      onPress={onPick}
      onBack={onBack}
      backLabel="Close"
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
  // The credits are bottom right, so a panel down the left leaves them clear.
  widePanel: { position: 'absolute', top: EDGE, left: EDGE, bottom: EDGE, width: PANEL_WIDTH },
  phonePanel: { position: 'absolute', left: EDGE, right: EDGE, bottom: PHONE_BOTTOM },
});
