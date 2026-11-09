import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { SerifFont, Spacing } from '@/constants/theme';
import type { Uuid } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/text';
import { RoundButton } from '@/ui/wall/parts';
import { PILL_HEIGHT, RouteStrip, stripHeight } from '@/ui/wall/route-strip';
import type { ShownRoute, WallInfo } from '@/ui/wall/types';

const TITLE_HEIGHT = 56;
const SIDE = Spacing.three;
const GAP = Spacing.two;

/** How tall the bar is, so the map can keep a picked wall clear of it. */
export function wallBarHeight(cards: boolean): number {
  return TITLE_HEIGHT + GAP + stripHeight(cards);
}

/**
 * A wall picked on the map, on a phone: its name in a bar along the bottom,
 * with its routes below as pills that open into cards, as on its 3D page.
 * The caller places it.
 */
export function WallBar({
  wall,
  place,
  routes,
  index,
  linesKnown,
  message,
  onSelect,
  onOpen,
  onAllRoutes,
  onClose,
  trailing,
  style,
}: {
  wall: WallInfo;
  place: string | null;
  routes: ShownRoute[];
  /** The selected route's place in `routes`, or -1. */
  index: number;
  linesKnown: boolean;
  /** Shown in place of the pills when there are no routes to show. */
  message: string | null;
  onSelect: (uuid: Uuid | null) => void;
  onOpen: (uuid: Uuid) => void;
  onAllRoutes: () => void;
  onClose: () => void;
  /** At the end of the title bar. */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, style]}>
      <View style={[styles.title, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <RoundButton icon="close" label="Close" onPress={onClose} />
        <View style={styles.flex}>
          <AppText numberOfLines={1} style={[styles.name, { fontFamily: SerifFont }]}>
            {wall.name}
          </AppText>
          {place ? (
            <AppText type="small" color="textSecondary" numberOfLines={1}>
              {place}
            </AppText>
          ) : null}
        </View>
        {routes.length > 0 ? <RoundButton icon="list" label="All routes" onPress={onAllRoutes} /> : null}
        {trailing}
      </View>
      {message ? (
        <View style={styles.messageRow}>
          <View style={[styles.message, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <AppText type="small" color="textSecondary" numberOfLines={1}>
              {message}
            </AppText>
          </View>
        </View>
      ) : (
        <RouteStrip routes={routes} index={index} linesKnown={linesKnown} onSelect={onSelect} onOpen={onOpen} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: GAP },
  flex: { flex: 1 },
  title: {
    height: TITLE_HEIGHT,
    marginHorizontal: SIDE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: TITLE_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  name: { fontSize: 20, lineHeight: 24 },
  messageRow: { height: PILL_HEIGHT, paddingHorizontal: SIDE, alignItems: 'flex-start', justifyContent: 'center' },
  message: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
});
