// What a username can be. The database checks the same rule (supabase/migrations/…_user_profiles.sql).

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_HINT = `${USERNAME_MIN} to ${USERNAME_MAX} letters, numbers or underscores.`;

/** As it's stored: lowercase, with no spaces around it. */
export function cleanUsername(text: string): string {
  return text.trim().toLowerCase();
}

/** What's wrong with a cleaned username, in words for the person typing it, or null if it's fine. */
export function usernameProblem(name: string): string | null {
  if (name.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters.`;
  if (!/^[a-z0-9_]+$/.test(name)) return 'Only letters, numbers and underscores.';
  return null;
}
