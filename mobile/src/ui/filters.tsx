import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import { Pressable, ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { filterChips } from '@/core/filters';
import { clearFilters, setFilters, useFilters } from '@/data/filters';
import { useUserLocation } from '@/data/location';
import { useTheme } from '@/hooks/use-theme';
import { disciplineLabel } from '@/ui/components';
import { AppText } from '@/ui/text';

export function openFilters() {
  router.push('/filters' as Href);
}

/**
 * The Filters button, then a chip for each filter that's set. Tapping a
 * chip's × removes that filter; Clear removes them all.
 */
export function FilterBar({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const filters = useFilters();
  const { problem } = useUserLocation();
  const chips = filterChips(filters, disciplineLabel);
  const on = chips.length > 0;

  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled">
        <Pressable
          role="button"
          accessibilityLabel={on ? `Filters, ${chips.length} on` : 'Filters'}
          onPress={openFilters}
          style={({ pressed }) => [
            styles.chip,
            on
              ? { backgroundColor: theme.text, borderColor: theme.text }
              : { backgroundColor: theme.background, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="options-outline" size={18} color={on ? theme.background : theme.text} />
          <AppText type="small" style={[styles.chipText, { color: on ? theme.background : theme.text }]}>
            {on ? `Filters · ${chips.length}` : 'Filters'}
          </AppText>
        </Pressable>
        {chips.map((chip) => (
          <Pressable
            key={chip.key}
            role="button"
            accessibilityLabel={`Remove filter ${chip.label}`}
            onPress={() => setFilters(chip.without)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <AppText type="small" style={styles.chipText} numberOfLines={1}>
              {chip.label}
            </AppText>
            <Ionicons name="close" size={16} color={theme.textSecondary} />
          </Pressable>
        ))}
        {chips.length > 1 ? (
          <Pressable role="button" onPress={clearFilters} hitSlop={8} style={styles.clear}>
            <AppText type="small" style={[styles.chipText, { color: theme.accent }]}>
              Clear
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>
      {problem ? (
        <AppText type="small" color="textSecondary" style={styles.problem}>
          {problem}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three - Spacing.one,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontWeight: '600' },
  clear: { minHeight: 40, justifyContent: 'center', paddingHorizontal: Spacing.one },
  pressed: { opacity: 0.7 },
  problem: { paddingHorizontal: Spacing.three, paddingTop: Spacing.one },
});
