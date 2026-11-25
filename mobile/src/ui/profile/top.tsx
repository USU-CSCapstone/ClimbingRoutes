// The top of the Profile tab, dark like Home's: who's signed in, over a faint
// picture of the wall, with the way into Account.
import { Pressable, StyleSheet, View } from 'react-native';

import { Difficulty, MaxContentWidth, Spacing } from '@/constants/theme';
import { SHEET_OVERLAP } from '@/ui/home/hero';
import { CLIP, Display, Fade, INK } from '@/ui/home/kit';
import { GUTTER } from '@/ui/profile/kit';
import { AppText } from '@/ui/text';
import { WallCut } from '@/ui/tips/art';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import { OnModel, RoundButton } from '@/ui/wall/parts';

const AVATAR = 56;
/** The band's height on a phone, including the part the page's rounded top rides over. */
export const PHONE_BAND = Spacing.two + AVATAR + Spacing.three + SHEET_OVERLAP;
const WIDE_BAND = AVATAR + 2 * Spacing.four;

/**
 * `name` is the username, or what stands in for one. `prompt` is shown under it
 * in place of the join date when the account still has to pick a username.
 */
export function ProfileTop({
  width,
  wide,
  name,
  joined,
  prompt,
  onAccount,
}: {
  width: number;
  wide: boolean;
  name: string;
  /** Like "October 2026". */
  joined: string | null;
  prompt?: string;
  onAccount: () => void;
}) {
  const height = wide ? WIDE_BAND : PHONE_BAND;
  return (
    <View style={[styles.band, { height }]}>
      <WallCut width={width} height={height} picWidth={Math.max(width, 760)} focusX={0.3} focusY={0.4} style={styles.picture} />
      <Fade
        color={VIEWER_BACKGROUND}
        stops={[
          [0, 0.92],
          [0.6, 0.55],
          [1, 0.88],
        ]}
      />
      <View style={[styles.row, wide ? styles.rowWide : styles.rowPhone]}>
        <View style={styles.avatar}>
          <Display style={styles.initial}>{name.charAt(0).toUpperCase() || '?'}</Display>
        </View>
        <View style={styles.names}>
          <Display numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.name}>
            {name}
          </Display>
          {prompt ? (
            <Pressable role="link" onPress={onAccount} hitSlop={8}>
              <AppText style={styles.prompt}>{prompt}</AppText>
            </Pressable>
          ) : joined ? (
            <AppText style={styles.joined}>Joined {joined}</AppText>
          ) : null}
        </View>
        <RoundButton icon="settings-outline" label="Account" onPress={onAccount} onModel />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: VIEWER_BACKGROUND, overflow: CLIP },
  picture: { position: 'absolute', top: 0, left: 0, opacity: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - Spacing.half },
  rowPhone: { paddingTop: Spacing.two, paddingHorizontal: GUTTER },
  rowWide: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: GUTTER, height: '100%' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: Difficulty[1].line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: INK, fontSize: 26, lineHeight: 30 },
  names: { flex: 1, minWidth: 0 },
  name: { color: OnModel.text, fontSize: 30, lineHeight: 34, letterSpacing: -1 },
  joined: { color: OnModel.muted, fontSize: 15, lineHeight: 20, marginTop: 1 },
  prompt: { color: OnModel.text, fontSize: 15, lineHeight: 20, marginTop: 1, fontWeight: '600', textDecorationLine: 'underline' },
});
