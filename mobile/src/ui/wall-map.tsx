'use dom';

// A DOM component: MapLibre runs as-is on web and in a WebView on iOS and
// Android, so the map works in Expo Go with no native build.
import { type DOMImperativeFactory, useDOMImperativeHandle } from 'expo/dom';
import type { ExpressionSpecification, MapLibreEvent, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { type Ref, useEffect, useRef, useState } from 'react';
import { AttributionControl, Layer, Map, type MapRef, NavigationControl, Source } from 'react-map-gl/maplibre';

import type { MapView } from '@/core/map';
import type { BBox, MapNode, Uuid } from '@/core/types';
import type { MapDot } from '@/data/queries';

/** Moves the map from outside it, such as when a panel's list picks a dot. */
export interface WallMapRef extends DOMImperativeFactory {
  /** Takes lng, lat and zoom. Arguments cross the bridge to the webview as JSON, so they're untyped here. */
  moveTo: DOMImperativeFactory[string];
}

// OpenFreeMap needs no key. Its style carries the OpenFreeMap, OpenMapTiles
// and OpenStreetMap credits, shown by the attribution control.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// The base map is light in both themes, so dots use fixed colors.
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const MODEL = '#0B57D0';

const KIND: ExpressionSpecification = ['get', 'kind'];

export default function WallMap({
  initialBounds,
  dots,
  selected,
  onSelect,
  onViewChange,
  panelOffset,
  ref,
}: {
  initialBounds: BBox;
  dots: MapDot[];
  selected: Uuid | null;
  /** The tapped dot, as drawn, or null for a tap on the map. */
  onSelect: (node: MapNode | null) => Promise<void>;
  onViewChange: (view: MapView) => Promise<void>;
  /** Where a picked dot is moved to, in pixels from the middle of the map, so the panel it opens doesn't cover it. */
  panelOffset: [number, number];
  ref?: Ref<WallMapRef>;
  dom?: import('expo/dom').DOMProps;
}) {
  const [cursor, setCursor] = useState('');
  const mapRef = useRef<MapRef>(null);
  // The handle below outlives renders, so it reads the offset from here.
  const offset = useRef(panelOffset);
  useEffect(() => {
    offset.current = panelOffset;
  });

  /** Moves a picked dot into the middle of the map its panel leaves showing. */
  const moveTo = (map: MapLibreMap, center: [number, number], zoom: number) => {
    map.easeTo({ center, zoom, offset: offset.current });
  };

  useDOMImperativeHandle(
    ref ?? null,
    () => ({
      moveTo(...args) {
        const [lng, lat, zoom] = args as number[];
        const map = mapRef.current?.getMap();
        if (map) moveTo(map, [lng, lat], zoom);
      },
    }),
    [],
  );

  const reportView = ({ target: map }: MapLibreEvent) => {
    const b = map.getBounds();
    const { clientWidth: width, clientHeight: height } = map.getContainer();
    onViewChange({ bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom(), width, height });
  };

  return (
    <Map
      ref={mapRef}
      initialViewState={{ bounds: initialBounds }}
      mapStyle={STYLE_URL}
      style={{ position: 'absolute', inset: 0 }}
      attributionControl={false}
      cursor={cursor}
      interactiveLayerIds={['dot-hit']}
      onMouseEnter={() => setCursor('pointer')}
      onMouseLeave={() => setCursor('')}
      onLoad={reportView}
      onMoveEnd={reportView}
      onClick={(e) => {
        const feature = e.features?.[0];
        if (feature?.geometry.type !== 'Point') {
          onSelect(null);
          return;
        }
        const [lng, lat] = feature.geometry.coordinates;
        const { uuid, name, climbs, kind } = feature.properties as { uuid: Uuid; name: string; climbs: number; kind: string };
        // Sent whole, since the screen's own dots may have moved on by the time this arrives.
        onSelect({ uuid, name, totalClimbs: climbs, isLeaf: kind !== 'area', location: { lng, lat } });
        // Tapping an area also zooms toward it, so it splits after a tap or two.
        const zoom = e.target.getZoom();
        moveTo(e.target, [lng, lat], kind === 'area' ? zoom + 2 : zoom);
      }}>
      <AttributionControl position="bottom-right" compact={false} />
      {/* Phones pinch to zoom; buttons are for mouse users. Top right, clear of a picked dot's panel. */}
      {process.env.EXPO_DOM_HOST_OS ? null : <NavigationControl position="top-right" showCompass={false} />}
      <Source id="dots" type="geojson" data={toGeoJson(dots, selected)}>
        {/* Invisible, larger circles so small dots are easy to tap. */}
        <Layer id="dot-hit" type="circle" paint={{ 'circle-radius': 22, 'circle-opacity': 0 }} />
        {/* Areas are black and sized by route count, walls are small and white. */}
        <Layer
          id="dot"
          type="circle"
          paint={{
            'circle-radius': [
              'match',
              KIND,
              'area',
              ['interpolate', ['linear'], ['get', 'climbs'], 1, 12, 100, 15, 1000, 20, 10000, 26],
              'model',
              14,
              8,
            ],
            'circle-color': ['match', KIND, 'area', BLACK, 'model', MODEL, WHITE],
            'circle-stroke-color': ['match', KIND, 'wall', BLACK, WHITE],
            'circle-stroke-width': ['case', ['get', 'selected'], 5, 2.5],
          }}
        />
        {/* Route count inside area dots, "3D" inside modeled walls. */}
        <Layer
          id="dot-count"
          type="symbol"
          layout={{
            'text-field': ['get', 'inside'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 11,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          }}
          paint={{ 'text-color': WHITE }}
        />
        <Layer
          id="dot-name"
          type="symbol"
          layout={{
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 13,
            'text-anchor': 'top',
            'text-offset': [0, 1.4],
            'text-max-width': 10,
            // Bigger areas keep their names when labels collide.
            'symbol-sort-key': ['-', ['get', 'climbs']],
          }}
          paint={{ 'text-color': BLACK, 'text-halo-color': WHITE, 'text-halo-width': 2 }}
        />
      </Source>
    </Map>
  );
}

function toGeoJson(dots: MapDot[], selected: Uuid | null) {
  return {
    type: 'FeatureCollection' as const,
    features: dots.map((d) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [d.location.lng, d.location.lat] },
      properties: {
        uuid: d.uuid,
        name: d.name,
        climbs: d.totalClimbs,
        kind: d.hasModel ? 'model' : d.isLeaf ? 'wall' : 'area',
        inside: d.hasModel ? '3D' : d.isLeaf ? '' : shortCount(d.totalClimbs),
        selected: d.uuid === selected,
      },
    })),
  };
}

function shortCount(n: number): string {
  return n < 1000 ? String(n) : `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k`;
}
