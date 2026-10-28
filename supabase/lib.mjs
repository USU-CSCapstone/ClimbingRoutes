// Shared by seed.mjs and tests/rls-check.mjs: settings from supabase/.env, and
// clients signed in as team accounts with the publishable key, like the app.
import { createClient } from "@supabase/supabase-js";

export function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in supabase/.env (see .env.example)`);
  return value;
}

/** A fresh client that keeps its session in memory only. */
export function client() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A client signed in as the account in <prefix>_EMAIL and <prefix>_PASSWORD. */
export async function signedIn(prefix) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: env(`${prefix}_EMAIL`),
    password: env(`${prefix}_PASSWORD`),
  });
  if (error) throw new Error(`Couldn't sign in as ${env(`${prefix}_EMAIL`)}: ${error.message}`);
  return { supabase, user: data.user };
}

/** Throws with the step name if a Supabase call returned an error. */
export function must(step, { data, error }) {
  if (error) throw new Error(`${step}: ${error.message}`);
  return data;
}

export const GLB_TYPE = "model/gltf-binary";
