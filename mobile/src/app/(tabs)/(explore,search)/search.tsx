import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, TapTarget } from '@/constants/theme';
import { MIN_QUERY_LENGTH } from '@/core/search';
import type { SearchResult } from '@/core/types';
import { useSearch } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { climbCount, disciplineText, GradeBadge, LinkRow, Loading, Message } from '@/ui/components';
import { useHrefs } from '@/ui/nav';
import { AppText } from '@/ui/text';

export default function SearchScreen() {
  const theme = useTheme();
  const hrefs = useHrefs();
  const [text, setText] = useState('');
  const query = useDebounced(text, 200);
  const { data, isFetching, error } = useSearch(query);

  const ready = query.trim().length >= MIN_QUERY_LENGTH;
  const areaSection = { title: 'Areas', data: (data?.areas ?? []) as SearchResult[] };
  const climbSection = { title: 'Routes', data: (data?.climbs ?? []) as SearchResult[] };
  const sections = !ready
    ? []
    : (data?.best === 'areas' ? [areaSection, climbSection] : [climbSection, areaSection]).filter(
        (s) => s.data.length > 0,
      );

  let body;
  if (!ready) {
    body = <Message title="Search routes and areas" detail="Type a name, like Hooked or Logan Canyon." />;
  } else if (error) {
    body = <Message title="Search failed" detail={error.message} />;
  } else if (!data) {
    body = <Loading />;
  } else if (sections.length === 0) {
    body = <Message title="No matches" detail={`Nothing in the USA matches “${query.trim()}”.`} />;
  } else {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.kind}:${item.uuid}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <AppText type="label" color="textSecondary" style={styles.sectionHeader}>
            {section.title}
          </AppText>
        )}
        renderItem={({ item }) =>
          item.kind === 'climb' ? (
            <LinkRow
              href={hrefs.climb(item.uuid)}
              title={item.name}
              subtitle={[disciplineText(item.disciplines), shortPath(item.path)].filter(Boolean).join(' · ')}
              trailing={<GradeBadge grade={item.grade} />}
            />
          ) : (
            <LinkRow
              href={hrefs.area(item.uuid)}
              title={item.name}
              subtitle={`${climbCount(item.totalClimbs)} · ${shortPath(item.path)}`}
            />
          )
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>{body}</View>
        {/* Search box sits at the bottom so it's reachable one-handed. */}
        <View style={[styles.inputBar, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <View style={[styles.inputWrap, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="search" size={22} color={theme.textSecondary} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Route or area name"
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="never"
              style={[styles.input, { color: theme.text }]}
            />
            {isFetching ? <AppText color="textSecondary">…</AppText> : null}
            {text ? (
              <Pressable onPress={() => setText('')} hitSlop={12} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={22} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Last few areas of the path, which are the ones that tell results apart. */
function shortPath(path: string[]): string {
  return path.slice(-3).join(' › ');
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingBottom: Spacing.three },
  sectionHeader: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.one },
  inputBar: { padding: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  inputWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    minHeight: TapTarget,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  input: { flex: 1, fontSize: 18, paddingVertical: Spacing.two },
});
