import { type Href, router } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Difficulty, SerifFont, Spacing } from '@/constants/theme';
import type { Scan } from '@/core/capture';
import { dayLabel, toDay } from '@/core/days';
import { SCAN_STEPS } from '@/core/scan-progress';
import { useUserId } from '@/data/auth';
import { type MyScan, useMyScans } from '@/data/captures';
import { useArea } from '@/data/queries';
import { useScans } from '@/data/scans';
import { useUploadProgress } from '@/data/uploads';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { Display } from '@/ui/home/kit';
import { Busy, Chip, Empty, GUTTER, PillButton, useTint } from '@/ui/profile/kit';
import { ActionButton, scanHref } from '@/ui/scan/controls';
import { uploadText } from '@/ui/scan/upload-status';
import { AppText } from '@/ui/text';

/** Behind the reason in dark mode: the red tint is meant for small labels, and too loud for a whole box. */
const WHY_DARK = '#3A1C1C';
/** What a scan that wasn't used says when nobody wrote down why. */
const NO_REASON = 'The team couldn’t make a 3D model from these photos.';

/**
 * Every scan this account has sent and what became of it: still uploading
 * from this phone, on its way through the team, published as a wall in 3D, or
 * not used, with the reason. The number at the top is how many walls are in
 * 3D because of these scans.
 */
export function ScansTab() {
  const userId = useUserId();
  const scans = useMyScans(userId);
  const uploading = useScans().filter((s) => s.status === 'uploading');

  if (scans.error && !uploading.length) {
    return (
      <Empty icon="cloud-offline-outline" title="Couldn't load your scans" detail={scans.error.message}>
        <ActionButton icon="refresh" label="Try again" onPress={() => scans.refetch()} />
      </Empty>
    );
  }
  if (!scans.data && !scans.error) return <Busy />;
  const sent = scans.data ?? [];
  if (!sent.length && !uploading.length) {
    return (
      <Empty
        icon="cube-outline"
        title="No scans yet"
        detail="Photograph a wall with your phone and follow it here until it’s a wall in 3D.">
        <ActionButton icon="camera-outline" label="How to photograph a wall" onPress={() => router.push('/photo-tips')} primary />
      </Empty>
    );
  }

  const walls = new Set(sent.filter((s) => s.stage.kind === 'published').map((s) => s.capture.wall_uuid)).size;
  return (
    <View style={styles.page}>
      <View style={styles.count}>
        <Display style={styles.number}>{walls}</Display>
        <View style={styles.flex}>
          <AppText style={styles.bold}>{walls === 1 ? 'wall in 3D from your scans' : 'walls in 3D from your scans'}</AppText>
          <AppText type="small" color="textSecondary">
            {sent.length === 1 ? '1 scan sent' : `${sent.length} scans sent`}
          </AppText>
        </View>
      </View>
      {scans.error ? <AppText color="danger">{scans.error.message}</AppText> : null}
      {uploading.map((scan) => (
        <UploadingCard key={scan.id} scan={scan} />
      ))}
      {sent.map((scan) => (
        <SentCard key={scan.capture.id} scan={scan} />
      ))}
    </View>
  );
}

/** A scan still going up from this phone. */
function UploadingCard({ scan }: { scan: Scan }) {
  const progress = useUploadProgress(scan.id);
  return (
    <Card wallUuid={scan.wallUuid} chip={<Chip band={1} icon="cloud-upload-outline" label="Uploading" />}>
      <AppText type="small" color={progress?.state === 'failed' ? 'danger' : 'textSecondary'}>
        {uploadText(progress)}
      </AppText>
    </Card>
  );
}

/** A scan the team has, and where it has got to. */
function SentCard({ scan }: { scan: MyScan }) {
  const { capture, stage } = scan;
  const wall = capture.wall_uuid;
  const photos = capture.photo_count === 1 ? '1 photo' : `${capture.photo_count} photos`;
  const when = <AppText type="small" color="textSecondary">{`Scanned ${dayLabel(toDay(new Date(capture.created_at)))} · ${photos}`}</AppText>;

  if (stage.kind === 'published') {
    return (
      <Card
        wallUuid={wall}
        chip={<Chip band={0} icon="checkmark" label="Published" />}
        end={(name) => <PillButton icon="cube-outline" label="3D" hint={`Open ${name} in 3D`} onPress={() => router.push(`/walls/${wall}` as Href)} />}>
        {when}
      </Card>
    );
  }
  if (stage.kind === 'not-used') {
    return (
      <Card wallUuid={wall} chip={<Chip band={3} icon="close" label="Not used" />}>
        {when}
        <Why reason={stage.reason?.trim() || NO_REASON} />
        <View style={styles.buttons}>
          <View style={styles.flex}>
            <ActionButton label="Photo tips" onPress={() => router.push('/photo-tips')} />
          </View>
          <View style={styles.flex}>
            <ActionButton icon="camera-outline" label="Scan again" onPress={() => router.push(scanHref(wall))} primary />
          </View>
        </View>
      </Card>
    );
  }
  const icon = stage.step === 2 ? 'eye-outline' : stage.label === 'Being made' ? 'sync' : 'hourglass-outline';
  return (
    <Card wallUuid={wall} chip={<Chip band={1} icon={icon} label={stage.label} />}>
      {when}
      <Steps at={stage.step} />
    </Card>
  );
}

/** The frame every scan shares: the wall's name, a chip for where it is, then whatever that stage needs. */
function Card({
  wallUuid,
  chip,
  end,
  children,
}: {
  wallUuid: string;
  chip: ReactNode;
  /** Something after the chip, given the wall's name for its label. */
  end?: (name: string) => ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const area = useArea(wallUuid);
  const name = area.data?.name ?? 'Wall';
  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.cardTop}>
        <AppText numberOfLines={1} style={[styles.wallName, { fontFamily: SerifFont }]}>
          {name}
        </AppText>
        {chip}
        {end?.(name)}
      </View>
      {children}
    </View>
  );
}

function Why({ reason }: { reason: string }) {
  const tint = useTint(3);
  const dark = useColorScheme() === 'dark';
  return (
    <View style={[styles.why, { backgroundColor: dark ? WHY_DARK : tint.bg }]}>
      <AppText style={[styles.whyLabel, { color: tint.text }]}>Why</AppText>
      <AppText type="small" style={{ color: tint.text }}>
        {reason}
      </AppText>
    </View>
  );
}

/** The four steps as dots on a line, filled up to the one the scan is at. */
function Steps({ at }: { at: number }) {
  const theme = useTheme();
  const blue = Difficulty[1].bar;
  return (
    <View accessible accessibilityLabel={`Step ${at + 1} of ${SCAN_STEPS.length}: ${SCAN_STEPS[at]}`} style={styles.steps}>
      <View style={styles.track}>
        {SCAN_STEPS.map((step, i) => (
          <View key={step} style={i ? styles.segment : null}>
            {i ? <View style={[styles.link, { backgroundColor: i <= at ? blue : theme.border }]} /> : null}
            <View
              style={[
                styles.stepDot,
                i < at
                  ? { backgroundColor: blue, borderColor: blue }
                  : i === at
                    ? { backgroundColor: theme.background, borderColor: blue }
                    : { backgroundColor: theme.border, borderColor: theme.border },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.stepNames}>
        {SCAN_STEPS.map((step, i) => (
          <AppText key={step} style={[styles.stepName, { color: i === at ? theme.text : theme.textSecondary }, i === at && styles.bold]}>
            {step}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const DOT = 12;

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '700' },
  page: { paddingHorizontal: GUTTER, paddingTop: Spacing.three - Spacing.half, gap: Spacing.two + Spacing.half },
  count: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - Spacing.one, marginBottom: Spacing.one },
  number: { fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  card: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: 16, paddingHorizontal: Spacing.three - Spacing.half, paddingVertical: Spacing.three - Spacing.one, gap: Spacing.one },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half },
  wallName: { flex: 1, minWidth: 0, fontSize: 19, lineHeight: 24 },
  why: { borderRadius: 12, paddingHorizontal: Spacing.three - Spacing.one, paddingVertical: Spacing.two + Spacing.half, marginTop: Spacing.two, gap: Spacing.half },
  whyLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  buttons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  steps: { marginTop: Spacing.two + Spacing.half, gap: Spacing.one },
  track: { flexDirection: 'row', alignItems: 'center' },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  link: { flex: 1, height: 3 },
  stepDot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 3 },
  stepNames: { flexDirection: 'row', justifyContent: 'space-between' },
  stepName: { fontSize: 12, lineHeight: 16 },
});
