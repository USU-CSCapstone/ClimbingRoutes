import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { MapView } from '@/core/map';
import type { BBox, Uuid } from '@/core/types';
import { useMapDots } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { climbCount, LinkRow, Message } from '@/ui/components';
import { DOM_WEBVIEW } from '@/ui/dom';
import { useHrefs } from '@/ui/nav';
import WallMap from '@/ui/wall-map';

/** The lower 48 states. */
const USA_BOUNDS: BBox = [-125, 24, -66, 50];

export default function MapScreen() {
  // Replaced by the real view as soon as the map loads.
  const [view, setView] = useState<MapView>({ bbox: USA_BOUNDS, zoom: 3, width: 1, height: 1 });
  const [selected, setSelected] = useState<Uuid | null>(null);
  const { dots, error } = useMapDots(view);
  const hrefs = useHrefs();
  const theme = useTheme();

  if (error) return <Message title="Couldn't load the map" detail={error.message} />;

  // Zooming can fold the selected wall into its area, which closes the card.
  const dot = dots.find((d) => d.uuid === selected);
  const details = [climbCount(dot?.totalClimbs ?? 0), dot?.hasModel ? '3D model' : null];

  return (
    <View style={styles.screen}>
      <WallMap
        initialBounds={USA_BOUNDS}
        dots={dots}
        selected={selected}
        onSelect={async (uuid) => setSelected(uuid)}
        onViewChange={async (v) => setView(v)}
        dom={{ ...DOM_WEBVIEW, style: styles.screen, scrollEnabled: false, bounces: false }}
      />
      {/* The selected dot shows in a card at the bottom, within thumb reach, above the map credits. */}
      {dot ? (
        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <LinkRow href={hrefs.area(dot.uuid)} title={dot.name} subtitle={details.filter(Boolean).join(' · ')} />
        </View>
      ) : null}
    </View>
  );
}

/** Room for the map credits along the bottom edge. */
const ATTRIBUTION_HEIGHT = 32;

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
});
