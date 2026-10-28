import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Album, Asset, usePermissions as useLibraryPermissions } from 'expo-media-library';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, TapTarget } from '@/constants/theme';
import { Loading } from '@/ui/components';
import { AppText } from '@/ui/text';

/** Album in the phone's photo library that the photos are saved to, ready to transfer. */
const ALBUM = 'ClimbingRoutes camera test';
/** Best JPEG quality, so the test compares the cameras rather than the compression. */
const QUALITY = 1;
/** Room below the preview for the readout and the shutter. */
const CONTROLS_HEIGHT = 200;
const SHUTTER = 76;
const ON_DARK = Colors.dark;

interface Shot {
  n: number;
  width: number;
  height: number;
  lens: string;
}

/**
 * Throwaway test screen for issue #48: takes photos with Expo's camera the way
 * the guided camera (#51) would, and saves them to the photo library, so they can
 * go through RealityScan next to the same rock shot with the phone's own camera.
 * Remove it, its web stand-in and its link on the Explore page once #48 has its
 * answer. Development only, on a phone.
 */
export default function CameraTestScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <CameraTest />;
}

function CameraTest() {
  const safe = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [libraryPermission, requestLibrary] = useLibraryPermissions({ granularPermissions: ['photo'] });
  const camera = useRef<CameraView>(null);
  const album = useRef<Album | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!cameraPermission || !libraryPermission) return <Loading />;
  if (!cameraPermission.granted || !libraryPermission.granted) {
    const blocked =
      (!cameraPermission.granted && !cameraPermission.canAskAgain) ||
      (!libraryPermission.granted && !libraryPermission.canAskAgain);
    return (
      <View style={[styles.page, styles.center, { paddingTop: safe.top, paddingBottom: safe.bottom }]}>
        <StatusBar style="light" />
        <AppText type="heading" style={styles.text}>
          Camera and photos
        </AppText>
        <AppText style={[styles.text, styles.muted]}>
          {blocked
            ? 'Access was turned off. Allow the camera and photos for Expo Go in Settings, then come back.'
            : 'The test takes photos and saves them to an album in your photo library.'}
        </AppText>
        {blocked ? null : (
          <Pressable
            role="button"
            style={({ pressed }) => [styles.allow, pressed && styles.pressed]}
            onPress={async () => {
              if (!cameraPermission.granted) await requestCamera();
              if (!libraryPermission.granted) await requestLibrary();
            }}>
            <AppText style={styles.allowText}>Allow</AppText>
          </Pressable>
        )}
        <BackButton />
      </View>
    );
  }

  /** Saves into the test album, creating it with the first photo. */
  async function save(uri: string) {
    if (!album.current) album.current = await Album.get(ALBUM);
    if (album.current) await Asset.create(uri, album.current);
    else album.current = await Album.create(ALBUM, [uri]);
  }

  async function shoot() {
    if (!camera.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      // exif: true is what writes the EXIF (focal length, lens, camera model) into
      // the file. Without it expo-camera saves a bare JPEG.
      const photo = await camera.current.takePictureAsync({ quality: QUALITY, exif: true });
      await save(photo.uri);
      setShots((s) => [{ n: s.length + 1, width: photo.width, height: photo.height, lens: lensText(photo.exif) }, ...s]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // iOS crops each photo to the preview's shape, so the preview is 3:4 like the
  // sensor and the photo keeps its whole frame.
  const previewHeight = Math.min((window.width * 4) / 3, window.height - safe.top - safe.bottom - CONTROLS_HEIGHT);
  const last = shots[0];

  return (
    <View style={[styles.page, { paddingTop: safe.top }]}>
      <StatusBar style="light" />
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
      </View>
      <View style={[styles.controls, { paddingBottom: safe.bottom + Spacing.two }]}>
        <View style={styles.row}>
          <BackButton />
          <AppText style={styles.text}>
            {shots.length} {shots.length === 1 ? 'photo' : 'photos'} saved
          </AppText>
        </View>
        <AppText type="small" numberOfLines={2} style={[styles.text, error ? styles.error : styles.muted]}>
          {error
            ? `Couldn't take or save the photo: ${error}`
            : last
              ? `#${last.n}: ${last.width}×${last.height} · ${last.lens}`
              : `Saves to the "${ALBUM}" album. Back 1x lens, flash and zoom off, JPEG quality ${QUALITY}.`}
        </AppText>
        <Pressable
          role="button"
          aria-label="Take a photo"
          disabled={!ready || busy}
          onPress={shoot}
          style={({ pressed }) => [styles.shutter, (!ready || busy) && styles.disabled, pressed && styles.pressed]}>
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    </View>
  );
}

function BackButton() {
  return (
    <Pressable
      role="button"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
      <Ionicons name="chevron-back" size={22} color={ON_DARK.text} />
      <AppText style={styles.text}>Back</AppText>
    </Pressable>
  );
}

/** The lens EXIF the camera reported, like "6.86 mm · 26 mm equiv · iPhone 14 back camera". */
function lensText(exif: Record<string, unknown> | undefined): string {
  if (!exif) return 'no EXIF returned';
  const mm = (v: unknown) => (typeof v === 'number' ? `${Number(v.toFixed(2))} mm` : `${String(v)} mm`);
  const focal = exif.FocalLength;
  const equiv = exif.FocalLenIn35mmFilm ?? exif.FocalLengthIn35mmFilm;
  const parts = [
    focal != null ? mm(focal) : null,
    equiv != null ? `${mm(equiv)} equiv` : null,
    typeof exif.LensModel === 'string' ? exif.LensModel : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'no lens EXIF';
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  preview: { alignSelf: 'center', overflow: 'hidden', backgroundColor: ON_DARK.backgroundElement },
  controls: {
    flex: 1,
    minHeight: CONTROLS_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  row: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { color: ON_DARK.text, textAlign: 'center' },
  muted: { color: ON_DARK.textSecondary },
  error: { color: ON_DARK.danger },
  back: { minHeight: TapTarget, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingRight: Spacing.two },
  allow: {
    minHeight: TapTarget,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    borderRadius: TapTarget / 2,
    backgroundColor: ON_DARK.text,
  },
  allowText: { color: '#000', fontWeight: '700' },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 4,
    borderColor: ON_DARK.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: SHUTTER - 16, height: SHUTTER - 16, borderRadius: (SHUTTER - 16) / 2, backgroundColor: ON_DARK.text },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
