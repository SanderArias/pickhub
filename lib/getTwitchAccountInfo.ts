/**
 * Extracts the best available Twitch account info from profile + auth user data.
 * Checks every possible source:
 *   - profiles.twitch_username / twitch_id / twitch_avatar_url
 *   - user.user_metadata (various keys)
 *   - user.identities where provider === 'twitch'
 */
export function getTwitchAccountInfo(
  profile: { twitch_username: string | null; twitch_id: string | null; twitch_avatar_url: string | null } | null,
  user: {
    user_metadata?: Record<string, unknown>;
    identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> }>;
  } | null,
): {
  isConnected: boolean;
  username: string | null;
  avatarUrl: string | null;
  twitchId: string | null;
} {
  // 1. Check profile
  const profileUsername = profile?.twitch_username ?? null;
  const profileId = profile?.twitch_id ?? null;
  const profileAvatar = profile?.twitch_avatar_url ?? null;

  // 2. Check auth providers
  const hasTwitchProvider = checkTwitchProvider(user);

  // 3. Extract from identities
  const twitchIdentity = user?.identities?.find((id) => id.provider === 'twitch');
  const identityData = twitchIdentity?.identity_data;

  // 4. Extract from user_metadata
  const meta = user?.user_metadata;

  // Priority chain for username
  const username =
    profileUsername ??
    extractString(identityData, 'preferred_username', 'user_name', 'name', 'full_name', 'username') ??
    extractString(meta, 'preferred_username', 'user_name', 'name', 'full_name', 'username') ??
    null;

  // Priority chain for avatar
  const avatarUrl =
    profileAvatar ??
    extractString(identityData, 'avatar_url', 'picture') ??
    extractString(meta, 'avatar_url', 'picture') ??
    null;

  // Priority chain for Twitch ID
  const twitchId =
    profileId ??
    extractString(identityData, 'provider_id', 'sub') ??
    (twitchIdentity?.identity_data?.sub as string | undefined) ??
    null;

  const isConnected = hasTwitchProvider || !!profileUsername || !!profileId || !!twitchIdentity;

  return { isConnected, username, avatarUrl, twitchId };
}

function checkTwitchProvider(user: {
  app_metadata?: { provider?: string; providers?: string[] };
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }>;
} | null): boolean {
  if (!user) return false;
  const providers: string[] = (user as any).app_metadata?.providers ?? [];
  const primaryProvider: string | undefined = (user as any).app_metadata?.provider;
  if (primaryProvider === 'twitch' || providers.includes('twitch')) return true;
  if (user.identities?.some((id) => id.provider === 'twitch')) return true;
  return false;
}

function extractString(
  source: Record<string, unknown> | undefined | null,
  ...keys: string[]
): string | null {
  if (!source) return null;
  for (const key of keys) {
    const val = source[key];
    if (typeof val === 'string' && val.length > 0) return val;
  }
  return null;
}
