'use dom';

// A DOM component: MapLibre runs as-is on web and in a WebView on iOS and
// Android, so the map works in Expo Go with no native build.
import type { ExpressionSpecification, MapLibreEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useState } from 'react';
import { AttributionControl, Layer, Map, NavigationControl, Source } from 'react-map-gl/maplibre';

import type { MapView } from '@/core/map';
import type { BBox, Uuid } from '@/core/types';
import type { MapDot } from '@/data/queries';

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
  wallOffset,
}: {
  initialBounds: BBox;
  dots: MapDot[];
  selected: Uuid | null;
  onSelect: (uuid: Uuid | null) => Promise<void>;
  onViewChange: (view: MapView) => Promise<void>;
  /** Where a tapped wall is moved to, in pixels from the middle of the map, so the wall's panel doesn't cover it. */
  wallOffset: [number, number];
  dom?: import('expo/dom').DOMProps;
}) {
  const [cursor, setCursor] = useState('');

  const reportView = ({ target: map }: MapLibreEvent) => {
    const b = map.getBounds();
    const { clientWidth: width, clientHeight: height } = map.getContainer();
    onViewChange({ bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom(), width, height });
  };

  return (
    <Map
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
        onSelect((feature?.properties?.uuid as Uuid | undefined) ?? null);
        if (feature?.geometry.type !== 'Point') return;
        const [lng, lat] = feature.geometry.coordinates;
        // Tapping an area also zooms toward it, so it splits after a tap or two. A wall moves into the
        // middle of the map that its panel leaves showing.
        if (feature.properties?.kind === 'area') e.target.easeTo({ center: [lng, lat], zoom: e.target.getZoom() + 2 });
        else e.target.easeTo({ center: [lng, lat], offset: wallOffset });
      }}>
      <AttributionControl position="bottom-right" compact={false} />
      {/* Phones pinch to zoom; buttons are for mouse users. Top right, clear of a picked wall's panel. */}
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
