import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { SerifFont, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/text';
import { RoundButton } from '@/ui/wall/parts';

/** From this width a panel sits at the side of the screen instead of along the bottom. */
export const WIDE = 900;
export const PANEL_WIDTH = 360;

/** The card a wall's or an area's panel sits in, with a footer pinned below its list. The caller places it. */
export function SidePanel({
  footer,
  style,
  children,
}: {
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: theme.background }, style]}>
      {children}
      {footer ? <View style={[styles.footer, { borderTopColor: theme.border }]}>{footer}</View> : null}
    </View>
  );
}

/** The top of a panel's list: the back button and place, the title, then whatever the panel adds. */
export function PanelHeader({
  place,
  title,
  onBack,
  backLabel = 'Back',
  children,
}: {
  place: string | null;
  title: string;
  onBack: () => void;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <RoundButton icon="chevron-back" label={backLabel} onPress={onBack} size={34} />
        <AppText type="small" color="textSecondary" numberOfLines={1} style={styles.flex}>
          {place ?? ''}
        </AppText>
      </View>
      <AppText style={[styles.title, { fontFamily: SerifFont }]}>{title}</AppText>
      {children}
    </View>
  );
}

/** The label just above a panel's list. */
export function PanelLabel({ children }: { children: string }) {
  return (
    <AppText type="label" color="textSecondary" style={styles.label}>
      {children}
    </AppText>
  );
}

export const panelListStyle = { paddingBottom: Spacing.four };

const styles = StyleSheet.create({
  panel: { borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)' },
  flex: { flex: 1 },
  header: { padding: Spacing.three, gap: Spacing.three },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 32, lineHeight: 38, marginTop: -Spacing.two },
  label: { marginTop: Spacing.one },
  footer: { padding: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
});
