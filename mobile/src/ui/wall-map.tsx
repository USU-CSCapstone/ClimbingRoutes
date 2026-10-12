'use dom';

// A DOM component: MapLibre runs as-is on web and in a WebView on iOS and
// Android, so the map works in Expo Go with no native build.
import 'maplibre-gl/dist/maplibre-gl.css';
import { AttributionControl, Map, Marker, NavigationControl } from 'react-map-gl/maplibre';

import type { Uuid, WallLocation } from '@/core/types';

// OpenFreeMap needs no key. Its style carries the OpenFreeMap, OpenMapTiles
// and OpenStreetMap credits, shown by the attribution control.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// The base map is light in both themes, so pins use fixed colors.
const PIN = { fill: '#FFFFFF', border: '#000000', text: '#000000' };
const MODEL_PIN = { fill: '#0B57D0', border: '#FFFFFF', text: '#FFFFFF' };

export type MapWall = WallLocation & { hasModel: boolean };

export default function WallMap({
  walls,
  selected,
  onSelect,
}: {
  walls: MapWall[];
  selected: Uuid | null;
  onSelect: (uuid: Uuid | null) => Promise<void>;
  dom?: import('expo/dom').DOMProps;
}) {
  return (
    <Map
      initialViewState={{ bounds: boundsOf(walls), fitBoundsOptions: { padding: 48 } }}
      mapStyle={STYLE_URL}
      style={{ position: 'absolute', inset: 0 }}
      attributionControl={false}
      onClick={() => onSelect(null)}>
      <AttributionControl position="bottom-right" compact={false} />
      {/* Phones pinch to zoom; buttons are for mouse users. */}
      {process.env.EXPO_DOM_HOST_OS ? null : <NavigationControl position="top-left" showCompass={false} />}
      {walls.map((w) => (
        <Marker
          key={w.uuid}
          latitude={w.location.lat}
          longitude={w.location.lng}
          // Selected and modeled walls draw on top of plain ones.
          style={{ zIndex: w.uuid === selected ? 2 : w.hasModel ? 1 : 0 }}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onSelect(w.uuid);
          }}>
          <Pin wall={w} selected={w.uuid === selected} />
        </Marker>
      ))}
    </Map>
  );
}

function Pin({ wall, selected }: { wall: MapWall; selected: boolean }) {
  const colors = wall.hasModel ? MODEL_PIN : PIN;
  const size = wall.hasModel ? 32 : 22;
  return (
    <div
      role="button"
      aria-label={wall.name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        boxSizing: 'border-box',
        background: colors.fill,
        border: `3px solid ${colors.border}`,
        boxShadow: selected ? '0 0 0 4px #000000' : '0 1px 4px rgba(0, 0, 0, 0.5)',
        transform: selected ? 'scale(1.3)' : undefined,
        color: colors.text,
        font: '700 11px system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}>
      {wall.hasModel ? '3D' : null}
    </div>
  );
}

function boundsOf(walls: MapWall[]): [number, number, number, number] {
  const lngs = walls.map((w) => w.location.lng);
  const lats = walls.map((w) => w.location.lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}
