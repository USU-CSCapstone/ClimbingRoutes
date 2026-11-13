import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, SerifFont, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/text';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * The app's first screen, at / on the phone and the web: what the app is, a search
 * box that opens Search with what was typed, the ways into the guide, and how a
 * wall gets its 3D model.
 */
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <AppText style={[styles.appName, { fontFamily: SerifFont }]}>Climbing Routes</AppText>
          <AppText color="textSecondary">
            A guide to outdoor climbing in the USA, with route information from OpenBeta. Walls that have been scanned
            open in 3D, with their routes drawn on the rock.
          </AppText>
        </View>
        <SearchBox />
        <View style={styles.tiles}>
          <Tile icon="compass" title="Explore" detail="Browse from a state down to a wall" href="/(tabs)/(explore)/explore" />
          <Tile icon="map" title="Map" detail="Find crags and walls on a map" href="/(tabs)/(map)/map" />
        </View>
        <ScanSection />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Opens the Search tab with what was typed, which runs the search there. */
function SearchBox() {
  const theme = useTheme();
  const [text, setText] = useState('');
  const query = text.trim();

  function search() {
    router.navigate(
      (query ? { pathname: '/(tabs)/(search)/search', params: { q: query } } : '/(tabs)/(search)/search') as Href,
    );
    setText('');
  }

  return (
    <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="search" size={22} color={theme.textSecondary} />
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={search}
        placeholder="Search routes and areas"
        placeholderTextColor={theme.textSecondary}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search routes and areas"
        style={[styles.searchInput, { color: theme.text }]}
      />
      {query ? (
        <Pressable role="button" onPress={search} hitSlop={12} accessibilityLabel="Search">
          <Ionicons name="arrow-forward-circle" size={30} color={theme.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** A large button into one of the guide's tabs. */
function Tile({ icon, title, detail, href }: { icon: IconName; title: string; detail: string; href: Href }) {
  const theme = useTheme();
  return (
    <Pressable
      role="link"
      onPress={() => router.navigate(href)}
      style={({ pressed }) => [styles.tile, { borderColor: theme.border }, pressed && styles.pressed]}>
      <View style={[styles.tileIcon, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name={icon} size={26} color={theme.text} />
      </View>
      <AppText type="heading">{title}</AppText>
      <AppText type="small" color="textSecondary">
        {detail}
      </AppText>
    </Pressable>
  );
}

/** How a wall gets its 3D model. Scans start from the wall's own page, so this points there. */
function ScanSection() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardHeading}>
        <Ionicons name="scan-outline" size={22} color={theme.text} />
        <AppText type="heading">Scan a wall</AppText>
      </View>
      <AppText color="textSecondary">A wall without a 3D model yet can be scanned with a phone.</AppText>
      <Step n={1}>Find the wall in Explore or on the Map.</Step>
      <Step n={2}>Tap Scan this wall, then take photos with the app or upload ones you already took.</Step>
      <Step n={3}>The team makes the photos into a 3D model and draws the routes on it.</Step>
      {/* The photo tips page is #72; until then this row shows where it will go. */}
      <View style={[styles.tipsRow, { borderTopColor: theme.border }, styles.disabled]}>
        <Ionicons name="bulb-outline" size={22} color={theme.text} />
        <View style={styles.flex}>
          <AppText style={styles.bold}>Photo tips</AppText>
          <AppText type="small" color="textSecondary">
            How to take photos for the best model. Coming soon.
          </AppText>
        </View>
      </View>
    </View>
  );
}

function Step({ n, children }: { n: number; children: string }) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNumber, { backgroundColor: theme.text }]}>
        <AppText type="small" style={[styles.bold, { color: theme.background }]}>
          {n}
        </AppText>
      </View>
      <AppText style={styles.flex}>{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  intro: { gap: Spacing.two, marginTop: Spacing.two },
  appName: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  searchBox: {
    minHeight: TapTarget,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, fontSize: 18, paddingVertical: Spacing.two },
  tiles: { flexDirection: 'row', gap: Spacing.three },
  tile: { flex: 1, gap: Spacing.one, padding: Spacing.three, borderRadius: 12, borderWidth: 2 },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: 12, marginTop: Spacing.two },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  stepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: TapTarget,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bold: { fontWeight: '700' },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.5 },
});
