// Accounts: signing in and out, making one, and what an account can change
// about itself (its username and password).
import type { Session } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { Profile } from '@/core/database';
import { usernameProblem } from '@/core/username';
import { supabase } from '@/data/supabase';

type SessionState = { session: Session | null; loading: boolean };

// One listener for the whole app, shared by every screen and button that asks who's signed in.
let current: SessionState = { session: null, loading: true };
const listeners = new Set<() => void>();
let listening = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!listening) {
    listening = true;
    // Fires once straight away with the saved session, then on every sign-in, sign-out and refresh.
    supabase.auth.onAuthStateChange((_event, session) => {
      current = { session, loading: false };
      for (const each of listeners) each();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

const read = () => current;

/** The signed-in session, or null. `loading` is true until the saved session has been read. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, read, read);
}

/** The signed-in account's id, or undefined when signed out or not yet known. */
export function useUserId(): string | undefined {
  return useSession().session?.user.id;
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(authMessage(error.message));
    },
  });
}

/**
 * Makes an account and signs it in. The username goes along as the account's
 * details, where the database picks it up for the new profile. Resolves to
 * `confirm: true` if the project wants the email confirmed first, in which case
 * nobody is signed in yet.
 */
export function useSignUp() {
  return useMutation({
    mutationFn: async ({ email, password, username }: { email: string; password: string; username: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username } },
      });
      if (error) throw new Error(authMessage(error.message));
      return { confirm: data.session == null };
    },
  });
}

/**
 * The signed-in account's profile, or null when signed out. Whether it's the
 * moderator only decides what the app shows; the database enforces it.
 */
export function useProfile() {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: async ({ signal }): Promise<Profile> => {
      const { data, error } = await supabase.from('profiles').select().eq('id', userId!).abortSignal(signal).single();
      if (error) throw new Error(`Couldn't load your profile: ${error.message}`);
      return data;
    },
    enabled: userId != null,
    // Refetched whenever a screen using it opens, so a role set in SQL shows up without signing out.
    staleTime: 0,
  });
  return {
    profile: userId ? (query.data ?? null) : null,
    loading: loading || (userId != null && query.isPending),
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Whether nobody has this username yet. Undefined while it's being asked, for
 * a name that breaks the rules, and if the question couldn't be asked, so a
 * failed check never blocks anyone: the database has the last word anyway.
 */
export function useUsernameAvailable(name: string): boolean | undefined {
  const query = useQuery({
    queryKey: ['username-available', name],
    queryFn: async ({ signal }): Promise<boolean> => {
      const { data, error } = await supabase.rpc('username_available', { name }).abortSignal(signal);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: usernameProblem(name) == null,
    staleTime: 30 * 1000,
    retry: false,
  });
  return query.data;
}

export function useSetUsername() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (username: string) => {
      if (!userId) throw new Error('Sign in first.');
      const { error } = await supabase.from('profiles').update({ username }).eq('id', userId);
      if (!error) return;
      // The unique rule and the format rule, by their Postgres codes.
      if (error.code === '23505') throw new Error('That username is taken.');
      if (error.code === '23514') throw new Error('Usernames are 3 to 20 letters, numbers or underscores.');
      throw new Error(`Couldn't save the username: ${error.message}`);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['username-available'] }),
      ]),
  });
}

/** Sets a new password for the signed-in account. It stays signed in. */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(authMessage(error.message));
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    // Nothing of the last account's stays behind for the next one.
    onSuccess: () => {
      for (const queryKey of [['profile'], ['saved-routes'], ['climbed-routes'], ['my-captures']]) {
        queryClient.removeQueries({ queryKey });
      }
    },
  });
}

/** Supabase's wording for the failures people actually hit, in the app's own. */
function authMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/signups? not allowed|signup is disabled|signups are disabled/i.test(message)) {
    return 'New accounts aren’t open yet. Ask the team for one.';
  }
  if (/already registered|already been registered/i.test(message)) return 'That email already has an account. Sign in instead.';
  if (/valid email|invalid format|email address .* is invalid/i.test(message)) return 'That doesn’t look like an email address.';
  if (/different from the old password/i.test(message)) return 'That’s your current password. Pick a different one.';
  if (/rate limit|too many requests/i.test(message)) return 'Too many tries. Wait a minute, then try again.';
  if (/network|fetch/i.test(message)) return "Couldn't reach the server. Check your connection.";
  return message;
}
