import { StyleSheet, Text, type TextProps } from 'react-native';

import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AppTextProps = TextProps & {
  type?: 'body' | 'title' | 'heading' | 'small' | 'label';
  color?: ThemeColor;
};

export function AppText({ style, type = 'body', color = 'text', ...rest }: AppTextProps) {
  const theme = useTheme();
  return <Text style={[{ color: theme[color] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  body: { fontSize: 17, lineHeight: 24 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  small: { fontSize: 15, lineHeight: 20 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
