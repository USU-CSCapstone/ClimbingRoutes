import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing, TapTarget } from '@/constants/theme';
import type { AreaSummary, Uuid } from '@/core/types';
import { usePublishedWalls } from '@/data/models';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/text';

/** A scan started on this wall and not uploaded yet. Filled in from the scan storage in #44. */
export interface UnfinishedScan {
  id: string;
  photos: number;
}

/**
 * True for a wall with no published model, once the list of published walls has
 * loaded, so a wall that has one never flashes the card. Boulders are left out:
 * they need walk-around models, which come later.
 */
export function useNeedsScan(area: Pick<AreaSummary, 'uuid' | 'isLeaf' | 'isBoulder'> | null | undefined): boolean {
  const { data: published } = usePublishedWalls();
  return area != null && area.isLeaf && !area.isBoulder && published != null && !published.has(area.uuid);
}

/** "No 3D model yet — scan this wall", opening the scan flow for the wall, or resuming an unfinished scan. */
export function ScanCard({ wallUuid, unfinished }: { wallUuid: Uuid; unfinished?: UnfinishedScan | null }) {
  const theme = useTheme();
  const scan = (scanId?: string) =>
    router.push((scanId ? `/scan/${wallUuid}?scan=${scanId}` : `/scan/${wallUuid}`) as Href);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.heading}>
        <Ionicons name="cube-outline" size={22} color={theme.text} />
        <AppText type="heading">No 3D model yet</AppText>
      </View>
      <AppText color="textSecondary">
        {unfinished
          ? `You have an unfinished scan of this wall, with ${unfinished.photos} ${unfinished.photos === 1 ? 'photo' : 'photos'}.`
          : 'Photograph this wall with your phone, and the team will make it into a 3D model with its routes drawn on.'}
      </AppText>
      {unfinished ? (
        <>
          <Button icon="play" label="Resume scan" onPress={() => scan(unfinished.id)} primary />
          <Button icon="add" label="Start a new scan" onPress={() => scan()} />
        </>
      ) : (
        <Button icon="scan-outline" label="Scan this wall" onPress={() => scan()} primary />
      )}
    </View>
  );
}

function Button({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: 'play' | 'add' | 'scan-outline';
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const theme = useTheme();
  const color = primary ? theme.accentText : theme.text;
  return (
    <Pressable
      role="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: theme.accent } : { borderColor: theme.border, borderWidth: 1 },
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={20} color={color} />
      <AppText style={[styles.buttonText, { color }]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  button: {
    minHeight: TapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 12,
  },
  buttonText: { fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
