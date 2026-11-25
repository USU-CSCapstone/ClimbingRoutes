import { Redirect, Stack } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, TapTarget } from '@/constants/theme';
import { cleanUsername, USERNAME_HINT, usernameProblem } from '@/core/username';
import { useChangePassword, useProfile, useSession, useSetUsername, useSignOut, useUsernameAvailable } from '@/data/auth';
import { allowsCellular, setAllowsCellular } from '@/data/uploads';
import { useTheme } from '@/hooks/use-theme';
import { LinkRow, Loading } from '@/ui/components';
import { Field, GUTTER, Help, useDebounced } from '@/ui/profile/kit';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';

/** The shortest password the server takes. */
const PASSWORD_MIN = 6;

/**
 * /account, opened by the gear on Profile: change your username or password,
 * choose whether scans upload over cellular, and sign out. Signed out, it goes
 * to the Profile tab, which has the ways in.
 */
export default function AccountScreen() {
  const { session, loading } = useSession();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/(tabs)/profile" />;
  return (
    <>
      <Stack.Screen options={{ title: 'Account' }} />
      <Account email={session.user.email ?? ''} />
    </>
  );
}

function Account({ email }: { email: string }) {
  const theme = useTheme();
  const safe = useSafeAreaInsets();
  const { profile, error: profileError } = useProfile();
  const setUsername = useSetUsername();
  const changePassword = useChangePassword();
  const signOut = useSignOut();

  // Null until it's typed in, so the box starts with the saved username once that has loaded.
  const [typedName, setTypedName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  const current = profile?.username ?? '';
  const name = cleanUsername(typedName ?? current);
  const renaming = profile != null && name !== current;
  const nameProblem = renaming ? usernameProblem(name) : null;
  // Asked once typing pauses. An answer for an earlier spelling doesn't count for this one.
  const settled = useDebounced(name, 350);
  const answer = useUsernameAvailable(renaming ? settled : '');
  const free = renaming && settled === name && !nameProblem ? answer : undefined;

  const newPassword = password !== '' || again !== '';
  const passwordProblem =
    password !== '' && password.length < PASSWORD_MIN
      ? `At least ${PASSWORD_MIN} characters`
      : again !== '' && again !== password
        ? 'The two don’t match yet'
        : null;
  const passwordReady = password.length >= PASSWORD_MIN && again === password;
  const busy = setUsername.isPending || changePassword.isPending;
  const ready = (renaming || newPassword) && (!renaming || (!nameProblem && free !== false)) && (!newPassword || passwordReady) && !busy;
  const error = setUsername.error ?? changePassword.error;

  function changed() {
    setSaved(null);
    setUsername.reset();
    changePassword.reset();
  }

  async function save() {
    if (!ready) return;
    const done: string[] = [];
    try {
      if (renaming) {
        await setUsername.mutateAsync(name);
        setTypedName(null);
        done.push('username');
      }
      if (newPassword) {
        await changePassword.mutateAsync(password);
        setPassword('');
        setAgain('');
        done.push('password');
      }
      setSaved(`Saved your new ${done.join(' and ')}.`);
    } catch {
      // The failed step's message shows below, from its own error. Anything saved before it stays saved.
      if (done.length) setSaved(`Saved your new ${done.join(' and ')}.`);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page, { paddingBottom: Spacing.four + safe.bottom }]}>
        <Group label="Username">
          <Field
            icon="person-outline"
            value={typedName ?? current}
            onChangeText={(text) => {
              setTypedName(text.toLowerCase());
              changed();
            }}
            placeholder={profile ? 'Pick a username' : ''}
            editable={profile != null}
            autoComplete="username-new"
            maxLength={20}
          />
          {profileError ? (
            <Help tone="bad">{profileError.message}</Help>
          ) : nameProblem ? (
            <Help tone="bad">{nameProblem}</Help>
          ) : free === true ? (
            <Help tone="good">{`${name} is free`}</Help>
          ) : free === false ? (
            <Help tone="bad">{`${name} is taken`}</Help>
          ) : (
            <Help>{USERNAME_HINT}</Help>
          )}
        </Group>

        <Group label="Email">
          <AppText color="textSecondary">{email}</AppText>
        </Group>

        <Group label="Change password">
          <Field
            icon="lock-closed-outline"
            secret
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              changed();
            }}
            placeholder="New password"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <Field
            icon="lock-closed-outline"
            secret
            value={again}
            onChangeText={(text) => {
              setAgain(text);
              changed();
            }}
            placeholder="New password again"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={save}
          />
          {passwordProblem ? <Help tone="bad">{passwordProblem}</Help> : null}
        </Group>

        {error ? <AppText color="danger">{error.message}</AppText> : null}
        {saved ? <Help tone="good">{saved}</Help> : null}
        <ActionButton label={busy ? 'Saving…' : 'Save changes'} onPress={save} disabled={!ready} primary />

        {Platform.OS === 'web' ? null : <UploadSetting />}
        {profile?.is_moderator ? (
          Platform.OS === 'web' ? (
            <View style={styles.tools}>
              <LinkRow href="/moderate" title="Moderator tools" subtitle="Review models and draw routes" />
            </View>
          ) : (
            <AppText type="small" color="textSecondary">
              Moderator tools are in the web app. Open it in a browser on a laptop.
            </AppText>
          )
        ) : null}

        <View style={styles.signOut}>
          {signOut.error ? <AppText color="danger">{signOut.error.message}</AppText> : null}
          <ActionButton label={signOut.isPending ? 'Signing out…' : 'Sign out'} onPress={() => signOut.mutate()} disabled={signOut.isPending} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText type="label" color="textSecondary">
        {label}
      </AppText>
      {children}
    </View>
  );
}

function UploadSetting() {
  const [cellular, setCellular] = useState(allowsCellular);
  return (
    <View style={styles.setting}>
      <View style={styles.flex}>
        <AppText>Upload scans over cellular</AppText>
        <AppText type="small" color="textSecondary">
          {cellular ? 'Uploads start on any connection' : 'Uploads wait for Wi-Fi. A scan is 50–200 MB'}
        </AppText>
      </View>
      <Switch
        value={cellular}
        onValueChange={(on) => {
          setCellular(on);
          setAllowsCellular(on);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Controls sit in one column a thumb can reach down, and stay readable on a wide screen.
  page: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: GUTTER, gap: Spacing.three + Spacing.one },
  group: { gap: Spacing.two },
  tools: { marginHorizontal: -GUTTER },
  setting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: TapTarget },
  signOut: { flexGrow: 1, justifyContent: 'flex-end', gap: Spacing.two, paddingTop: Spacing.three },
});
