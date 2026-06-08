import { hasRequiredSubscriberScopes } from './twitch-scopes';

export function normalizeTwitchChannel(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let channel = trimmed;

  if (channel.startsWith('https://')) channel = channel.slice(8);
  if (channel.startsWith('http://')) channel = channel.slice(7);

  if (channel.startsWith('twitch.tv/')) channel = channel.slice(10);
  if (channel.startsWith('www.twitch.tv/')) channel = channel.slice(14);
  if (channel.startsWith('m.twitch.tv/')) channel = channel.slice(12);

  const clean = channel.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return clean || null;
}

export type TwitchVerificationStatus =
  | 'loading'
  | 'active'
  | 'inactive'
  | 'error'
  | 'reauthorization_required';

export interface CreatorTwitchConnection {
  id: string;
  profile_id: string;
  twitch_user_id: string;
  twitch_username: string | null;
  twitch_avatar_url: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  scopes: string[] | null;
  subscriber_verification_enabled: boolean;
  authorized_at: string | null;
  revoked_at: string | null;
}

export function isSubscriberVerificationActive(
  connection: CreatorTwitchConnection | null,
): boolean {
  if (!connection) return false;
  if (connection.subscriber_verification_enabled !== true) return false;
  if (!connection.twitch_user_id) return false;
  if (!connection.access_token_encrypted) return false;
  if (connection.revoked_at !== null) return false;
  if (!hasRequiredSubscriberScopes(connection.scopes)) return false;
  if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
    return Boolean(connection.refresh_token_encrypted);
  }
  return true;
}

export function getTwitchVerificationStatus(
  connection: CreatorTwitchConnection | null,
): TwitchVerificationStatus {
  if (!connection) return 'inactive';
  if (connection.revoked_at !== null) return 'inactive';
  if (!connection.access_token_encrypted) return 'inactive';
  if (!connection.subscriber_verification_enabled) return 'inactive';
  if (connection.scopes && !hasRequiredSubscriberScopes(connection.scopes)) return 'reauthorization_required';
  if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
    if (!connection.refresh_token_encrypted) return 'inactive';
  }
  return 'active';
}
