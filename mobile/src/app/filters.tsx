import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing, TapTarget } from '@/constants/theme';
import {
  DISTANCES_MILES,
  FILTER_TYPES,
  type GradeRange,
  hasFilters,
  rangesInUse,
  rangeText,
} from '@/core/filters';
import { V_STEPS, YDS_STEPS } from '@/core/grades';
import { clearFilters, setFilters, useFilters } from '@/data/filters';
import { useUserLocation } from '@/data/location';
import { useTheme } from '@/hooks/use-theme';
import { disciplineLabel, Section } from '@/ui/components';
import { AppText } from '@/ui/text';

type Steps = { label: string; value: number }[];

const YDS_PRESETS: { label: string; range: GradeRange }[] = [
  { label: '5.7 and under', range: { min: 0, max: 7 } },
  { label: '5.8–5.9', range: { min: 8, max: 9 } },
  { label: '5.10', range: { min: 10, max: 10.75 } },
  { label: '5.11', range: { min: 11, max: 11.75 } },
  { label: '5.12', range: { min: 12, max: 12.75 } },
  { label: '5.13 and up', range: { min: 13, max: 15.75 } },
];

const V_PRESETS: { label: string; range: GradeRange }[] = [
  { label: 'V2 and under', range: { min: -1, max: 2 } },
  { label: 'V3–V5', range: { min: 3, max: 5 } },
  { label: 'V6–V8', range: { min: 6, max: 8 } },
  { label: 'V9 and up', range: { min: 9, max: 17 } },
];

/**
 * Edits the route filters. Changes apply straight away, so the screen
 * underneath updates while the sheet is open.
 */
export default function FiltersScreen() {
  const filters = useFilters();
  const theme = useTheme();
  const { problem, loading } = useUserLocation();
  const ranges = rangesInUse(filters);
  const showYds = filters.types.length === 0 || filters.types.some((t) => t !== 'boulder');
  const showV = filters.types.length === 0 || filters.types.includes('boulder');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Filters',
          headerLeft: () =>
            hasFilters(filters) ? (
              <Pressable onPress={clearFilters} hitSlop={12} role="button">
                <AppText style={{ color: theme.accent }}>Clear all</AppText>
              </Pressable>
            ) : null,
          headerRight: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} role="button">
              <AppText style={[styles.done, { color: theme.accent }]}>Done</AppText>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.page}>
        <Section label="Type">
          <View style={styles.wrap}>
            {FILTER_TYPES.map((type) => {
              const on = filters.types.includes(type);
              return (
                <Choice
                  key={type}
                  label={disciplineLabel(type)}
                  on={on}
                  onPress={() =>
                    setFilters({
                      ...filters,
                      types: on ? filters.types.filter((t) => t !== type) : [...filters.types, type],
                    })
                  }
                />
              );
            })}
          </View>
          <AppText type="small" color="textSecondary">
            {filters.types.length === 0 ? 'Showing every type.' : 'Routes of any picked type show.'}
          </AppText>
        </Section>

        {showYds ? (
          <GradeSection
            label="Route grade"
            steps={YDS_STEPS}
            presets={YDS_PRESETS}
            range={ranges.yds}
            onChange={(yds) => setFilters({ ...filters, yds })}
          />
        ) : null}
        {showV ? (
          <GradeSection
            label="Boulder grade"
            steps={V_STEPS}
            presets={V_PRESETS}
            range={ranges.vscale}
            onChange={(vscale) => setFilters({ ...filters, vscale })}
          />
        ) : null}

        <Section label="Distance from you">
          <View style={styles.wrap}>
            <Choice
              label="Any"
              on={filters.withinMiles == null}
              onPress={() => setFilters({ ...filters, withinMiles: null })}
            />
            {DISTANCES_MILES.map((miles) => (
              <Choice
                key={miles}
                label={`${miles} mi`}
                on={filters.withinMiles === miles}
                onPress={() => setFilters({ ...filters, withinMiles: miles })}
              />
            ))}
          </View>
          <AppText type="small" color="textSecondary">
            {problem ?? (loading ? 'Finding your location…' : 'Applies to walls and routes, not whole regions.')}
          </AppText>
        </Section>
      </ScrollView>
    </>
  );
}

/** A grade range: quick picks, then From and To for anything else. */
function GradeSection({
  label,
  steps,
  presets,
  range,
  onChange,
}: {
  label: string;
  steps: Steps;
  presets: { label: string; range: GradeRange }[];
  range: GradeRange | null;
  onChange: (range: GradeRange | null) => void;
}) {
  const first = steps[0].value;
  const last = steps[steps.length - 1].value;
  const min = range?.min ?? first;
  const max = range?.max ?? last;
  const at = (value: number) => Math.max(0, steps.findIndex((s) => s.value === value));

  /** The whole scale is the same as no filter. */
  const set = (next: GradeRange) => onChange(next.min <= first && next.max >= last ? null : next);
  const moveMin = (by: number) => {
    const value = steps[at(min) + by]?.value ?? min;
    set({ min: value, max: Math.max(max, value) });
  };
  const moveMax = (by: number) => {
    const value = steps[at(max) + by]?.value ?? max;
    set({ min: Math.min(min, value), max: value });
  };

  return (
    <Section label={label}>
      <View style={styles.wrap}>
        <Choice label="Any" on={!range} onPress={() => onChange(null)} />
        {presets.map((p) => (
          <Choice
            key={p.label}
            label={p.label}
            on={range?.min === p.range.min && range?.max === p.range.max}
            onPress={() => set(p.range)}
          />
        ))}
      </View>
      <View style={styles.steppers}>
        <Stepper
          label="From"
          value={steps[at(min)].label}
          onDown={min > first ? () => moveMin(-1) : null}
          onUp={min < last ? () => moveMin(1) : null}
        />
        <Stepper
          label="To"
          value={steps[at(max)].label}
          onDown={max > first ? () => moveMax(-1) : null}
          onUp={max < last ? () => moveMax(1) : null}
        />
      </View>
      <AppText type="small" color="textSecondary">
        {range ? rangeText(steps, range) : 'Any grade'}
      </AppText>
    </Section>
  );
}

function Stepper({
  label,
  value,
  onDown,
  onUp,
}: {
  label: string;
  value: string;
  onDown: (() => void) | null;
  onUp: (() => void) | null;
}) {
  const theme = useTheme();
  const button = (icon: 'remove' | 'add', onPress: (() => void) | null, name: string) => (
    <Pressable
      role="button"
      accessibilityLabel={`${label} ${name}`}
      disabled={!onPress}
      onPress={onPress ?? undefined}
      hitSlop={4}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: theme.backgroundElement },
        !onPress && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={22} color={theme.text} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      <AppText type="small" color="textSecondary">
        {label}
      </AppText>
      <View style={styles.stepRow}>
        {button('remove', onDown, 'easier')}
        <AppText style={styles.stepValue}>{value}</AppText>
        {button('add', onUp, 'harder')}
      </View>
    </View>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      role="checkbox"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        on
          ? { backgroundColor: theme.text, borderColor: theme.text }
          : { backgroundColor: theme.background, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <AppText type="small" style={[styles.choiceText, { color: on ? theme.background : theme.text }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.five,
  },
  done: { fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 22,
    borderWidth: 1,
  },
  choiceText: { fontWeight: '600' },
  steppers: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  stepper: { flex: 1, gap: Spacing.one },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepButton: { width: TapTarget - 8, height: TapTarget - 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepValue: { flex: 1, textAlign: 'center', fontWeight: '700', fontVariant: ['tabular-nums'] },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
});
