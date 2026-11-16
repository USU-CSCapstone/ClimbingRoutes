import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Spacing, TapTarget } from '@/constants/theme';
import type { WallModel } from '@/core/database';
import { useApproveModel, useRejectModel } from '@/data/review';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';

/**
 * Approve or reject a model waiting for review. Approving publishes it to
 * everyone and can't be undone in the app, so it asks first, mentioning
 * unsaved or undrawn lines. Rejecting asks why.
 */
export function DecisionPanel({
  model,
  name,
  drawn,
  total,
  unsaved,
  ready,
}: {
  model: WallModel;
  name: string;
  /** Routes with a saved line on this version, out of `total`. */
  drawn: number;
  total: number;
  unsaved: boolean;
  /** The wall's routes and saved lines have loaded, so the confirmation is accurate. */
  ready: boolean;
}) {
  const theme = useTheme();
  const approve = useApproveModel(model);
  const reject = useRejectModel(model);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const busy = approve.isPending || reject.isPending;
  const error = approve.error ?? reject.error;

  function confirmApprove() {
    const warnings = [
      unsaved ? 'Some lines aren’t saved and won’t be published.' : null,
      drawn < total ? `${drawn} of ${total} routes have a line.` : null,
    ].filter(Boolean);
    const text = [`Publish ${name} v${model.version}?`, ...warnings, 'Everyone will see it, and it can’t be unpublished.'];
    if (confirm(text.join('\n\n'))) approve.mutate();
  }

  return (
    <View style={styles.panel}>
      {error ? <AppText color="danger">{error.message}</AppText> : null}
      {rejecting ? (
        <>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Why? For example: photos didn’t overlap, model is warped"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.note, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <ActionButton
            icon="close-circle-outline"
            label={reject.isPending ? 'Rejecting…' : 'Reject model'}
            onPress={() => reject.mutate(note)}
            disabled={busy || !note.trim()}
            primary
          />
          <ActionButton label="Cancel" onPress={() => setRejecting(false)} disabled={busy} />
        </>
      ) : (
        <>
          <ActionButton
            icon="checkmark-circle-outline"
            label={approve.isPending ? 'Publishing…' : 'Approve and publish'}
            onPress={confirmApprove}
            disabled={busy || !ready}
            primary
          />
          <ActionButton icon="close-circle-outline" label="Reject" onPress={() => setRejecting(true)} disabled={busy} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: Spacing.two },
  note: { minHeight: TapTarget * 1.5, borderRadius: 12, padding: Spacing.three, fontSize: 16, textAlignVertical: 'top' },
});
