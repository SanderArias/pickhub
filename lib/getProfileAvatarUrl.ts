/**
 * Resolves the best available avatar URL for a profile.
 *
 * Priority (matches Configuración's getTwitchAccountInfo chain):
 *   1. twitch_avatar_url  (persisted Twitch avatar, most up-to-date)
 *   2. avatar_url         (set at signup by handle_new_user trigger)
 *
 * When called via getTwitchAccountInfo (Configuración), additional sources
 * are checked: auth.identities.identity_data, user_metadata. Those extra
 * sources are only available for the current user session.
 */
export function getProfileAvatarUrl(profile: {
  twitch_avatar_url: string | null;
  avatar_url: string | null;
}): string | null {
  return profile.twitch_avatar_url ?? profile.avatar_url ?? null;
}
