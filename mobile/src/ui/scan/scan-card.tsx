import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { MIN_PHOTOS } from '@/core/scan-plan';
import type { AreaSummary, Uuid } from '@/core/types';
import { usePublishedWalls } from '@/data/models';
import { deleteScan, useScans } from '@/data/scans';
import { cancelUpload, hasUploadConsent, kickUploads, startUpload, useUploadProgress } from '@/data/uploads';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton, scanHref } from '@/ui/scan/controls';
import { uploadText } from '@/ui/scan/upload-status';
import { AppText } from '@/ui/text';

/**
 * True for a wall with no published model, once the list of published walls has
 * loaded, so a wall that has one never flashes the card. Boulders are left out:
 * they need walk-around models, which come later.
 */
export function useNeedsScan(area: Pick<AreaSummary, 'uuid' | 'isLeaf' | 'isBoulder'> | null | undefined): boolean {
  const { data: published } = usePublishedWalls();
  return area != null && area.isLeaf && !area.isBoulder && published != null && !published.has(area.uuid);
}

/**
 * "No 3D model yet — scan this wall", opening the scan flow for the wall. With a
 * scan of the wall still on the phone, it offers to resume, upload or delete it,
 * and once it's uploading, shows how far it's got.
 */
export function ScanCard({ wallUuid }: { wallUuid: Uuid }) {
  const theme = useTheme();
  const scan = useScans().find((s) => s.wallUuid === wallUuid) ?? null;
  const progress = useUploadProgress(scan?.id);
  const start = () => router.push(scanHref(wallUuid));

  let body;
  if (scan?.status === 'uploading') {
    body = (
      <>
        <AppText color={progress?.state === 'failed' ? 'danger' : 'textSecondary'}>{uploadText(progress)}</AppText>
        {progress?.state === 'failed' ? <ActionButton icon="refresh" label="Try again" onPress={kickUploads} primary /> : null}
        <ActionButton label="Stop uploading" onPress={() => cancelUpload(scan.id)} />
      </>
    );
  } else if (scan) {
    const count = scan.photos.length;
    const enough = count >= MIN_PHOTOS;
    const upload = () =>
      hasUploadConsent() ? startUpload(scan.id) : router.push(`/scan/consent?scan=${scan.id}` as Href);
    body = (
      <>
        <AppText color="textSecondary">
          {`You have an unfinished scan of this wall, with ${count} ${count === 1 ? 'photo' : 'photos'}.`}
          {enough ? '' : ` Uploading needs at least ${MIN_PHOTOS}.`}
        </AppText>
        <ActionButton
          icon="play"
          label="Resume scan"
          onPress={() => router.push(scanHref(wallUuid, scan.source === 'upload' ? 'upload' : 'camera', { scan: scan.id }))}
          primary={!enough}
        />
        <ActionButton icon="cloud-upload-outline" label={`Upload ${count} photos`} onPress={upload} primary={enough} disabled={!enough} />
        <ActionButton icon="trash-outline" label="Delete scan" onPress={() => confirmDelete(scan.id, count)} />
        <ActionButton icon="add" label="Start a new scan" onPress={start} />
      </>
    );
  } else {
    body = (
      <>
        <AppText color="textSecondary">
          Photograph this wall with your phone, and the team will make it into a 3D model with its routes drawn on.
        </AppText>
        <ActionButton icon="scan-outline" label="Scan this wall" onPress={start} primary />
      </>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.heading}>
        <Ionicons name={scan?.status === 'uploading' ? 'cloud-upload-outline' : 'cube-outline'} size={22} color={theme.text} />
        <AppText type="heading">{scan?.status === 'uploading' ? 'Uploading your scan' : 'No 3D model yet'}</AppText>
      </View>
      {body}
    </View>
  );
}

function confirmDelete(id: string, count: number) {
  Alert.alert('Delete this scan?', `Its ${count} photos will be deleted from your phone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteScan(id) },
  ]);
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
