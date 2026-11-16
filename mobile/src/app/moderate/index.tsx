import { type Href, Stack } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { WallModel } from '@/core/database';
import { useArea } from '@/data/queries';
import { useReviewQueue } from '@/data/review';
import { LinkRow, Loading, Message } from '@/ui/components';
import { modelSummary } from '@/ui/review/model-summary';
import { AppText } from '@/ui/text';

/** /moderate: the review queue, models the team PC made that are waiting for the moderator. */
export default function ReviewQueueScreen() {
  const queue = useReviewQueue();

  let body;
  if (queue.isPending) body = <Loading />;
  else if (queue.error) body = <Message title="Couldn't load the queue" detail={queue.error.message} />;
  else if (!queue.data.length) body = <Message title="Nothing to review" detail="New models show up here once the team PC finishes them." />;
  else {
    body = (
      <FlatList
        data={queue.data}
        keyExtractor={(model) => model.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <AppText type="label" color="textSecondary" style={styles.label}>
            {`Waiting for review · ${queue.data.length}`}
          </AppText>
        }
        renderItem={({ item }) => <QueueRow model={item} />}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Review queue' }} />
      {body}
    </>
  );
}

function QueueRow({ model }: { model: WallModel }) {
  const area = useArea(model.wall_uuid);
  return (
    <LinkRow
      href={`/moderate/${model.id}` as Href}
      title={area.data?.name ?? (area.isPending ? 'Loading…' : 'Unknown wall')}
      subtitle={modelSummary(model)}
    />
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingBottom: Spacing.four },
  label: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.one },
});
