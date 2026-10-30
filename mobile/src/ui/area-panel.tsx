import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Spacing, TapTarget } from '@/constants/theme';
import type { MapDot } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { climbCount } from '@/ui/components';
import { PanelHeader, PanelLabel, panelListStyle, SidePanel } from '@/ui/side-panel';
import { AppText } from '@/ui/text';
import { FactChips } from '@/ui/wall/parts';

/**
 * An area picked on the map: its walls and sub-areas, by name, in the same
 * panel a wall opens. The caller places it.
 */
export function AreaPanel({
  name,
  place,
  totalClimbs,
  items,
  message,
  onPress,
  onBack,
  backLabel,
  style,
}: {
  name: string;
  place: string | null;
  totalClimbs: number;
  /** The area's children as the map draws them. */
  items: MapDot[];
  /** Shown in place of the list's label when there's nothing to list. */
  message: string | null;
  onPress: (item: MapDot) => void;
  onBack: () => void;
  backLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SidePanel style={style}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.uuid}
        ListHeaderComponent={
          <PanelHeader place={place} title={name} onBack={onBack} backLabel={backLabel}>
            <FactChips facts={areaFacts(totalClimbs, items)} />
            <PanelLabel>{message ?? 'Walls and areas'}</PanelLabel>
          </PanelHeader>
        }
        renderItem={({ item }) => <ItemRow item={item} onPress={onPress} />}
        contentContainerStyle={panelListStyle}
      />
    </SidePanel>
  );
}

/** Short facts for the area's header, like "1,204 routes", "12 walls" and "1 in 3D". */
function areaFacts(totalClimbs: number, items: MapDot[]): string[] {
  const walls = items.filter((i) => i.isLeaf).length;
  const areas = items.length - walls;
  const modeled = items.filter((i) => i.hasModel).length;
  return [
    climbCount(totalClimbs),
    walls ? count(walls, 'wall') : null,
    areas ? count(areas, 'area') : null,
    modeled ? `${modeled} in 3D` : null,
  ].filter((f): f is string => f != null);
}

function count(n: number, noun: string): string {
  return `${n.toLocaleString()} ${noun}${n === 1 ? '' : 's'}`;
}

function ItemRow({ item, onPress }: { item: MapDot; onPress: (item: MapDot) => void }) {
  const theme = useTheme();
  const subtitle = `${item.isLeaf ? 'Wall' : 'Area'} · ${climbCount(item.totalClimbs)}`;
  return (
    <Pressable
      role="button"
      accessibilityLabel={[item.name, subtitle, item.hasModel ? 'has a 3D model' : null].filter(Boolean).join(', ')}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <View style={styles.rowText}>
        <AppText numberOfLines={1} style={styles.rowTitle}>
          {item.name}
        </AppText>
        <AppText type="small" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {item.hasModel ? (
        <View style={[styles.model, { backgroundColor: theme.accent }]}>
          <AppText type="small" style={[styles.modelText, { color: theme.accentText }]}>
            3D
          </AppText>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1 },
  rowTitle: { fontWeight: '600' },
  model: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: 6 },
  modelText: { fontWeight: '700' },
});
