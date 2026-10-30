import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { Uuid } from '@/core/types';
import { PanelHeader, PanelLabel, panelListStyle, SidePanel } from '@/ui/side-panel';
import { FactChips, GradeSpread, RouteList } from '@/ui/wall/parts';
import type { ShownRoute, WallInfo } from '@/ui/wall/types';

/**
 * A wall's name, facts, grade spread and routes, left to right: beside the
 * model on the 3D page, and over the map when a wall is picked. The caller
 * places it.
 */
export function WallPanel({
  wall,
  place,
  facts,
  routes,
  message,
  selected,
  linesKnown,
  onPress,
  onBack,
  backLabel,
  compact,
  footer,
  style,
}: {
  wall: WallInfo;
  place: string | null;
  facts: string[];
  routes: ShownRoute[];
  /** Shown in place of the list's label when there are no routes to list. */
  message: string | null;
  selected: Uuid | null;
  linesKnown: boolean;
  onPress: (uuid: Uuid) => void;
  onBack: () => void;
  backLabel?: string;
  /** Leaves out the grade spread and the list's label, so a short panel still shows some routes. */
  compact?: boolean;
  /** Pinned below the list. */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SidePanel footer={footer} style={style}>
      <RouteList
        routes={routes}
        selected={selected}
        onPress={onPress}
        linesKnown={linesKnown}
        header={
          <PanelHeader place={place} title={wall.name} onBack={onBack} backLabel={backLabel}>
            <FactChips facts={facts} />
            {compact ? null : <GradeSpread routes={routes} />}
            {compact && !message ? null : <PanelLabel>{message ?? 'Routes, left to right'}</PanelLabel>}
          </PanelHeader>
        }
        contentContainerStyle={panelListStyle}
      />
    </SidePanel>
  );
}
