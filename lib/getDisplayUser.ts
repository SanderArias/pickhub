/**
 * Unified display-name resolver for the entire app.
 * Priority:
 *   1. profile.display_name
 *   2. profile.twitch_username
 *   3. user.user_metadata.user_name
 *   4. user.user_metadata.preferred_username
 *   5. user.user_metadata.name
 *   6. email (without domain)
 *   7. "Usuario"
 */
export function getDisplayUser(
  profile: { display_name: string | null; twitch_username: string | null } | null,
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null,
  fallbackEmail?: string,
): string {
  if (profile?.display_name) return profile.display_name;
  if (profile?.twitch_username) return profile.twitch_username;

  const meta = user?.user_metadata;
  if (meta) {
    const nameVal =
      (meta.user_name as string | undefined) ??
      (meta.preferred_username as string | undefined) ??
      (meta.name as string | undefined);
    if (nameVal) return nameVal;
  }

  const email = user?.email ?? fallbackEmail;
  if (email) return email.split('@')[0];

  return 'Usuario';
}
