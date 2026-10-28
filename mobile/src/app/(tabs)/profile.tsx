import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, TapTarget } from '@/constants/theme';
import { useProfile, useSession, useSignIn, useSignOut } from '@/data/auth';
import { supabaseConfigured } from '@/data/supabase';
import { useTheme } from '@/hooks/use-theme';
import { LinkRow, Loading, Message } from '@/ui/components';
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
    body = <SignedIn email={session.user.email ?? 'Signed in'} />;
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

function SignedIn({ email }: { email: string }) {
  const signOut = useSignOut();
  const { profile, error, refetch } = useProfile();
  return (
    <View style={styles.page}>
      <View style={styles.flex}>
        <AppText type="title">Profile</AppText>
        <AppText color="textSecondary">Signed in as {email}</AppText>
        {error ? (
          <View style={styles.notice}>
            <AppText color="danger">{error.message}</AppText>
            <Button label="Try again" onPress={() => refetch()} secondary />
          </View>
        ) : null}
        {profile?.is_moderator ? (
          <View style={styles.tools}>
            <LinkRow href="/moderate" title="Moderator tools" subtitle="Review models and draw routes" />
          </View>
        ) : null}
      </View>
      {signOut.error ? <AppText color="danger">{signOut.error.message}</AppText> : null}
      <Button label="Sign out" busy={signOut.isPending} onPress={() => signOut.mutate()} secondary />
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
  input: { minHeight: TapTarget, borderRadius: 12, paddingHorizontal: Spacing.three, fontSize: 18 },
  button: { minHeight: TapTarget, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
