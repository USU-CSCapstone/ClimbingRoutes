// Signing in and out of the team's Supabase accounts. Accounts are made in the
// Supabase dashboard; the app has no sign-up.
import type { Session } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

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

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}

function signInMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/network|fetch/i.test(message)) return "Couldn't reach the server. Check your connection.";
  return message;
}
