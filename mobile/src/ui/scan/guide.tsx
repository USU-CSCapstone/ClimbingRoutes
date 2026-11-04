import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { type ComponentProps, Fragment, type ReactNode, useCallback, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';

interface Tip {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
  Art: () => ReactNode;
}

/**
 * The parts of the capture checklist (docs/capture-checklist.md) that the in-app
 * camera needs, as the guide's three cards. The camera keeps itself on the 1x
 * lens with no zoom, so there's no card for that.
 */
const TIPS: Tip[] = [
  {
    icon: 'footsteps-outline',
    title: 'Step sideways',
    detail:
      "Walk along the wall and take a photo every step, holding still for each one. Don't stand in one place and turn.",
    Art: StepSideways,
  },
  {
    icon: 'copy-outline',
    title: 'Keep lots of overlap',
    detail:
      'Each photo should have overlap from the last photo. Start and finish a step past each end of the wall.',
    Art: Overlap,
  },
  {
    icon: 'arrow-back-outline',
    title: 'Step back for the top',
    detail:
      "Then, from where you are, walk back to where you started, this time a few steps back to get a view of the top, with the phone tilted up. Up close, the top is too steep to see well.",
    Art: StepBack,
  },
];

/** The full guide: one swipeable card per tip, then "Got it". */
export function GuideCards({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const list = useRef<FlatList<Tip>>(null);
  const window = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  // The cards span the screen; measuring only corrects that, so they show before the first layout.
  const width = measured || window.width;
  const [index, setIndex] = useState(0);
  const shown = useRef(0);
  const last = index === TIPS.length - 1;

  // On web, a screen left for the next one is hidden, which scrolls it back to the
  // first card without a scroll event. Put the cards back where they were on return.
  useFocusEffect(
    useCallback(() => {
      list.current?.scrollToOffset({ offset: shown.current * width, animated: false });
    }, [width]),
  );

  function show(card: number) {
    list.current?.scrollToOffset({ offset: card * width, animated: true });
  }

  function next() {
    if (last) onDone();
    else show(index + 1);
  }

  return (
    <View style={styles.flex}>
      <View style={styles.flex} onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}>
        <FlatList
          ref={list}
          data={TIPS}
          keyExtractor={(tip) => tip.title}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            shown.current = Math.round(e.nativeEvent.contentOffset.x / width);
            setIndex(shown.current);
          }}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <ScrollView style={{ width }} contentContainerStyle={styles.card}>
              <item.Art />
              <AppText type="title" style={styles.center}>
                {item.title}
              </AppText>
              <AppText color="textSecondary" style={styles.center}>
                {item.detail}
              </AppText>
            </ScrollView>
          )}
        />
      </View>
      <View style={styles.footer}>
        <View style={styles.dots} aria-label={`Tip ${index + 1} of ${TIPS.length}`}>
          {TIPS.map((tip, i) => (
            <View
              key={tip.title}
              style={[styles.dot, { backgroundColor: i === index ? theme.accent : theme.border }]}
            />
          ))}
        </View>
        <View style={styles.buttons}>
          {/* Greyed out on the first card rather than hidden, so Next doesn't change size. */}
          <View style={styles.flex}>
            <ActionButton label="Back" icon="arrow-back" onPress={() => show(index - 1)} disabled={index === 0} />
          </View>
          <View style={styles.flex}>
            <ActionButton label={last ? 'Got it' : 'Next'} onPress={next} primary />
          </View>
        </View>
      </View>
    </View>
  );
}

/** The one-screen reminder for later scans, with a way back to the full guide. */
export function GuideReminder({ onContinue, onShowAll }: { onContinue: () => void; onShowAll: () => void }) {
  const theme = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.reminder}>
      <AppText color="textSecondary">The same three things as last time:</AppText>
      {TIPS.map((tip) => (
        <View key={tip.title} style={styles.reminderRow}>
          <View style={[styles.reminderIcon, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name={tip.icon} size={24} color={theme.text} />
          </View>
          <View style={styles.flex}>
            <AppText style={styles.reminderTitle}>{tip.title}</AppText>
            <AppText type="small" color="textSecondary">
              {tip.detail}
            </AppText>
          </View>
        </View>
      ))}
      <ActionButton label="Continue" onPress={onContinue} primary />
      <ActionButton label="See the full guide" icon="albums-outline" onPress={onShowAll} />
    </ScrollView>
  );
}

// Illustrations, drawn from simple shapes and icons in the theme's colors.

function Frame({ children, height }: { children: ReactNode; height?: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.frame, height ? { height } : null, { backgroundColor: theme.backgroundElement }]}>
      {children}
    </View>
  );
}

/**
 * Where the phone is at each step, seen from above with the wall at the top: a
 * gentle arc around the wall, furthest back in the middle, turned to keep facing it.
 */
const ARC = [
  { y: 0, turn: 30 },
  { y: 16, turn: 15 },
  { y: 22, turn: 0 },
  { y: 16, turn: -15 },
  { y: 0, turn: -30 },
];
/**
 * One walk along the wall: the phone at each step of the arc, with arrows showing
 * which way it goes. A badge numbers the pass at the end it starts from.
 */
function ArcPass({
  back,
  faded,
  label,
  phone,
  spacing,
  footsteps,
}: {
  /** Walking right to left, back towards the start. */
  back?: boolean;
  faded?: boolean;
  label?: string;
  /** Size of each phone, which also sets how wide the arc is. */
  phone: number;
  spacing: number;
  footsteps?: boolean;
}) {
  const theme = useTheme();
  const arrow = Math.round(phone * 0.6);
  // Between two phones' centres, for pointing the arrows along the arc.
  const step = phone + arrow + 2 * spacing;
  const badge = label ? (
    <View style={[styles.badge, { backgroundColor: theme.accent }]}>
      <AppText style={[styles.badgeText, { color: theme.accentText }]}>{label}</AppText>
    </View>
  ) : null;
  return (
    <View style={[styles.row, { gap: spacing }]}>
      {back ? null : badge}
      {ARC.map((spot, i) => {
        const before = ARC[i - 1];
        const slope = before ? (Math.atan2(spot.y - before.y, step) * 180) / Math.PI : 0;
        return (
          <Fragment key={i}>
            {before ? (
              <Ionicons
                name={back ? 'arrow-back' : 'arrow-forward'}
                size={arrow}
                color={theme.accent}
                style={[
                  faded && styles.faded,
                  { transform: [{ translateY: (before.y + spot.y) / 2 }, { rotate: `${slope}deg` }] },
                ]}
              />
            ) : null}
            <View
              style={[
                styles.position,
                faded && styles.faded,
                { transform: [{ translateY: spot.y }, { rotate: `${spot.turn}deg` }] },
              ]}>
              <Ionicons name="phone-portrait-outline" size={phone} color={theme.text} />
              {footsteps ? (
                <Ionicons name="footsteps-outline" size={Math.round(phone * 0.55)} color={theme.textSecondary} />
              ) : null}
            </View>
          </Fragment>
        );
      })}
      {back ? badge : null}
    </View>
  );
}

/** The wall along the top, and the phone stepping along an arc in front of it. */
function StepSideways() {
  const theme = useTheme();
  return (
    <Frame>
      <View style={[styles.wallStrip, { backgroundColor: theme.textSecondary }]} />
      <View style={styles.arc}>
        <ArcPass phone={28} spacing={Spacing.one} footsteps />
      </View>
    </Frame>
  );
}

/** Three photos, each overlapping most of the one before. */
function Overlap() {
  const theme = useTheme();
  return (
    <Frame>
      <View style={styles.photos}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.photo,
              { left: i * 36, borderColor: theme.accent, backgroundColor: `${theme.accent}26` },
            ]}
          />
        ))}
      </View>
    </Frame>
  );
}

/**
 * Both passes from above: the first, close to the wall (faded), then the second,
 * further back and walking the other way, back to where the first one started.
 */
function StepBack() {
  const theme = useTheme();
  return (
    <Frame height={230}>
      <View style={[styles.wallStrip, { backgroundColor: theme.textSecondary }]} />
      <View style={styles.passes}>
        <ArcPass label="1" phone={20} spacing={Spacing.half} faded />
        <ArcPass label="2" phone={26} spacing={Spacing.two} back footsteps />
      </View>
    </Frame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  card: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  footer: {
    gap: Spacing.three,
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  reminder: {
    gap: Spacing.three,
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  reminderIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { fontWeight: '700' },
  frame: { height: 170, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  arc: { marginTop: Spacing.three },
  passes: { alignItems: 'center', gap: Spacing.four, marginTop: Spacing.four },
  badge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  position: { alignItems: 'center', gap: Spacing.one },
  wallStrip: { position: 'absolute', top: 18, left: 24, right: 24, height: 14, borderRadius: 4, opacity: 0.5 },
  photos: { width: 162, height: 64 },
  photo: { position: 'absolute', top: 0, width: 90, height: 64, borderRadius: 6, borderWidth: 2 },
  faded: { opacity: 0.4 },
});
