import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { SerifFont, Spacing } from '@/constants/theme';
import type { Uuid } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/text';
import { FactChips, GradeSpread, RoundButton, RouteList } from '@/ui/wall/parts';
import type { ShownRoute, WallInfo } from '@/ui/wall/types';

/** From this width a wall's routes sit in a panel at the side instead of along the bottom. */
export const WIDE = 900;
export const PANEL_WIDTH = 360;

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
  backLabel = 'Back',
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
  const theme = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: theme.background }, style]}>
      <RouteList
        routes={routes}
        selected={selected}
        onPress={onPress}
        linesKnown={linesKnown}
        header={
          <View style={styles.header}>
            <View style={styles.top}>
              <RoundButton icon="chevron-back" label={backLabel} onPress={onBack} size={34} />
              <AppText type="small" color="textSecondary" numberOfLines={1} style={styles.flex}>
                {place ?? ''}
              </AppText>
            </View>
            <AppText style={[styles.title, { fontFamily: SerifFont }]}>{wall.name}</AppText>
            <FactChips facts={facts} />
            {compact ? null : <GradeSpread routes={routes} />}
            {compact && !message ? null : (
              <AppText type="label" color="textSecondary" style={styles.listLabel}>
                {message ?? 'Routes, left to right'}
              </AppText>
            )}
          </View>
        }
        contentContainerStyle={styles.list}
      />
      {footer ? <View style={[styles.footer, { borderTopColor: theme.border }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)' },
  flex: { flex: 1 },
  header: { padding: Spacing.three, gap: Spacing.three },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 32, lineHeight: 38, marginTop: -Spacing.two },
  listLabel: { marginTop: Spacing.one },
  list: { paddingBottom: Spacing.four },
  footer: { padding: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
});
