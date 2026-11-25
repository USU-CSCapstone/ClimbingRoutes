import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Display, NO_CLICK_FOCUS } from '@/ui/home/kit';
import { GUTTER } from '@/ui/profile/kit';
import { AppText } from '@/ui/text';

export type ProfileTab = 'climbed' | 'saved' | 'scans';

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'climbed', label: 'Climbed' },
  { key: 'saved', label: 'Saved' },
  { key: 'scans', label: 'Scans' },
];

/**
 * The Profile tab's three lists, as words with how many are in each beside
 * them: "Climbed (4)". A count is left off until it's known. The row scrolls
 * sideways if big counts ever make it too wide for a small phone.
 */
export function ProfileTabs({
  value,
  counts,
  onChange,
}: {
  value: ProfileTab;
  counts: Record<ProfileTab, number | undefined>;
  onChange: (tab: ProfileTab) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { borderBottomColor: theme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TABS.map(({ key, label }) => {
          const on = key === value;
          const count = counts[key];
          const color = on ? theme.text : theme.textSecondary;
          return (
            <Pressable
              key={key}
              role="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={count == null ? label : `${label}, ${count}`}
              onPress={() => onChange(key)}
              {...NO_CLICK_FOCUS}
              style={[styles.tab, !on && styles.off]}>
              <Display style={[styles.label, { color }]}>{label}</Display>
              {count == null ? null : <AppText style={[styles.count, { color }]}>({count})</AppText>}
              {on ? <View style={[styles.underline, { backgroundColor: theme.text }]} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { paddingHorizontal: GUTTER, gap: Spacing.three + Spacing.half },
  tab: { height: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 1 },
  off: { opacity: 0.6 },
  label: { fontSize: 20, lineHeight: 26, letterSpacing: -0.5 },
  count: { fontSize: 16, lineHeight: 26, fontWeight: '600', fontVariant: ['tabular-nums'] },
  underline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, borderRadius: 2 },
});
