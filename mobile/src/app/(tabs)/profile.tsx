import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, TapTarget } from '@/constants/theme';
import type { Capture } from '@/core/database';
import type { Scan } from '@/core/capture';
import { useProfile, useSession, useSignIn, useSignOut } from '@/data/auth';
import { useMyCaptures } from '@/data/captures';
import { useArea } from '@/data/queries';
import { useScans } from '@/data/scans';
import { supabaseConfigured } from '@/data/supabase';
import { allowsCellular, setAllowsCellular, useUploadProgress } from '@/data/uploads';
import { useTheme } from '@/hooks/use-theme';
import { LinkRow, Loading, Message } from '@/ui/components';
import { CAPTURE_STATUS, uploadText } from '@/ui/scan/upload-status';
import { AppText } from '@/ui/text';

export default function ProfileScreen() {
  const { session, loading } = useSession();

  let body;
  if (!supabaseConfigured) {
    body = (
      <Message
        title="Accounts aren't set up yet"
        detail="Add the Supabase project URL and publishable key to src/core/config.ts."
      />
    );
  } else if (loading) {
    body = <Loading />;
  } else if (session) {
    body = <SignedIn email={session.user.email ?? 'Signed in'} userId={session.user.id} />;
  } else {
    body = <SignInForm />;
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SignedIn({ email, userId }: { email: string; userId: string }) {
  const signOut = useSignOut();
  const { profile, error, refetch } = useProfile();
  return (
    <View style={styles.page}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        <AppText type="title">Profile</AppText>
        <AppText color="textSecondary">Signed in as {email}</AppText>
        {error ? (
          <View style={styles.notice}>
            <AppText color="danger">{error.message}</AppText>
            <Button label="Try again" onPress={() => refetch()} secondary />
          </View>
        ) : null}
        {profile?.is_moderator ? (
          Platform.OS === 'web' ? (
            <View style={styles.tools}>
              <LinkRow href="/moderate" title="Moderator tools" subtitle="Review models and draw routes" />
            </View>
          ) : (
            <AppText type="small" color="textSecondary" style={styles.notice}>
              Moderator tools are in the web app. Open it in a browser on a laptop.
            </AppText>
          )
        ) : null}
        {Platform.OS === 'web' ? null : <UploadSettings />}
        <YourScans userId={userId} />
      </ScrollView>
      {signOut.error ? <AppText color="danger">{signOut.error.message}</AppText> : null}
      <Button label="Sign out" busy={signOut.isPending} onPress={() => signOut.mutate()} secondary />
    </View>
  );
}

function UploadSettings() {
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

/** Scans uploading from this phone, then this account's uploaded ones and where each is. */
function YourScans({ userId }: { userId: string }) {
  const uploading = useScans().filter((s) => s.status === 'uploading');
  const captures = useMyCaptures(userId);
  if (!uploading.length && !captures.data?.length && !captures.error) return null;
  return (
    <View style={styles.scans}>
      <AppText type="label" color="textSecondary">
        Your scans
      </AppText>
      {uploading.map((scan) => (
        <UploadingRow key={scan.id} scan={scan} />
      ))}
      {captures.error ? <AppText color="danger">{captures.error.message}</AppText> : null}
      {captures.data?.map((capture) => (
        <CaptureRow key={capture.id} capture={capture} />
      ))}
    </View>
  );
}

function UploadingRow({ scan }: { scan: Scan }) {
  const progress = useUploadProgress(scan.id);
  return <ScanRow wallUuid={scan.wallUuid} status={uploadText(progress)} failed={progress?.state === 'failed'} />;
}

function CaptureRow({ capture }: { capture: Capture }) {
  const reason = capture.status === 'failed' && capture.failure_reason ? `: ${capture.failure_reason}` : '';
  return <ScanRow wallUuid={capture.wall_uuid} status={CAPTURE_STATUS[capture.status] + reason} failed={capture.status === 'failed'} />;
}

function ScanRow({ wallUuid, status, failed }: { wallUuid: string; status: string; failed: boolean }) {
  const theme = useTheme();
  const area = useArea(wallUuid);
  return (
    <View style={[styles.scanRow, { borderBottomColor: theme.border }]}>
      <AppText style={styles.bold}>{area.data?.name ?? 'Wall'}</AppText>
      <AppText type="small" color={failed ? 'danger' : 'textSecondary'}>
        {status}
      </AppText>
    </View>
  );
}

function SignInForm() {
  const theme = useTheme();
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const ready = email.trim() !== '' && password !== '' && !signIn.isPending;
  const submit = () => ready && signIn.mutate({ email, password });
  const input = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <View style={styles.page}>
      <View style={styles.flex}>
        <AppText type="title">Sign in</AppText>
        <AppText color="textSecondary">Team accounts only for now. You can browse without one.</AppText>
      </View>
      <View style={styles.form}>
        <TextInput
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            signIn.reset();
          }}
          placeholder="Email"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          style={input}
        />
        <TextInput
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            signIn.reset();
          }}
          placeholder="Password"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          style={input}
        />
        {signIn.error ? <AppText color="danger">{signIn.error.message}</AppText> : null}
        <Button label="Sign in" busy={signIn.isPending} disabled={!ready} onPress={submit} />
      </View>
    </View>
  );
}

function Button({
  label,
  onPress,
  busy,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      role="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        secondary
          ? { borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth * 2 }
          : { backgroundColor: theme.accent },
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <AppText style={[styles.buttonText, { color: secondary ? theme.text : theme.accentText }]}>
        {busy ? '…' : label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Controls sit at the bottom so they're reachable one-handed.
  page: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  form: { gap: Spacing.two },
  tools: { marginTop: Spacing.three, marginHorizontal: -Spacing.three },
  notice: { marginTop: Spacing.three, gap: Spacing.two },
  scroll: { gap: Spacing.one, paddingBottom: Spacing.three },
  setting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.four, minHeight: TapTarget },
  scans: { marginTop: Spacing.four, gap: Spacing.one },
  scanRow: { paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.half },
  bold: { fontWeight: '600' },
  input: { minHeight: TapTarget, borderRadius: 12, paddingHorizontal: Spacing.three, fontSize: 18 },
  button: { minHeight: TapTarget, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
