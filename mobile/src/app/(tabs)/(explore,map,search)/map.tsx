import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Platform, type StyleProp, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { type MapView, splitZoom } from '@/core/map';
import type { BBox, MapArea, MapNode, Uuid } from '@/core/types';
import { useHasModel, useLatestModel } from '@/data/models';
import { useMapArea, useMapDots } from '@/data/queries';
import { AreaPanel } from '@/ui/area-panel';
import { Message, WallLink } from '@/ui/components';
import { DOM_WEBVIEW } from '@/ui/dom';
import { useHrefs } from '@/ui/nav';
import { PANEL_WIDTH, WIDE } from '@/ui/side-panel';
import WallMap, { type WallMapRef } from '@/ui/wall-map';
import { placeName } from '@/ui/wall/parts';
import { RoutesSheet } from '@/ui/wall/routes-sheet';
import { useWallRoutes } from '@/ui/wall/use-wall-routes';
import { WallBar, wallBarHeight } from '@/ui/wall/wall-bar';
import { WallPanel } from '@/ui/wall/wall-panel';

/** The lower 48 states. */
const USA_BOUNDS: BBox = [-125, 24, -66, 50];
/** Room for the map credits along the bottom edge. */
const ATTRIBUTION_HEIGHT = 32;
const EDGE = Spacing.three;
/** On a phone, panels sit above the credits, and an area's fills about the bottom half of the map. */
const PHONE_BOTTOM = ATTRIBUTION_HEIGHT + Spacing.two;
const PHONE_SHARE = 0.5;
/** A wall's full route list, opened from its bar on a phone, rises over most of the map. */
const SHEET_SHARE = 0.85;
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
  const [mapHeight, setMapHeight] = useState(0);
  const { dots, split, error } = useMapDots(view);
  const { width } = useWindowDimensions();
  const mapRef = useRef<WallMapRef>(null);

  // Zooming out or panning away can fold the picked dot into its parent. That closes its panel for good,
  // rather than reopening it when the dot comes back. A dot only counts once the map has shown it, since
  // one picked from a list may not have loaded yet.
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
  // How far a panel reaches in from its edge, margins included. On a phone a wall needs only a bar of
  // route pills, which grows when they open into cards.
  const side = PANEL_WIDTH + 2 * EDGE;
  const wallCovers = (cards: boolean) => (wide ? side : wallBarHeight(cards) + PHONE_BOTTOM);
  const areaCovers = wide ? side : phoneHeight + PHONE_BOTTOM;
  const offset = (covered: number): [number, number] => (wide ? [covered / 2, 0] : [0, -covered / 2]);
  const close = () => setSelection(null);
  /**
   * A wall or area picked from `parent`'s list: opens its panel and moves the map to it, zoomed in at
   * least far enough for `parent` to split so it shows. An area zooms in a step more, as a tap does.
   */
  const pick = (node: MapNode, parent: MapArea) => {
    setSelection({ node, seen: false });
    const zoom = Math.max(node.isLeaf ? view.zoom : view.zoom + 2, splitZoom(parent, view));
    mapRef.current?.moveTo(node.location.lng, node.location.lat, zoom, node.isLeaf);
  };

  return (
    <View style={styles.screen} onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}>
      <WallMap
        ref={mapRef}
        initialBounds={USA_BOUNDS}
        dots={dots}
        selected={selected?.uuid ?? null}
        onSelect={async (node) => setSelection(node && { node, seen: false })}
        onViewChange={async (v) => setView(v)}
        panelOffsets={{ wall: offset(wallCovers(false)), area: offset(areaCovers) }}
        dom={{ ...DOM_WEBVIEW, style: styles.screen, scrollEnabled: false, bounces: false }}
      />
      {/* A wall opens its routes, as on its 3D page; an area opens its walls and sub-areas. */}
      {shown ? (
        <SlideIn
          open={selected != null}
          from={wide ? 'left' : 'bottom'}
          distance={shown.isLeaf ? wallCovers(true) : areaCovers}
          onClosed={() => setShown(null)}
          style={
            wide ? styles.widePanel : shown.isLeaf ? styles.phoneWall : [styles.phonePanel, { height: phoneHeight }]
          }>
          {shown.isLeaf ? (
            <WallDetails
              key={shown.uuid}
              node={shown}
              wide={wide}
              sheetHeight={Math.round(mapHeight * SHEET_SHARE)}
              onBack={close}
            />
          ) : (
            <AreaDetails key={shown.uuid} node={shown} onPick={pick} onBack={close} />
          )}
        </SlideIn>
      ) : null}
    </View>
  );
}

/**
 * The picked wall's routes, with a way into its 3D model when it has one: in a panel on a wide screen,
 * and on a phone in a bar of route pills that open into cards, as on its 3D page.
 */
function WallDetails({
  node,
  wide,
  sheetHeight,
  onBack,
}: {
  node: MapNode;
  wide: boolean;
  /** How tall the phone's full route list is. */
  sheetHeight: number;
  onBack: () => void;
}) {
  const hrefs = useHrefs();
  const hasModel = useHasModel(node.uuid);
  const model = useLatestModel(node.uuid, hasModel);
  const { routes, linesKnown, facts, place, message } = useWallRoutes(node.uuid, model.data?.id);
  const [selected, setSelected] = useState<Uuid | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openRoute = (uuid: Uuid) => router.push(hrefs.climb(uuid));

  if (wide) {
    return (
      <WallPanel
        wall={node}
        place={place}
        facts={facts}
        routes={routes}
        message={message}
        selected={null}
        linesKnown={linesKnown}
        onPress={openRoute}
        onBack={onBack}
        backLabel="Close"
        footer={hasModel ? <WallLink wallUuid={node.uuid} label="View in 3D" /> : null}
        style={styles.fill}
      />
    );
  }
  return (
    <>
      <WallBar
        wall={node}
        place={place}
        routes={routes}
        index={routes.findIndex((r) => r.uuid === selected)}
        linesKnown={linesKnown}
        message={message}
        onSelect={setSelected}
        onOpen={openRoute}
        onAllRoutes={() => setSheetOpen(true)}
        onClose={onBack}
        trailing={
          hasModel ? (
            <WallLink
              wallUuid={node.uuid}
              route={selected ?? undefined}
              label="3D"
              accessibilityLabel="View in 3D"
              compact
            />
          ) : null
        }
        style={styles.wallBar}
      />
      {sheetOpen ? (
        <RoutesSheet
          wall={node}
          place={place}
          facts={facts}
          routes={routes}
          selected={selected}
          linesKnown={linesKnown}
          onSelect={setSelected}
          onClose={() => setSheetOpen(false)}
          height={sheetHeight}
        />
      ) : null}
    </>
  );
}

/** The picked area's walls and sub-areas, as the map draws them, by name. */
function AreaDetails({
  node,
  onPick,
  onBack,
}: {
  node: MapNode;
  onPick: (node: MapNode, parent: MapArea) => void;
  onBack: () => void;
}) {
  const { area, children, isPending, error } = useMapArea(node.uuid);
  const message = isPending
    ? 'Loading…'
    : error
      ? `Couldn't load this area: ${error.message}`
      : children.length === 0
        ? 'OpenBeta has nothing here to show on the map'
        : null;
  return (
    <AreaPanel
      name={node.name}
      place={placeName(area)}
      totalClimbs={node.totalClimbs}
      items={children}
      message={message}
      onPress={(child) => area && onPick(child, area)}
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
  // A wall's bar and its full route list are placed within the map, and taps around them reach it.
  phoneWall: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
  wallBar: { position: 'absolute', left: 0, right: 0, bottom: PHONE_BOTTOM },
});
