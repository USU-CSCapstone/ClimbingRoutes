import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/text';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** A screen of the scan flow for a wall: /scan/<wall>, or /scan/<wall>/<step>, with any search params. */
export function scanHref(
  wall: string,
  step?: 'guide' | 'prepare' | 'camera' | 'upload',
  params?: Record<string, string>,
): Href {
  const pathname = step ? `/scan/${wall}/${step}` : `/scan/${wall}`;
  return (params ? { pathname, params } : pathname) as Href;
}

/**
 * Leaves the scan flow from any of its screens: back to the flow's first screen,
 * then dismissing it, which closes the full-screen stack. The router runs the two
 * in order.
 */
export function closeScan() {
  router.dismissAll();
  router.dismiss();
}

/** A full-width button. The primary one is filled with the accent color. */
export function ActionButton({
  label,
  icon,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const color = primary ? theme.accentText : theme.text;
  return (
    <Pressable
      role="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: theme.accent } : { borderColor: theme.border, borderWidth: 1 },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {icon ? <Ionicons name={icon} size={20} color={color} /> : null}
      <AppText style={[styles.buttonText, { color }]}>{label}</AppText>
    </Pressable>
  );
}

/** One answer to a question, shown as a row that stays highlighted once picked. */
export function Choice({
  label,
  detail,
  icon,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { borderColor: selected ? theme.accent : theme.border },
        selected && { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      {icon ? <Ionicons name={icon} size={24} color={selected ? theme.accent : theme.text} /> : null}
      <View style={styles.choiceText}>
        <AppText style={styles.choiceLabel}>{label}</AppText>
        {detail ? (
          <AppText type="small" color="textSecondary">
            {detail}
          </AppText>
        ) : null}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? theme.accent : theme.border}
      />
    </Pressable>
  );
}

/** A question heading with its answers below. */
export function Question({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.question}>
      <AppText type="heading">{title}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
  },
  buttonText: { fontWeight: '700' },
  choice: {
    minHeight: TapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 2,
  },
  choiceText: { flex: 1, gap: Spacing.half },
  choiceLabel: { fontWeight: '700' },
  question: { gap: Spacing.two },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
