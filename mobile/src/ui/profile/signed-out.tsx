// The Profile tab with nobody signed in: what an account is for, then the two
// ways in. All three pages keep the dark top the signed-in profile has.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { DifficultyBand } from '@/core/grades';
import { cleanUsername, USERNAME_HINT, usernameProblem } from '@/core/username';
import { useSignIn, useSignUp, useUsernameAvailable } from '@/data/auth';
import { useTheme } from '@/hooks/use-theme';
import { FEATURED_WALL } from '@/ui/home/featured-wall';
import { SHEET_OVERLAP } from '@/ui/home/hero';
import { CLIP, Display, Fade } from '@/ui/home/kit';
import { Field, GUTTER, Help, type IconName, useDebounced, useTint } from '@/ui/profile/kit';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';
import { WallCut } from '@/ui/tips/art';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';
import { OnModel, RoundButton } from '@/ui/wall/parts';

/** The shortest password the server takes. */
const PASSWORD_MIN = 6;
/** How tall the picture at the top of the first page is on a phone. */
const HERO = 300;
/** The forms keep to a column this wide on a big screen. */
const FORM_WIDTH = 480;

const PERKS: { band: DifficultyBand; icon: IconName; title: string; detail: string }[] = [
  { band: 1, icon: 'bookmark', title: 'Save routes', detail: 'Line up what you want to climb next.' },
  { band: 0, icon: 'checkmark-circle', title: 'Mark what you’ve climbed', detail: 'Watch your grades stack up.' },
  { band: 2, icon: 'cube', title: 'Scan a wall', detail: 'Follow it until it’s a wall in 3D.' },
];

type Page = 'welcome' | 'create' | 'sign-in';

export function SignedOut({ width, wide }: { width: number; wide: boolean }) {
  const [page, setPage] = useState<Page>('welcome');
  if (page === 'create') return <CreateAccount width={width} wide={wide} onBack={() => setPage('welcome')} onSignIn={() => setPage('sign-in')} />;
  if (page === 'sign-in') return <SignIn width={width} wide={wide} onBack={() => setPage('welcome')} onCreate={() => setPage('create')} />;
  return <Welcome width={width} wide={wide} onCreate={() => setPage('create')} onSignIn={() => setPage('sign-in')} />;
}

function Welcome({ width, wide, onCreate, onSignIn }: { width: number; wide: boolean; onCreate: () => void; onSignIn: () => void }) {
  const theme = useTheme();
  const title = (
    <>
      <Display style={[styles.title, wide && styles.titleWide]}>{'Keep track of\nyour climbing'}</Display>
      <AppText style={styles.lead}>One free account for all of it.</AppText>
    </>
  );
  const buttons = (
    <>
      <ActionButton label="Create account" onPress={onCreate} primary />
      <ActionButton label="Sign in" onPress={onSignIn} />
      <AppText type="small" color="textSecondary" style={styles.center}>
        You can browse without an account.
      </AppText>
    </>
  );

  if (wide) {
    const inner = Math.min(width, MaxContentWidth) - Spacing.three * 2;
    const pictureWidth = Math.round(inner * 0.5);
    const pictureHeight = Math.round(pictureWidth / FEATURED_WALL.aspect);
    return (
      <View>
        <View style={styles.band}>
          <View style={styles.wideRow}>
            <View style={styles.flex}>{title}</View>
            <Image source={FEATURED_WALL.drawn} contentFit="cover" style={{ width: pictureWidth, height: pictureHeight }} />
          </View>
        </View>
        <View style={styles.wideBody}>
          <View style={styles.perkRow}>
            {PERKS.map((perk) => (
              <View key={perk.title} style={styles.flex}>
                <Perk {...perk} stacked />
              </View>
            ))}
          </View>
          <View style={styles.wideButtons}>{buttons}</View>
        </View>
      </View>
    );
  }

  // The wall sits at the bottom of the picture, under the words, with its lines showing.
  const pictureWidth = Math.max(width, 380);
  const pictureHeight = pictureWidth / FEATURED_WALL.aspect;
  return (
    <View style={styles.flex}>
      <View style={[styles.hero, { height: HERO }]}>
        <Image
          source={FEATURED_WALL.drawn}
          contentFit="fill"
          style={[styles.heroPicture, { width: pictureWidth, height: pictureHeight, left: -(pictureWidth - width) * 0.3, top: HERO - pictureHeight }]}
        />
        <Fade
          color={VIEWER_BACKGROUND}
          stops={[
            [0, 1],
            [0.44, 1],
            [0.64, 0.35],
            [0.8, 0],
          ]}
        />
        <View style={styles.heroText}>{title}</View>
      </View>
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.perks}>
          {PERKS.map((perk) => (
            <Perk key={perk.title} {...perk} />
          ))}
        </View>
        <View style={styles.buttons}>{buttons}</View>
      </View>
    </View>
  );
}

function Perk({ band, icon, title, detail, stacked }: (typeof PERKS)[number] & { stacked?: boolean }) {
  const tint = useTint(band);
  return (
    <View style={stacked ? styles.perkStacked : styles.perk}>
      <View style={[styles.perkIcon, { backgroundColor: tint.bg }]}>
        <Ionicons name={icon} size={22} color={tint.text} />
      </View>
      <View style={stacked ? null : styles.flex}>
        <AppText style={styles.bold}>{title}</AppText>
        <AppText type="small" color="textSecondary">
          {detail}
        </AppText>
      </View>
    </View>
  );
}

function CreateAccount({ width, wide, onBack, onSignIn }: { width: number; wide: boolean; onBack: () => void; onSignIn: () => void }) {
  const signUp = useSignUp();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const name = cleanUsername(username);
  const problem = name ? usernameProblem(name) : null;
  // Asked once typing pauses. An answer for an earlier spelling doesn't count for this one.
  const settled = useDebounced(name, 350);
  const answer = useUsernameAvailable(settled);
  const free = settled === name && name !== '' && !problem ? answer : undefined;
  const ready = name !== '' && !problem && free !== false && email.trim() !== '' && password.length >= PASSWORD_MIN && !signUp.isPending;
  const submit = () => ready && signUp.mutate({ email, password, username: name });
  const typed = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    signUp.reset();
  };

  if (signUp.data?.confirm) {
    return (
      <FormPage width={width} wide={wide} title="Check your email" lead={`We sent a link to ${email.trim()}. Open it to finish making your account.`} onBack={onBack}>
        <ActionButton label="Sign in" onPress={onSignIn} primary />
      </FormPage>
    );
  }
  return (
    <FormPage width={width} wide={wide} title="Create account" lead="Your username is the name on your profile." onBack={onBack}>
      <Field
        icon="person-outline"
        value={username}
        onChangeText={typed((text: string) => setUsername(text.toLowerCase()))}
        placeholder="Username"
        autoComplete="username-new"
        textContentType="username"
        maxLength={20}
        returnKeyType="next"
        end={free === true ? <Ionicons name="checkmark-circle" size={22} color="#639922" /> : null}
      />
      {problem ? (
        <Help tone="bad">{problem}</Help>
      ) : free === true ? (
        <Help tone="good">{`${name} is free`}</Help>
      ) : free === false ? (
        <Help tone="bad">{`${name} is taken`}</Help>
      ) : (
        <Help>{USERNAME_HINT}</Help>
      )}
      <Field
        icon="mail-outline"
        value={email}
        onChangeText={typed(setEmail)}
        placeholder="Email"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <Field
        icon="lock-closed-outline"
        secret
        value={password}
        onChangeText={typed(setPassword)}
        placeholder="Password"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Help>{`At least ${PASSWORD_MIN} characters`}</Help>
      {signUp.error ? <AppText color="danger">{signUp.error.message}</AppText> : null}
      <View style={styles.submit}>
        <ActionButton label={signUp.isPending ? 'Creating…' : 'Create account'} onPress={submit} disabled={!ready} primary />
      </View>
      <Switch question="Already have one?" action="Sign in" onPress={onSignIn} />
    </FormPage>
  );
}

function SignIn({ width, wide, onBack, onCreate }: { width: number; wide: boolean; onBack: () => void; onCreate: () => void }) {
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const ready = email.trim() !== '' && password !== '' && !signIn.isPending;
  const submit = () => ready && signIn.mutate({ email, password });
  const typed = (set: (value: string) => void) => (value: string) => {
    set(value);
    signIn.reset();
  };
  return (
    <FormPage width={width} wide={wide} title="Welcome back" lead="Sign in to see your climbs, saves and scans." onBack={onBack}>
      <Field
        icon="mail-outline"
        value={email}
        onChangeText={typed(setEmail)}
        placeholder="Email"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        returnKeyType="next"
      />
      <Field
        icon="lock-closed-outline"
        secret
        value={password}
        onChangeText={typed(setPassword)}
        placeholder="Password"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {signIn.error ? <AppText color="danger">{signIn.error.message}</AppText> : null}
      <View style={styles.submit}>
        <ActionButton label={signIn.isPending ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={!ready} primary />
      </View>
      <Switch question="New here?" action="Create account" onPress={onCreate} />
    </FormPage>
  );
}

/** A form under a dark top with a Back button, a title and a line about it. */
function FormPage({
  width,
  wide,
  title,
  lead,
  onBack,
  children,
}: {
  width: number;
  wide: boolean;
  title: string;
  lead: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const [height, setHeight] = useState(190);
  return (
    <View style={styles.flex}>
      <View style={styles.band} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
        <WallCut width={width} height={height} picWidth={Math.max(width, 760)} focusX={0.6} focusY={0.45} style={styles.formPicture} />
        <Fade
          color={VIEWER_BACKGROUND}
          stops={[
            [0, 0.92],
            [0.6, 0.6],
            [1, 0.9],
          ]}
        />
        <View style={[styles.formTop, wide && styles.column]}>
          <RoundButton icon="chevron-back" label="Back" onPress={onBack} onModel size={42} />
          <Display style={styles.formTitle}>{title}</Display>
          <AppText style={styles.lead}>{lead}</AppText>
        </View>
      </View>
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={[styles.form, wide && styles.column]}>{children}</View>
      </View>
    </View>
  );
}

/** "Already have one? Sign in", the way from one form to the other. */
function Switch({ question, action, onPress }: { question: string; action: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable role="link" onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.switch, pressed && styles.pressed]}>
      <AppText>
        {question} <AppText style={[styles.bold, { color: theme.accent }]}>{action}</AppText>
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '700' },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  band: { backgroundColor: VIEWER_BACKGROUND, overflow: CLIP },
  hero: { backgroundColor: VIEWER_BACKGROUND, overflow: CLIP },
  heroPicture: { position: 'absolute' },
  heroText: { position: 'absolute', top: Spacing.three - Spacing.one, left: GUTTER + Spacing.half, right: GUTTER + Spacing.half },
  title: { color: OnModel.text, fontSize: 36, lineHeight: 38, letterSpacing: -1.3 },
  titleWide: { fontSize: 42, lineHeight: 46, letterSpacing: -1.5 },
  lead: { color: OnModel.muted, fontSize: 17, lineHeight: 24, marginTop: 6 },
  // Rounded where it rides up over the dark top.
  sheet: { flex: 1, marginTop: -SHEET_OVERLAP, borderTopLeftRadius: SHEET_OVERLAP, borderTopRightRadius: SHEET_OVERLAP, paddingBottom: Spacing.four },
  perks: { paddingTop: Spacing.three, paddingHorizontal: GUTTER, gap: Spacing.three - Spacing.half },
  perk: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - Spacing.half },
  perkStacked: { gap: Spacing.two + Spacing.half },
  perkIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttons: { paddingTop: Spacing.three + Spacing.one, paddingHorizontal: GUTTER, gap: Spacing.two },
  wideRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  wideBody: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.four, gap: Spacing.four },
  perkRow: { flexDirection: 'row', gap: Spacing.four },
  wideButtons: { width: '100%', maxWidth: 380, gap: Spacing.two },
  formPicture: { position: 'absolute', top: 0, left: 0, opacity: 0.4 },
  formTop: { paddingTop: Spacing.two, paddingHorizontal: GUTTER + Spacing.half, paddingBottom: Spacing.three + SHEET_OVERLAP },
  formTitle: { color: OnModel.text, fontSize: 32, lineHeight: 36, letterSpacing: -1.1, marginTop: Spacing.three - Spacing.half },
  form: { paddingTop: Spacing.four, paddingHorizontal: GUTTER, gap: Spacing.two + Spacing.half },
  column: { width: '100%', maxWidth: FORM_WIDTH, alignSelf: 'center' },
  submit: { marginTop: Spacing.one },
  switch: { alignSelf: 'center', paddingVertical: Spacing.two },
});
