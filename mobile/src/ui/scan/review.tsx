import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { type ComponentProps, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Spacing, TapTarget } from '@/constants/theme';
import type { Scan, ScanPhoto } from '@/core/capture';
import { minimumPhotos } from '@/core/scan-plan';
import { photoUri } from '@/data/scans';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';

type IconName = ComponentProps<typeof Ionicons>['name'];

const GAP = Spacing.one;
/** Tiles are at least this wide, with three columns at the least. */
const MIN_TILE = 110;
const ON_DARK = Colors.dark;

/**
 * Review (#52), where both lanes end: the scan's photos in a grid, each opening
 * full screen to look at or delete, a button for more photos from the same
 * place, and Upload once there are enough for the wall's size: 7, 10 or 16,
 * or 10 for an upload, which doesn't ask the size.
 */
export function ScanReview({
  scan,
  note,
  more,
  onDelete,
  onUpload,
}: {
  scan: Scan;
  /** A line under the count: photos left out, an error, or what Upload does for now. */
  note: string | null;
  more: { label: string; icon: IconName; onPress: () => void; busy?: boolean };
  onDelete: (photo: ScanPhoto) => void;
  onUpload: () => void;
}) {
  const theme = useTheme();
  const safe = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [viewing, setViewing] = useState<number | null>(null);

  const count = scan.photos.length;
  const minimum = minimumPhotos(scan.plan?.wallSize);
  const needed = minimum - count;
  const inner = Math.min(window.width, MaxContentWidth) - Spacing.three * 2;
  const columns = Math.max(3, Math.floor((inner + GAP) / (MIN_TILE + GAP)));
  const tile = (inner - GAP * (columns - 1)) / columns;

  return (
    <View style={styles.page}>
      <FlatList
        // A new column count needs a new list.
        key={columns}
        data={scan.photos}
        numColumns={columns}
        keyExtractor={(photo) => photo.file}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View style={styles.summary}>
            <AppText type="heading">
              {count} {count === 1 ? 'photo' : 'photos'}
              {scan.plan ? (
                <AppText color="textSecondary"> · aim for about {scan.plan.target}</AppText>
              ) : null}
            </AppText>
            {note ? <AppText color="textSecondary">{note}</AppText> : null}
          </View>
        }
        ListEmptyComponent={<AppText color="textSecondary">No photos left in this scan.</AppText>}
        renderItem={({ item, index }) => (
          <Tile uri={photoUri(scan, item)} size={tile} label={`Photo ${index + 1}`} onPress={() => setViewing(index)} />
        )}
      />
      <View
        style={[
          styles.footer,
          { paddingBottom: safe.bottom + Spacing.three, borderTopColor: theme.border, backgroundColor: theme.background },
        ]}>
        <AppText type="small" color="textSecondary" style={styles.center}>
          {needed > 0
            ? `Upload needs at least ${minimum} photos, so ${needed} more to go.`
            : 'Ready to upload.'}
        </AppText>
        <View style={styles.buttons}>
          <View style={styles.flex}>
            <ActionButton label={more.label} icon={more.icon} onPress={more.onPress} disabled={more.busy} />
          </View>
          <View style={styles.flex}>
            <ActionButton
              label="Upload"
              icon="cloud-upload-outline"
              primary
              disabled={needed > 0}
              onPress={onUpload}
            />
          </View>
        </View>
      </View>
      {viewing !== null && count > 0 ? (
        <PhotoViewer
          scan={scan}
          start={Math.min(viewing, count - 1)}
          onClose={() => setViewing(null)}
          onDelete={(photo) => {
            if (count === 1) setViewing(null);
            onDelete(photo);
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * One photo in the grid. The icon underneath shows through for a photo the
 * browser can't open, like a HEIC in Chrome.
 */
function Tile({ uri, size, label, onPress }: { uri: string; size: number; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { width: size, height: size, backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <Ionicons name="image-outline" size={24} color={theme.textSecondary} />
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={uri} />
    </Pressable>
  );
}

/** The photos full screen, one at a time: swipe or use the arrows, and delete. */
function PhotoViewer({
  scan,
  start,
  onClose,
  onDelete,
}: {
  scan: Scan;
  start: number;
  onClose: () => void;
  onDelete: (photo: ScanPhoto) => void;
}) {
  const safe = useSafeAreaInsets();
  const window = useWindowDimensions();
  const list = useRef<FlatList<ScanPhoto>>(null);
  const [height, setHeight] = useState(0);
  const [shown, setShown] = useState(start);
  const width = window.width;
  const count = scan.photos.length;
  // Deleting the last photo leaves the list scrolled past the end until it catches up.
  const index = Math.min(shown, count - 1);
  const photo = scan.photos[index];

  function show(i: number) {
    list.current?.scrollToOffset({ offset: i * width, animated: true });
    setShown(i);
  }

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.viewer, { paddingTop: safe.top, paddingBottom: safe.bottom }]}>
        <StatusBar style="light" />
        <View style={styles.viewerBar}>
          <Pressable
            role="button"
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.viewerButton, pressed && styles.pressed]}>
            <AppText style={styles.onDark}>Close</AppText>
          </Pressable>
          <Pressable
            role="button"
            aria-label="Delete this photo"
            onPress={() => confirmDelete(() => onDelete(photo))}
            hitSlop={12}
            style={({ pressed }) => [styles.viewerButton, styles.end, pressed && styles.pressed]}>
            <Ionicons name="trash-outline" size={24} color={ON_DARK.danger} />
          </Pressable>
        </View>
        <View style={styles.flex} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
          {height > 0 ? (
            <FlatList
              ref={list}
              data={scan.photos}
              keyExtractor={(p) => p.file}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={start}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              scrollEventThrottle={16}
              onScroll={(e) => setShown(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => (
                <View style={[styles.slide, { width, height }]}>
                  <Ionicons name="image-outline" size={48} color={ON_DARK.textSecondary} />
                  <Image source={{ uri: photoUri(scan, item) }} style={StyleSheet.absoluteFill} contentFit="contain" />
                </View>
              )}
            />
          ) : null}
        </View>
        <View style={styles.viewerBar}>
          <Pressable
            role="button"
            aria-label="Previous photo"
            onPress={() => show(index - 1)}
            disabled={index === 0}
            style={({ pressed }) => [styles.viewerButton, index === 0 && styles.disabled, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={28} color={ON_DARK.text} />
          </Pressable>
          <AppText style={[styles.onDark, styles.flex, styles.center]}>
            {index + 1} of {count}
          </AppText>
          <Pressable
            role="button"
            aria-label="Next photo"
            onPress={() => show(index + 1)}
            disabled={index === count - 1}
            style={({ pressed }) => [
              styles.viewerButton,
              styles.end,
              index === count - 1 && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <Ionicons name="chevron-forward" size={28} color={ON_DARK.text} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Asks before deleting, since a deleted photo is gone from the phone. */
function confirmDelete(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm('Delete this photo?')) onConfirm();
    return;
  }
  Alert.alert('Delete this photo?', undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: GAP },
  row: { gap: GAP },
  summary: { gap: Spacing.one, marginBottom: Spacing.two },
  tile: { borderRadius: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  footer: { gap: Spacing.two, paddingTop: Spacing.two, paddingHorizontal: Spacing.three, borderTopWidth: 1 },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerBar: { minHeight: TapTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewerButton: { minWidth: TapTarget, minHeight: TapTarget, justifyContent: 'center', paddingHorizontal: Spacing.three },
  end: { alignItems: 'flex-end' },
  slide: { alignItems: 'center', justifyContent: 'center' },
  onDark: { color: ON_DARK.text, fontWeight: '700' },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.7 },
});
