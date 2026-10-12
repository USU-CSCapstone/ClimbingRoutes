import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { Climb, GradeSystem } from '@/core/types';
import { useClimb } from '@/data/queries';
import { Breadcrumb, disciplineText, GradeBadge, Loading, Message, Section } from '@/ui/components';
import { AppText } from '@/ui/text';

const GRADE_LABELS: Record<GradeSystem, string> = {
  yds: 'YDS',
  vscale: 'V',
  french: 'French',
  font: 'Font',
  uiaa: 'UIAA',
  ewbank: 'Ewbank',
  wi: 'WI',
};

export default function ClimbScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: climb, isPending, error } = useClimb(id);

  if (isPending) return <Loading />;
  if (error) return <Message title="Couldn't load this route" detail={error.message} />;
  if (!climb) return <Message title="Route not found" />;

  return (
    <>
      <Stack.Screen options={{ title: climb.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Breadcrumb path={climb.path} />
        <View style={styles.titleRow}>
          <AppText type="title" style={styles.title}>
            {climb.name}
          </AppText>
          <GradeBadge grade={climb.grade} large />
        </View>
        <Facts climb={climb} />
        {climb.description ? (
          <Section label="Description">
            <AppText>{climb.description}</AppText>
          </Section>
        ) : null}
        {climb.locationText ? (
          <Section label="Location">
            <AppText>{climb.locationText}</AppText>
          </Section>
        ) : null}
        {climb.protection ? (
          <Section label="Protection">
            <AppText>{climb.protection}</AppText>
          </Section>
        ) : null}
        {/* Later: "View on wall (3D)" opens the wall's model fullscreen. */}
        <AppText type="small" color="textSecondary" style={styles.credit}>
          Data from OpenBeta (CC0)
        </AppText>
      </ScrollView>
    </>
  );
}

function Facts({ climb }: { climb: Climb }) {
  const otherGrades = Object.entries(climb.allGrades)
    .filter(([system]) => system !== climb.grade?.system)
    .map(([system, text]) => `${GRADE_LABELS[system as GradeSystem]} ${text}`)
    .join(' · ');
  const facts: [string, string | null][] = [
    ['Type', disciplineText(climb.disciplines) || null],
    ['Length', climb.lengthMeters ? formatLength(climb.lengthMeters) : null],
    ['Bolts', climb.bolts ? String(climb.bolts) : null],
    ['First ascent', climb.fa],
    ['Other grades', otherGrades || null],
  ];
  return (
    <View style={styles.facts}>
      {facts.map(([label, value]) => (
        <View key={label} style={styles.fact}>
          <AppText type="label" color="textSecondary" style={styles.factLabel}>
            {label}
          </AppText>
          <AppText style={styles.factValue} color={value ? 'text' : 'textSecondary'}>
            {value ?? 'Unknown'}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function formatLength(meters: number): string {
  return `${Math.round(meters * 3.281)} ft (${Math.round(meters)} m)`;
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.five,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  title: { flex: 1 },
  facts: { gap: Spacing.two },
  fact: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three },
  factLabel: { width: 110 },
  factValue: { flex: 1 },
  credit: { marginTop: Spacing.three },
});
