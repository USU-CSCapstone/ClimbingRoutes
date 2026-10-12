import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Uuid } from '@/core/types';
import type { WallRoute } from '@/core/walls';
import { useClimb } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { disciplineText } from '@/ui/components';
import { AppText } from '@/ui/text';

type Route = WallRoute & { color: string };

/**
 * The selected route's grades, type and first ascent. The arrows step to the
 * routes on either side.
 */
export function RouteDetails({
  route,
  previous,
  next,
  linesKnown,
  onSelect,
  onClose,
}: {
  route: Route;
  previous: Route | null;
  next: Route | null;
  /** False until the route lines file has loaded, so "not drawn" isn't claimed early. */
  linesKnown: boolean;
  onSelect: (uuid: Uuid) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { data: climb, isPending, error } = useClimb(route.uuid);
  const drawn = route.line != null;
  const missing = isPending ? '…' : '–';
  const yds = climb?.allGrades.yds ?? (route.grade?.system === 'yds' ? route.grade.text : null);
  const status = drawn ? 'Drawn on the model' : linesKnown ? 'Not drawn on the model yet' : null;

  return (
    <View style={[styles.panel, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.top}>
        <View
          style={[
            styles.number,
            drawn
              ? { backgroundColor: route.color, borderColor: 'rgba(0, 0, 0, 0.25)' }
              : { borderColor: theme.textSecondary },
          ]}>
          <AppText style={[styles.numberText, { color: drawn ? '#000000' : theme.textSecondary }]}>
            {route.number}
          </AppText>
        </View>
        <View style={styles.title}>
          <AppText type="heading" numberOfLines={2}>
            {route.name}
          </AppText>
          <AppText type="small" color="textSecondary" numberOfLines={1}>
            {[disciplineText(climb?.disciplines ?? route.disciplines), status].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <RoundButton icon="close" label="Close route details" onPress={onClose} />
      </View>

      <View style={styles.stats}>
        <Stat label="YDS" value={yds ?? missing} />
        <Stat label="French" value={climb?.allGrades.french ?? missing} />
        <Stat label="First ascent" value={climb?.fa ?? missing} wide />
      </View>
      {error ? (
        <AppText type="small" color="textSecondary">
          Couldn&apos;t load every detail: {error.message}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <RoundButton
          icon="chevron-back"
          label={previous ? `Previous route, ${previous.name}` : 'No route to the left'}
          disabled={!previous}
          onPress={() => previous && onSelect(previous.uuid)}
        />
        <RoundButton
          icon="chevron-forward"
          label={next ? `Next route, ${next.name}` : 'No route to the right'}
          disabled={!next}
          onPress={() => next && onSelect(next.uuid)}
        />
      </View>
    </View>
  );
}

function Stat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.stat, wide && styles.statWide]}>
      <AppText type="label" color="textSecondary">
        {label}
      </AppText>
      <AppText style={styles.statValue}>{value}</AppText>
    </View>
  );
}

function RoundButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.round,
        { borderColor: theme.border, backgroundColor: theme.background },
        (pressed || disabled) && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Ionicons name={icon} size={22} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    margin: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.three,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  number: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  title: { flex: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.four, rowGap: Spacing.two },
  stat: { minWidth: 56 },
  statWide: { flexShrink: 1 },
  statValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
});
