import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Display, SectionTitle } from '@/ui/home/kit';
import { AppText } from '@/ui/text';

type IconName = ComponentProps<typeof Ionicons>['name'];

const STEPS: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'search', title: 'Find the wall', detail: 'In Explore or on the Map' },
  { icon: 'camera', title: 'Scan it', detail: 'Photos in the app, or upload yours' },
  { icon: 'cube', title: 'Open it in 3D', detail: 'Once the team builds the model' },
];

/**
 * How a wall gets its 3D model, as three steps in a row joined by a dashed
 * line. Scans start from the wall's own page, so this explains the way there
 * instead of starting one.
 */
export function ScanSection() {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <SectionTitle>Scan a wall</SectionTitle>
      <AppText color="textSecondary" style={styles.lead}>
        Any wall without a 3D model can be scanned with a phone.
      </AppText>
      <View style={styles.steps}>
        {/* The line runs between the first and last circles, behind all three. */}
        <View pointerEvents="none" style={styles.line}>
          <Svg width="100%" height={2}>
            <Line x1="0" y1="1" x2="100%" y2="1" stroke={theme.border} strokeWidth={2} strokeDasharray="6 5" />
          </Svg>
        </View>
        {STEPS.map((step) => (
          <View key={step.title} style={styles.step}>
            {/* A ring of the page's color keeps the line from touching the circle. */}
            <View style={[styles.ring, { backgroundColor: theme.background }]}>
              <View style={[styles.dot, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name={step.icon} size={22} color={theme.accent} />
              </View>
            </View>
            <Display style={styles.stepTitle}>{step.title}</Display>
            <AppText color="textSecondary" style={styles.stepDetail}>
              {step.detail}
            </AppText>
          </View>
        ))}
      </View>
      {/* The photo tips page is #72. Until then this shows where its link will go. */}
      <View style={[styles.tips, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="bulb-outline" size={20} color={theme.text} />
        <AppText style={styles.tipsTitle}>Photo tips</AppText>
        <AppText type="small" color="textSecondary" style={styles.soon}>
          Coming soon
        </AppText>
      </View>
    </View>
  );
}

const DOT = 48;
const RING = 6;

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.three },
  lead: { fontSize: 16, lineHeight: 23, marginTop: 6, marginBottom: Spacing.three + Spacing.half },
  steps: { flexDirection: 'row', gap: 10 },
  line: { position: 'absolute', left: '16.6%', right: '16.6%', top: RING + DOT / 2 - 1 },
  step: { flex: 1, alignItems: 'center', gap: Spacing.one },
  ring: { padding: RING, borderRadius: DOT / 2 + RING },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 15, lineHeight: 19, letterSpacing: -0.3, textAlign: 'center' },
  stepDetail: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
  tips: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 26, paddingHorizontal: Spacing.three + Spacing.half, marginTop: Spacing.three + Spacing.half, opacity: 0.6 },
  tipsTitle: { fontSize: 15, fontWeight: '600' },
  soon: { marginLeft: 'auto', fontSize: 13 },
});
