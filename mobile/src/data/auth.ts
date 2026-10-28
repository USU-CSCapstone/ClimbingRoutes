// Signing in and out of the team's Supabase accounts. Accounts are made in the
// Supabase dashboard; the app has no sign-up.
import type { Session } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { Profile } from '@/core/database';
import { supabase } from '@/data/supabase';

/** The signed-in session, or null. `loading` is true until the saved session has been read. */
export function useSession() {
  const [state, setState] = useState<{ session: Session | null; loading: boolean }>({
    session: null,
    loading: true,
  });
  useEffect(() => {
    // Fires once straight away with the saved session, then on every sign-in, sign-out and refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ session, loading: false }));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(signInMessage(error.message));
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
    // Changes only when someone edits it in SQL.
    staleTime: Infinity,
  });
  return {
    profile: userId ? (query.data ?? null) : null,
    loading: loading || (userId != null && query.isPending),
    error: query.error,
  };
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    // Nothing of the last account's stays behind for the next one.
    onSuccess: () => queryClient.removeQueries({ queryKey: ['profile'] }),
  });
}

function signInMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/network|fetch/i.test(message)) return "Couldn't reach the server. Check your connection.";
  return message;
}
