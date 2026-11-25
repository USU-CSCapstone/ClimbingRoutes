import type { Session } from '@supabase/supabase-js';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { monthAndYear } from '@/core/days';
import { useProfile, useSession } from '@/data/auth';
import { useMyScans } from '@/data/captures';
import { useClimbedRoutes, useSavedRoutes } from '@/data/logbook';
import { supabaseConfigured } from '@/data/supabase';
import { useTheme } from '@/hooks/use-theme';
import { Loading, Message } from '@/ui/components';
import { SHEET_OVERLAP } from '@/ui/home/hero';
import { ClimbedTab } from '@/ui/profile/climbed';
import { GUTTER, WIDE } from '@/ui/profile/kit';
import { SavedTab } from '@/ui/profile/saved';
import { ScansTab } from '@/ui/profile/scans';
import { SignedOut } from '@/ui/profile/signed-out';
import { type ProfileTab, ProfileTabs } from '@/ui/profile/tabs';
import { ProfileTop } from '@/ui/profile/top';
import { ActionButton } from '@/ui/scan/controls';
import { AppText } from '@/ui/text';
import { VIEWER_BACKGROUND } from '@/ui/wall/model-layer';

/** Dark kept behind the top of the page on a phone, which is what shows when the page is pulled down. */
const PULL_ROOM = 220;

/**
 * The Profile tab (#83). Signed in: who you are, then what you've climbed,
 * the routes you've saved and the scans you've sent, as three tabs. Signed
 * out: what an account is for, and the ways in. Either way the top is dark,
 * like Home's, in both themes.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const safe = useSafeAreaInsets();
  const focused = useIsFocused();
  const screen = useWindowDimensions();
  const wide = screen.width >= WIDE;
  const { session, loading } = useSession();

  if (!supabaseConfigured || loading) {
    return (
      <View style={[styles.flex, { paddingTop: safe.top }]}>
        {supabaseConfigured ? (
          <Loading />
        ) : (
          <Message title="Accounts aren't set up yet" detail="Add the Supabase project URL and publishable key to src/core/config.ts." />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      {focused ? <StatusBar style="light" /> : null}
      <View style={[styles.statusStrip, { height: safe.top }]} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {wide ? null : <View pointerEvents="none" style={styles.pullRoom} />}
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.grow}>
          {session ? <SignedIn session={session} width={screen.width} wide={wide} /> : <SignedOut width={screen.width} wide={wide} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SignedIn({ session, width, wide }: { session: Session; width: number; wide: boolean }) {
  const theme = useTheme();
  const { profile, error, refetch } = useProfile();
  const [tab, setTab] = useState<ProfileTab>('climbed');
  const counts = {
    climbed: useClimbedRoutes().data?.length,
    saved: useSavedRoutes().data?.length,
    scans: useMyScans(session.user.id).data?.length,
  };
  // An account from before usernames goes by the start of its email until it picks one.
  const name = profile?.username ?? session.user.email?.split('@')[0] ?? 'You';

  const body = (
    <>
      {error ? (
        <View style={styles.notice}>
          <AppText color="danger">{error.message}</AppText>
          <ActionButton icon="refresh" label="Try again" onPress={() => refetch()} />
        </View>
      ) : null}
      <ProfileTabs value={tab} counts={counts} onChange={setTab} />
      {tab === 'climbed' ? <ClimbedTab wide={wide} /> : tab === 'saved' ? <SavedTab /> : <ScansTab />}
    </>
  );
  return (
    <>
      <ProfileTop
        width={width}
        wide={wide}
        name={name}
        joined={profile ? monthAndYear(profile.created_at) : null}
        prompt={profile && !profile.username ? 'Pick a username' : undefined}
        onAccount={() => router.push('/account')}
      />
      {wide ? (
        <View style={[styles.wideBody, { backgroundColor: theme.background }]}>
          <View style={styles.column}>{body}</View>
        </View>
      ) : (
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>{body}</View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  statusStrip: { backgroundColor: VIEWER_BACKGROUND },
  pullRoom: { position: 'absolute', top: 0, left: 0, right: 0, height: PULL_ROOM, backgroundColor: VIEWER_BACKGROUND },
  // Rounded where it rides up over the dark top.
  sheet: {
    flex: 1,
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: SHEET_OVERLAP,
    borderTopRightRadius: SHEET_OVERLAP,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  wideBody: { flex: 1, paddingTop: Spacing.two, paddingBottom: Spacing.five },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  notice: { paddingHorizontal: GUTTER, paddingVertical: Spacing.three, gap: Spacing.two },
});
