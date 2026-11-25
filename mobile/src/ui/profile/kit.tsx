// Small pieces the Profile tab's parts share.
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Difficulty, Spacing, TapTarget } from '@/constants/theme';
import type { DifficultyBand } from '@/core/grades';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/text';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** From this width the page is a centered column under a band, as Home changes at. */
export const WIDE = 700;
/** The page's side margin. */
export const GUTTER = Spacing.three + Spacing.half;

/** A soft background and a readable text color in one of the four difficulty colors, for this theme. */
export function useTint(band: DifficultyBand): { bg: string; text: string } {
  const dark = useColorScheme() === 'dark';
  return Difficulty[band][dark ? 'dark' : 'light'];
}

/** The value, once it has stopped changing for `ms`. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/** A small rounded label, like "Published" or "Not used", in a difficulty color. */
export function Chip({ band, icon, label }: { band: DifficultyBand; icon?: IconName; label: string }) {
  const tint = useTint(band);
  return (
    <View style={[styles.chip, { backgroundColor: tint.bg }]}>
      {icon ? <Ionicons name={icon} size={14} color={tint.text} /> : null}
      <AppText style={[styles.chipText, { color: tint.text }]}>{label}</AppText>
    </View>
  );
}

/** A compact rounded button that opens something, like "3D". */
export function PillButton({ icon, label, hint, onPress }: { icon?: IconName; label: string; hint: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      role="link"
      accessibilityLabel={hint}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.pill, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={18} color={theme.accent} /> : null}
      <AppText style={[styles.pillText, { color: theme.accent }]}>{label}</AppText>
    </Pressable>
  );
}

/** A spinner with room around it, for a list that's still loading. */
export function Busy() {
  const theme = useTheme();
  return (
    <View style={styles.busy}>
      <ActivityIndicator size="large" color={theme.text} />
    </View>
  );
}

/** What a tab shows before there's anything in it, or when it couldn't load. */
export function Empty({ icon, title, detail, children }: { icon: IconName; title: string; detail: string; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name={icon} size={26} color={theme.textSecondary} />
      </View>
      <AppText type="heading" style={styles.center}>
        {title}
      </AppText>
      <AppText color="textSecondary" style={styles.center}>
        {detail}
      </AppText>
      {children ? <View style={styles.emptyAction}>{children}</View> : null}
    </View>
  );
}

/** A text box with an icon in front and, optionally, something at its end. A password box gets a show/hide eye. */
export function Field({
  icon,
  end,
  secret,
  focusedDefault,
  ...input
}: TextInputProps & { icon: IconName; end?: ReactNode; secret?: boolean; focusedDefault?: boolean }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(Boolean(focusedDefault));
  const [shown, setShown] = useState(false);
  return (
    <View
      style={[
        styles.field,
        { backgroundColor: focused ? theme.background : theme.backgroundElement, borderColor: focused ? theme.accent : 'transparent' },
      ]}>
      <Ionicons name={icon} size={20} color={theme.textSecondary} />
      <TextInput
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        {...input}
        secureTextEntry={secret ? !shown : undefined}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[styles.input, { color: theme.text }]}
      />
      {secret ? (
        <Pressable
          role="button"
          accessibilityLabel={shown ? 'Hide password' : 'Show password'}
          onPress={() => setShown((s) => !s)}
          hitSlop={10}>
          <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.textSecondary} />
        </Pressable>
      ) : (
        end
      )}
    </View>
  );
}

/** The line under a text box: a rule, a problem, or good news. */
export function Help({ tone = 'plain', children }: { tone?: 'plain' | 'good' | 'bad'; children: string }) {
  const theme = useTheme();
  const good = useTint(0);
  const color = tone === 'good' ? good.text : tone === 'bad' ? theme.danger : theme.textSecondary;
  return <AppText style={[styles.help, { color }, tone === 'good' && styles.bold]}>{children}</AppText>;
}

const styles = StyleSheet.create({
  chip: { height: 24, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two + 1, borderRadius: 12 },
  chipText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  pill: { height: 36, flexDirection: 'row', alignItems: 'center', gap: Spacing.one + Spacing.half, paddingHorizontal: Spacing.three - Spacing.one, borderRadius: 18 },
  pillText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  busy: { paddingVertical: Spacing.five + Spacing.four, alignItems: 'center' },
  empty: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingTop: Spacing.five, paddingBottom: Spacing.four },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  emptyAction: { alignSelf: 'stretch', marginTop: Spacing.two },
  center: { textAlign: 'center' },
  field: {
    minHeight: TapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    borderWidth: 2,
  },
  // No browser focus ring on the web: the box's own border shows the focus. ('none' isn't in React Native's types.)
  input: { flex: 1, minWidth: 0, fontSize: 18, paddingVertical: Spacing.two, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  help: { fontSize: 13, lineHeight: 17, paddingHorizontal: Spacing.one, marginTop: -Spacing.one },
  bold: { fontWeight: '600' },
});
