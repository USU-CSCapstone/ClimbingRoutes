import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { minimumPhotos } from '@/core/scan-plan';
import type { AreaSummary, Uuid } from '@/core/types';
import { useSession } from '@/data/auth';
import { useMyCaptures } from '@/data/captures';
import { usePublishedWalls } from '@/data/models';
import { deleteScan, useScans } from '@/data/scans';
import { cancelUpload, hasUploadConsent, kickUploads, startUpload, useUploadProgress } from '@/data/uploads';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton, scanHref } from '@/ui/scan/controls';
import { CAPTURE_STATUS, uploadText } from '@/ui/scan/upload-status';
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
 * and once it's uploading, shows how far it's got. The phone's copy is deleted
 * once it's uploaded, so after that it shows where the uploaded scan is (#77).
 */
export function ScanCard({ wallUuid }: { wallUuid: Uuid }) {
  const theme = useTheme();
  const scan = useScans().find((s) => s.wallUuid === wallUuid) ?? null;
  const progress = useUploadProgress(scan?.id);
  const { session } = useSession();
  // Newest first, so this is the latest scan of the wall this account uploaded.
  const capture = useMyCaptures(session?.user.id).data?.find((c) => c.wall_uuid === wallUuid) ?? null;
  const withTeam = !scan && capture != null && capture.status !== 'failed';
  const start = () => router.push(scanHref(wallUuid));

  let body;
  if (scan?.status === 'uploading') {
    body = (
      <>
        <AppText color={progress?.state === 'failed' ? 'danger' : 'textSecondary'}>{uploadText(progress)}</AppText>
        {progress?.state === 'failed' ? <ActionButton icon="refresh" label="Try again" onPress={kickUploads} primary /> : null}
        {progress?.state === 'finishing' ? null : (
          <ActionButton label="Stop uploading" onPress={() => cancelUpload(scan.id)} />
        )}
      </>
    );
  } else if (scan) {
    const count = scan.photos.length;
    const minimum = minimumPhotos(scan.plan?.wallSize);
    const enough = count >= minimum;
    const upload = () =>
      hasUploadConsent() ? startUpload(scan.id) : router.push(`/scan/consent?scan=${scan.id}` as Href);
    body = (
      <>
        <AppText color="textSecondary">
          {`You have an unfinished scan of this wall, with ${count} ${count === 1 ? 'photo' : 'photos'}.`}
          {enough ? '' : ` Uploading needs at least ${minimum}.`}
        </AppText>
        <AppText type="small" color="textSecondary">
          Uploading deletes the scan from this phone, so look through it first.
        </AppText>
        <ActionButton
          icon="play"
          label="Resume scan"
          // Picked photos carry on in review, whose Add more reopens the picker.
          onPress={() => router.push(scanHref(wallUuid, scan.source === 'upload' ? 'review' : 'camera', { scan: scan.id }))}
          primary={!enough}
        />
        <ActionButton icon="cloud-upload-outline" label={`Upload ${count} photos`} onPress={upload} primary={enough} disabled={!enough} />
        <ActionButton icon="trash-outline" label="Delete scan" onPress={() => confirmDelete(scan.id, count)} />
        <ActionButton icon="add" label="Start a new scan" onPress={start} />
      </>
    );
  } else if (withTeam) {
    body = (
      <>
        <AppText color="textSecondary">
          {`${CAPTURE_STATUS[capture.status]}. The photos are with the team now, and no longer on this phone.`}
        </AppText>
        <ActionButton icon="add" label="Start a new scan" onPress={start} />
      </>
    );
  } else {
    const failed = capture?.status === 'failed';
    body = (
      <>
        {failed ? (
          <AppText color="danger">
            {`Your last scan of this wall couldn't be made into a model${capture.failure_reason ? `: ${capture.failure_reason}` : ''}.`}
          </AppText>
        ) : null}
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
        <Ionicons
          name={scan?.status === 'uploading' ? 'cloud-upload-outline' : withTeam ? 'cloud-done-outline' : 'cube-outline'}
          size={22}
          color={theme.text}
        />
        <AppText type="heading">
          {scan?.status === 'uploading' ? 'Uploading your scan' : withTeam ? 'Scan uploaded' : 'No 3D model yet'}
        </AppText>
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
