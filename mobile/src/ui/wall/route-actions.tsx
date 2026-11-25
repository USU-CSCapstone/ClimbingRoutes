import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Difficulty, Spacing } from '@/constants/theme';
import { dayLabel, dayName, shiftDay, today } from '@/core/days';
import { useUserId } from '@/data/auth';
import { type RouteRef, useClimbedRoutes, useRemoveClimbed, useSavedRoutes, useSetClimbed, useSetSaved } from '@/data/logbook';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';
import { RoundButton } from '@/ui/wall/parts';
import type { ShownRoute, WallInfo } from '@/ui/wall/types';

const HEIGHT = 38;

function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

/**
 * A route's two buttons for the signed-in climber: a bookmark that saves it,
 * and "Climbed it", which marks it climbed today. Once climbed, the button
 * shows the day, and tapping it again offers to change the day or take the
 * climb back. Signed out, both lead to the Profile tab, which has the ways in.
 * `roomy` is whether there's room to spell the day out as "Climbed Nov 14".
 */
export function RouteActions({ wall, route, roomy }: { wall: WallInfo; route: ShownRoute; roomy: boolean }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const userId = useUserId();
  const saved = useSavedRoutes().data?.some((r) => r.climb_uuid === route.uuid) ?? false;
  const climbedOn = useClimbedRoutes().data?.find((r) => r.climb_uuid === route.uuid)?.climbed_on ?? null;
  const setSaved = useSetSaved();
  const setClimbed = useSetClimbed();
  const removeClimbed = useRemoveClimbed();
  const [editing, setEditing] = useState(false);

  const ref: RouteRef = { climbUuid: route.uuid, wallUuid: wall.uuid, name: route.name, grade: route.grade?.text ?? null, wallName: wall.name };
  const signIn = () => router.navigate('/(tabs)/profile');
  const blue = Difficulty[1][dark ? 'dark' : 'light'];
  const green = Difficulty[0][dark ? 'dark' : 'light'];
  const outline = { borderColor: theme.border, backgroundColor: theme.background };

  function toggleSaved() {
    if (!userId) return signIn();
    tap();
    setSaved.mutate({ route: ref, saved: !saved });
  }

  function climbed() {
    if (!userId) return signIn();
    if (climbedOn) return setEditing(true);
    tap();
    setClimbed.mutate({ route: ref, day: today() });
  }

  return (
    <>
      <Pressable
        role="button"
        accessibilityLabel={saved ? `Take ${route.name} off your saved routes` : `Save ${route.name}`}
        accessibilityState={{ selected: saved }}
        onPress={toggleSaved}
        hitSlop={6}
        style={({ pressed }) => [styles.save, saved ? { backgroundColor: blue.bg, borderColor: blue.bg } : outline, pressed && styles.pressed]}>
        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={19} color={saved ? blue.text : theme.text} />
      </Pressable>
      <Pressable
        role="button"
        accessibilityLabel={climbedOn ? `Climbed ${dayLabel(climbedOn)}. Change the day or remove it` : `Mark ${route.name} climbed today`}
        onPress={climbed}
        hitSlop={6}
        style={({ pressed }) => [styles.climbed, climbedOn ? { backgroundColor: green.bg, borderColor: green.bg } : outline, pressed && styles.pressed]}>
        <Ionicons name={climbedOn ? 'checkmark-circle' : 'checkmark-circle-outline'} size={19} color={climbedOn ? green.text : theme.text} />
        <AppText numberOfLines={1} style={[styles.climbedText, { color: climbedOn ? green.text : theme.text }]}>
          {climbedOn ? (roomy ? `Climbed ${dayLabel(climbedOn)}` : dayLabel(climbedOn)) : 'Climbed it'}
        </AppText>
      </Pressable>
      {editing && climbedOn ? (
        <ClimbedSheet
          name={route.name}
          day={climbedOn}
          onDay={(day) => setClimbed.mutate({ route: ref, day, known: true })}
          onRemove={() => removeClimbed.mutate(route.uuid)}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  );
}

/** Change the day a route was climbed, a day at a time back from today, or take the climb off the list. */
function ClimbedSheet({
  name,
  day,
  onDay,
  onRemove,
  onClose,
}: {
  name: string;
  day: string;
  onDay: (day: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [picked, setPicked] = useState(day);
  const latest = today();

  function done() {
    if (picked !== day) onDay(picked);
    onClose();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View>
            <AppText type="heading" numberOfLines={1}>
              {name}
            </AppText>
            <AppText color="textSecondary">The day you climbed it</AppText>
          </View>
          <View style={[styles.stepper, { backgroundColor: theme.backgroundElement }]}>
            <RoundButton icon="chevron-back" label="A day earlier" onPress={() => setPicked((d) => shiftDay(d, -1))} />
            <AppText accessibilityLiveRegion="polite" style={styles.day}>
              {dayName(picked)}
            </AppText>
            <RoundButton icon="chevron-forward" label="A day later" disabled={picked >= latest} onPress={() => setPicked((d) => shiftDay(d, 1))} />
          </View>
          <View style={styles.buttons}>
            <View style={styles.flex}>
              <ActionButton
                icon="trash-outline"
                label="Remove"
                onPress={() => {
                  onRemove();
                  onClose();
                }}
              />
            </View>
            <View style={styles.flex}>
              <ActionButton label="Done" onPress={done} primary />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  save: { width: HEIGHT, height: HEIGHT, borderRadius: HEIGHT / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  climbed: {
    height: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    paddingLeft: Spacing.two + Spacing.half,
    paddingRight: Spacing.three - Spacing.one,
    borderRadius: HEIGHT / 2,
    borderWidth: 1.5,
    flexShrink: 1,
  },
  climbedText: { fontSize: 15, lineHeight: 20, fontWeight: '700', flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', alignItems: 'center', padding: Spacing.three },
  sheet: { width: '100%', maxWidth: 380, borderRadius: 24, padding: Spacing.three + Spacing.one, gap: Spacing.three },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 28, padding: Spacing.two },
  day: { flex: 1, textAlign: 'center', fontWeight: '700', fontVariant: ['tabular-nums'] },
  buttons: { flexDirection: 'row', gap: Spacing.two },
});
