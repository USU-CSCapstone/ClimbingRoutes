import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Home's search box. It opens the Search tab with what was typed, which runs the
 * search there. `raised` is for a wide screen, where it lies over the edge between
 * the dark band and the page and needs an outline and a shadow to sit on both.
 */
export function SearchBox({ raised }: { raised?: boolean }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const [text, setText] = useState('');
  const query = text.trim();

  function search() {
    router.navigate(
      (query ? { pathname: '/(tabs)/(search)/search', params: { q: query } } : '/(tabs)/(search)/search') as Href,
    );
    setText('');
  }

  return (
    <View
      style={[
        styles.box,
        { backgroundColor: theme.backgroundElement },
        raised && [styles.raised, { borderColor: theme.border }, !dark && { backgroundColor: theme.background }],
      ]}>
      <Ionicons name="search" size={21} color={theme.textSecondary} />
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
        style={[styles.input, { color: theme.text }]}
      />
      {query ? (
        <Pressable role="button" onPress={search} hitSlop={12} accessibilityLabel="Search">
          <Ionicons name="arrow-forward-circle" size={30} color={theme.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const HEIGHT = 54;
/** Twice SEAM_OVERLAP in hero.tsx, so half of it lies over the band. */
const RAISED_HEIGHT = 56;

const styles = StyleSheet.create({
  box: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
    paddingLeft: Spacing.three + Spacing.half,
    paddingRight: Spacing.three - Spacing.one,
  },
  raised: { height: RAISED_HEIGHT, borderRadius: RAISED_HEIGHT / 2, borderWidth: 1, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)' },
  input: { flex: 1, fontSize: 17, height: HEIGHT },
});
