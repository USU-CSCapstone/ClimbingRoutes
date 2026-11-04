import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, TapTarget } from '@/constants/theme';
import { angleFromGravity, type PhotoAngle, type PhotoLocation, type Scan, type ScanPlan } from '@/core/capture';
import type { Uuid } from '@/core/types';
import { createScan, photoUri, savePhoto } from '@/data/scans';
import { AppText } from '@/ui/text';

/** JPEG quality. 1 made 6 MB photos in the camera test (#48), and 0.9 is much smaller to upload. */
const QUALITY = 0.9;
/** How many of the latest photos show beside the shutter. */
const THUMBNAILS = 3;
const THUMBNAIL = 40;
const SHUTTER = 76;
/** Room below the preview for the thumbnails and the shutter. */
const CONTROLS_HEIGHT = SHUTTER + Spacing.four * 2;
const ON_DARK = Colors.dark;

type Direction = 'right' | 'left';

/**
 * The guided camera (#51): the back 1x lens, flash and zoom off, counting
 * towards the scan's photo target and saying which way to step. Each photo is
 * saved straight into the scan, with the time, location and the phone's angle,
 * and the phone buzzes once it's safe. The scan itself is made with the first
 * photo, so leaving before then leaves nothing behind.
 */
export function GuidedCamera({ wallUuid, plan, onClose }: { wallUuid: Uuid; plan: ScanPlan; onClose: () => void }) {
  const [camera, requestCamera] = useCameraPermissions();
  const [location, requestLocation] = Location.useForegroundPermissions();
  if (!camera || !location) return <View style={styles.page} />;

  // Location is asked for once, alongside the camera, and the camera opens
  // whatever the answer.
  const locationAsked = location.status !== Location.PermissionStatus.UNDETERMINED;
  if (!camera.granted || !locationAsked) {
    return (
      <Access
        cameraBlocked={!camera.granted && !camera.canAskAgain}
        onAllow={async () => {
          if (!camera.granted) await requestCamera();
          if (!locationAsked) await requestLocation();
        }}
        onClose={onClose}
      />
    );
  }
  return <Camera wallUuid={wallUuid} plan={plan} withLocation={location.granted} onClose={onClose} />;
}

function Camera({
  wallUuid,
  plan,
  withLocation,
  onClose,
}: {
  wallUuid: Uuid;
  plan: ScanPlan;
  withLocation: boolean;
  onClose: () => void;
}) {
  const safe = useSafeAreaInsets();
  const window = useWindowDimensions();
  const camera = useRef<CameraView>(null);
  // The latest readings, kept out of state so they don't re-render the screen.
  const position = useRef<PhotoLocation | null>(null);
  const angle = useRef<PhotoAngle | null>(null);
  // What the next save builds on. A ref, so a second tap before the screen
  // re-renders can't start a second scan.
  const saved = useRef<Scan | null>(null);
  const shooting = useRef(false);
  const [scan, setScan] = useState<Scan | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [direction, setDirection] = useState<Direction>('right');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!withLocation) return;
    let stopped = false;
    let subscription: Location.LocationSubscription | null = null;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 1 }, ({ coords }) => {
      position.current = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude,
        accuracy: coords.accuracy,
      };
    })
      .then((s) => {
        if (stopped) s.remove();
        else subscription = s;
      })
      .catch(() => {
        // Location turned off on the phone: photos are saved without it.
      });
    return () => {
      stopped = true;
      subscription?.remove();
    };
  }, [withLocation]);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(200);
    const subscription = DeviceMotion.addListener(({ accelerationIncludingGravity }) => {
      angle.current = accelerationIncludingGravity ? angleFromGravity(accelerationIncludingGravity) : null;
    });
    return () => subscription.remove();
  }, []);

  async function shoot() {
    if (!camera.current || shooting.current) return;
    shooting.current = true;
    setBusy(true);
    setError(null);
    const details = { takenAt: new Date().toISOString(), location: position.current, angle: angle.current };
    try {
      // exif: true is what writes the lens EXIF RealityScan needs into the JPEG.
      const photo = await camera.current.takePictureAsync({ quality: QUALITY, exif: true });
      saved.current ??= createScan(wallUuid, plan);
      saved.current = await savePhoto(saved.current, photo, details);
      setScan(saved.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      shooting.current = false;
      setBusy(false);
    }
  }

  const taken = scan?.photos.length ?? 0;
  const latest = scan ? scan.photos.slice(-THUMBNAILS).map((p) => ({ file: p.file, uri: photoUri(scan, p) })) : [];
  // iOS crops each photo to the preview's shape, so the preview is 3:4 like the
  // sensor and the photo keeps its whole frame (docs/camera-test.md).
  const previewHeight = Math.min(
    (window.width * 4) / 3,
    window.height - safe.top - safe.bottom - TapTarget - CONTROLS_HEIGHT,
  );

  return (
    <View style={[styles.page, { paddingTop: safe.top, paddingBottom: safe.bottom }]}>
      <StatusBar style="light" />
      <View style={styles.bar}>
        <Pressable
          role="button"
          onPress={onClose}
          hitSlop={12}
          style={({ pressed }) => [styles.barButton, pressed && styles.pressed]}>
          <AppText style={[styles.text, styles.bold]}>Close</AppText>
        </Pressable>
        <AppText style={[styles.text, styles.bold, styles.count]}>
          {taken === 0 ? `Aim for about ${plan.target} photos` : `Photo ${taken} of ~${plan.target}`}
        </AppText>
        <View style={styles.barButton} />
      </View>

      <View style={[styles.preview, { width: (previewHeight * 3) / 4, height: previewHeight }]}>
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          flash="off"
          zoom={0}
          ratio="4:3"
          onCameraReady={() => setReady(true)}
        />
        <View style={styles.prompt}>
          <View style={styles.pill}>
            <AppText style={[styles.text, error ? styles.error : styles.promptText]} numberOfLines={3}>
              {error ? `That photo wasn't saved: ${error}` : promptText(taken, direction)}
            </AppText>
          </View>
          <Pressable
            role="button"
            aria-label={`Walk the other way, ${direction === 'right' ? 'to the left' : 'to the right'}`}
            onPress={() => setDirection((d) => (d === 'right' ? 'left' : 'right'))}
            style={({ pressed }) => [styles.pill, styles.flip, pressed && styles.pressed]}>
            <Ionicons name="swap-horizontal" size={24} color={ON_DARK.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.controls}>
        {/* Newest last, beside the shutter. */}
        <View style={styles.thumbnails}>
          {latest.map((photo) => (
            <Image key={photo.file} source={{ uri: photo.uri }} style={styles.thumbnail} contentFit="cover" />
          ))}
        </View>
        <Pressable
          role="button"
          aria-label={`Take photo ${taken + 1}`}
          disabled={!ready || busy}
          onPress={shoot}
          style={({ pressed }) => [styles.shutter, (!ready || busy) && styles.disabled, pressed && styles.pressed]}>
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.flex} />
      </View>
    </View>
  );
}

/** Where to stand before the first photo, then which way to step. */
function promptText(taken: number, direction: Direction): string {
  if (taken === 0) return `Start a step past the ${direction === 'right' ? 'left' : 'right'} end of the wall`;
  return direction === 'right' ? 'Step right →' : '← Step left';
}

/** Asks for the camera, and for location to save with each photo. */
function Access({
  cameraBlocked,
  onAllow,
  onClose,
}: {
  cameraBlocked: boolean;
  onAllow: () => void;
  onClose: () => void;
}) {
  const safe = useSafeAreaInsets();
  return (
    <View style={[styles.page, styles.access, { paddingTop: safe.top, paddingBottom: safe.bottom }]}>
      <StatusBar style="light" />
      <Ionicons name="camera-outline" size={48} color={ON_DARK.text} />
      <AppText type="heading" style={styles.text}>
        {cameraBlocked ? 'Camera access is off' : 'Camera and location'}
      </AppText>
      <AppText style={[styles.text, styles.muted]}>
        {cameraBlocked
          ? 'Turn on camera access for this app in Settings, then come back.'
          : 'The camera takes the photos. Your location is saved with each one so the team can find the wall, but the camera works without it.'}
      </AppText>
      <Pressable
        role="button"
        onPress={cameraBlocked ? () => Linking.openSettings() : onAllow}
        style={({ pressed }) => [styles.allow, pressed && styles.pressed]}>
        <AppText style={styles.allowText}>{cameraBlocked ? 'Open Settings' : 'Continue'}</AppText>
      </Pressable>
      <Pressable role="button" onPress={onClose} style={({ pressed }) => [styles.barButton, pressed && styles.pressed]}>
        <AppText style={[styles.text, styles.bold]}>Not now</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000' },
  access: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four },
  bar: { height: TapTarget, flexDirection: 'row', alignItems: 'center' },
  barButton: { minWidth: 72, minHeight: TapTarget, justifyContent: 'center', paddingHorizontal: Spacing.three },
  count: { flex: 1 },
  text: { color: ON_DARK.text, textAlign: 'center' },
  bold: { fontWeight: '700' },
  muted: { color: ON_DARK.textSecondary },
  error: { color: ON_DARK.danger },
  preview: { alignSelf: 'center', overflow: 'hidden', backgroundColor: ON_DARK.backgroundElement },
  prompt: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  pill: {
    minHeight: TapTarget,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: TapTarget / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexShrink: 1,
  },
  promptText: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  flip: { width: TapTarget, paddingHorizontal: 0, alignItems: 'center' },
  controls: {
    flex: 1,
    minHeight: CONTROLS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  thumbnails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.one,
    paddingRight: Spacing.three,
  },
  flex: { flex: 1 },
  thumbnail: { width: THUMBNAIL, height: THUMBNAIL, borderRadius: 6, backgroundColor: ON_DARK.backgroundElement },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 4,
    borderColor: ON_DARK.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: SHUTTER - 16,
    height: SHUTTER - 16,
    borderRadius: (SHUTTER - 16) / 2,
    backgroundColor: ON_DARK.text,
  },
  allow: {
    minHeight: TapTarget,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    borderRadius: TapTarget / 2,
    backgroundColor: ON_DARK.text,
  },
  allowText: { color: '#000', fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
