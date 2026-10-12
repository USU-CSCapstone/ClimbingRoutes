import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { Uuid } from '@/core/types';
import { useMapWalls } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { climbCount, LinkRow, Loading, Message } from '@/ui/components';
import { useHrefs } from '@/ui/nav';
import WallMap from '@/ui/wall-map';

export default function MapScreen() {
  const { data: walls, isPending, error } = useMapWalls();
  const [selected, setSelected] = useState<Uuid | null>(null);
  const hrefs = useHrefs();
  const theme = useTheme();

  if (isPending) return <Loading />;
  if (error) return <Message title="Couldn't load the map" detail={error.message} />;
  if (walls.length === 0) return <Message title="No walls to show" detail="OpenBeta has no wall locations here." />;

  const wall = walls.find((w) => w.uuid === selected);

  return (
    <View style={styles.screen}>
      <WallMap
        walls={walls}
        selected={selected}
        onSelect={async (uuid) => setSelected(uuid)}
        dom={{ style: styles.screen, scrollEnabled: false, bounces: false }}
      />
      {/* The selected wall shows in a card at the bottom, within thumb reach, above the map credits. */}
      {wall ? (
        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <LinkRow
            href={hrefs.area(wall.uuid)}
            title={wall.name}
            subtitle={wall.hasModel ? `${climbCount(wall.totalClimbs)} · 3D model` : climbCount(wall.totalClimbs)}
          />
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
