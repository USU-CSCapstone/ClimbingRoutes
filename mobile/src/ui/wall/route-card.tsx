import { useState } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { disciplineText } from '@/ui/components';
import { AppText } from '@/ui/text';
import { GradePill, NumberBadge, RoundButton } from '@/ui/wall/parts';
import { RouteActions } from '@/ui/wall/route-actions';
import type { ShownRoute, WallInfo } from '@/ui/wall/types';

/** Cards are a fixed height so the camera can frame routes above them before they're laid out. */
export const CARD_HEIGHT = 172;

/** From this width the card has room for "Climbed Nov 14" beside the bookmark and the arrows; narrower, just the day. */
const ROOMY = 326;

/**
 * The selected route: grades, type and first ascent, a bookmark and "Climbed it"
 * for the signed-in climber, and arrows to the routes either side.
 */
export function RouteCard({
  wall,
  route,
  index,
  total,
  linesKnown,
  onPrevious,
  onNext,
  onClose,
  style,
}: {
  wall: WallInfo;
  route: ShownRoute;
  index: number;
  total: number;
  /** False until the route lines file has loaded, so "not drawn" isn't claimed early. */
  linesKnown: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const boulder = route.grade?.system === 'vscale';
  const status = route.line ? 'drawn in 3D' : linesKnown ? 'not drawn yet' : null;
  const [width, setWidth] = useState(0);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }, style]}>
      <View style={styles.top}>
        <NumberBadge route={route} linesKnown={linesKnown} size={34} />
        <AppText type="heading" numberOfLines={1} style={styles.name}>
          {route.name}
        </AppText>
        <GradePill grade={route.grade} large />
        <RoundButton icon="close" label="Close route" onPress={onClose} size={34} />
      </View>
      <View style={styles.stats}>
        <Stat label="Type" value={disciplineText(route.disciplines) || '–'} />
        <Stat label={boulder ? 'Font' : 'French'} value={(boulder ? route.allGrades.font : route.allGrades.french) ?? '–'} />
        <Stat label="First ascent" value={route.fa ?? '–'} grow />
      </View>
      <View style={styles.bottom}>
        <RouteActions wall={wall} route={route} roomy={width >= ROOMY} />
        {/* The number badge shows where the route is on the wall; this says it, and whether it's drawn, to screen readers. */}
        <View accessible accessibilityLabel={[`Route ${index + 1} of ${total}`, status].filter(Boolean).join(', ')} style={styles.position} />
        <RoundButton
          icon="chevron-back"
          label="Route to the left"
          disabled={index === 0}
          onPress={onPrevious}
          size={38}
        />
        <RoundButton
          icon="chevron-forward"
          label="Route to the right"
          disabled={index === total - 1}
          onPress={onNext}
          size={38}
        />
      </View>
    </View>
  );
}

function Stat({ label, value, grow }: { label: string; value: string; grow?: boolean }) {
  return (
    <View style={grow ? styles.statGrow : styles.stat}>
      <AppText type="label" color="textSecondary">
        {label}
      </AppText>
      <AppText numberOfLines={1} style={styles.statValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    padding: Spacing.three - Spacing.one,
    paddingLeft: Spacing.three,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half },
  name: { flex: 1 },
  stats: { flexDirection: 'row', gap: Spacing.four },
  stat: { flexShrink: 0 },
  statGrow: { flex: 1, minWidth: 0 },
  statValue: { fontWeight: '700' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  position: { flex: 1 },
});
