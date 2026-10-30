import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLatestModel } from '@/data/models';
import { useArea } from '@/data/queries';
import { Loading, Message } from '@/ui/components';
import { ScanCard } from '@/ui/scan-card';
import { WallView } from '@/ui/wall/wall-view';

/** /walls/<OpenBeta area uuid>?route=<uuid> opens the wall's newest published model, with that route selected. */
export default function WallScreen() {
  const { id, route } = useLocalSearchParams<{ id: string; route?: string }>();
  const model = useLatestModel(id);
  const area = useArea(id);

  if (model.data === undefined || area.data === undefined) {
    const error = model.error ?? area.error;
    if (!error) return <Loading />;
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Wall' }} />
        <Message title="Couldn't open the 3D wall" detail={error.message} />
      </>
    );
  }
  if (!model.data && area.data?.isLeaf && !area.data.isBoulder) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: area.data.name }} />
        <View style={styles.noModel}>
          <ScanCard wallUuid={area.data.uuid} />
        </View>
      </>
    );
  }
  if (!model.data || !area.data) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: area.data?.name ?? 'Wall not found' }} />
        <Message title="No 3D model yet" detail="This wall hasn't been modeled yet." />
      </>
    );
  }
  return (
    <WallView
      wall={{ uuid: area.data.uuid, name: area.data.name }}
      model={model.data}
      selected={route || null}
      onSelect={(uuid) => router.setParams({ route: uuid ?? undefined })}
    />
  );
}

const styles = StyleSheet.create({
  noModel: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
  },
});
