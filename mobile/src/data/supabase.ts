// The app's one Supabase client. It signs in with the publishable key plus the
// user's own session; row-level security decides what each account can do.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/core/config';
import type { Database } from '@/core/database';

/** False until config.ts has the project's URL and key. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// A stand-in URL keeps the app starting before the project exists; requests to it just fail.
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://not-configured.invalid',
  SUPABASE_PUBLISHABLE_KEY || 'not-configured',
  {
    auth: {
      // On iOS and Android, localStorage comes from expo-sqlite (installed above); on web it's the browser's.
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Email and password only, so no session ever arrives in a URL.
      detectSessionInUrl: false,
    },
  },
);

// Refresh the session only while the app is in front, as Supabase recommends on phones.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
