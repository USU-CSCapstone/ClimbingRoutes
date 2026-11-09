import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { MaxContentWidth, SerifFont, Spacing } from '@/constants/theme';
import type { ModelStatus, WallModel } from '@/core/database';
import { useArea } from '@/data/queries';
import { useWallModel } from '@/data/review';
import { Loading, Message } from '@/ui/components';
import { modelSummary } from '@/ui/review/model-summary';
import { AppText } from '@/ui/text';

const STATUS: Record<ModelStatus, string> = {
  needs_review: 'Waiting for review',
  published: 'Published',
  rejected: 'Rejected',
};

/** /moderate/<model id>: one model's review page. */
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const model = useWallModel(id);

  if (model.isPending) return <Loading />;
  if (model.error) return <Message title="Couldn't load the model" detail={model.error.message} />;
  if (!model.data) return <Message title="Model not found" />;
  return <Review model={model.data} />;
}

function Review({ model }: { model: WallModel }) {
  const area = useArea(model.wall_uuid);
  const name = area.data?.name ?? 'Wall';
  return (
    <>
      <Stack.Screen options={{ title: `${name} v${model.version}` }} />
      <ScrollView contentContainerStyle={styles.page}>
        <AppText style={[styles.wall, { fontFamily: SerifFont }]}>{name}</AppText>
        <AppText color="textSecondary">{modelSummary(model)}</AppText>
        <AppText>{STATUS[model.status]}</AppText>
        {model.review_note ? <AppText color="textSecondary">{model.review_note}</AppText> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.two },
  wall: { fontSize: 30, lineHeight: 36 },
});
