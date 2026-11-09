import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';
import type { ShownRoute } from '@/ui/wall/types';

/**
 * Drawing controls for the selected route, at the foot of the review panel:
 * draw, undo, clear, save, and delete the saved line.
 */
export function DrawPanel({
  route,
  points,
  drawing,
  unsaved,
  savedLine,
  status,
  busy,
  onDraw,
  onUndo,
  onClear,
  onSave,
  onDelete,
}: {
  route: ShownRoute;
  points: number;
  drawing: boolean;
  /** The line differs from what's saved. */
  unsaved: boolean;
  /** A line for this route is saved on this version. */
  savedLine: boolean;
  /** The last thing that happened, like "That click missed the wall" or an error. */
  status: { text: string; error?: boolean } | null;
  busy: boolean;
  onDraw: (on: boolean) => void;
  onUndo: () => void;
  onClear: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const hint = drawing
    ? 'Click holds on the rock from the start upward. Ctrl+Z undoes the last point, Esc stops.'
    : points
      ? `${points} ${points === 1 ? 'point' : 'points'}${unsaved ? ', not saved' : ''}`
      : 'No line drawn yet.';

  return (
    <View style={[styles.panel, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
      <AppText style={styles.title} numberOfLines={1}>
        {`${route.number}. ${route.name}`}
      </AppText>
      <AppText type="small" color="textSecondary">
        {hint}
      </AppText>
      {status ? (
        <AppText type="small" color={status.error ? 'danger' : 'textSecondary'}>
          {status.text}
        </AppText>
      ) : null}
      <ActionButton
        icon={drawing ? 'checkmark' : 'brush-outline'}
        label={drawing ? 'Stop drawing' : points ? 'Add points' : 'Draw line'}
        onPress={() => onDraw(!drawing)}
        primary={!drawing && !unsaved}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <ActionButton icon="arrow-undo" label="Undo" onPress={onUndo} disabled={!points || busy} />
        </View>
        <View style={styles.flex}>
          <ActionButton icon="close" label="Clear" onPress={onClear} disabled={!points || busy} />
        </View>
      </View>
      <ActionButton
        icon="save-outline"
        label={busy ? 'Saving…' : 'Save line'}
        onPress={onSave}
        primary={unsaved}
        disabled={!unsaved || points < 2 || busy}
      />
      {savedLine ? <ActionButton icon="trash-outline" label="Delete saved line" onPress={onDelete} disabled={busy} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: Spacing.three, gap: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  title: { fontWeight: '700' },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
