'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';
import {
  type CreatorTwitchConnection,
  type TwitchVerificationStatus,
  isSubscriberVerificationActive,
  getTwitchVerificationStatus,
} from '@/lib/twitch';
import { refreshAccessToken } from '@/lib/twitch-api';
import { decrypt, encrypt } from '@/lib/twitch-crypto';

async function tryRefreshToken(
  connection: CreatorTwitchConnection,
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<'active' | 'reauthorization_required' | 'error'> {
  if (!connection.refresh_token_encrypted) return 'reauthorization_required';

  try {
    const refreshToken = decrypt(connection.refresh_token_encrypted);
    const refreshed = await refreshAccessToken(refreshToken);

    const newAccessEncrypted = encrypt(refreshed.access_token);
    const newRefreshEncrypted = refreshed.refresh_token
      ? encrypt(refreshed.refresh_token)
      : connection.refresh_token_encrypted;

    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('creator_twitch_connections')
      .update({
        access_token_encrypted: newAccessEncrypted,
        refresh_token_encrypted: newRefreshEncrypted,
        expires_at: expiresAt,
        scopes: refreshed.scope,
      })
      .eq('profile_id', connection.profile_id);

    if (updateError) return 'error';

    return 'active';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401') || msg.includes('403')) {
      return 'reauthorization_required';
    }
    return 'error';
  }
}

export async function getSubVerificationStatus() {
  const user = await getUser();
  if (!user) return { connected: false as const, enabled: false, status: 'inactive' as const };

  const supabase = await createServerClient();

  const { data: connection } = await supabase
    .from('creator_twitch_connections')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!connection) {
    return { connected: false as const, enabled: false, status: 'inactive' as const };
  }

  const c = connection as CreatorTwitchConnection;
  let status = getTwitchVerificationStatus(c);

  if (
    status === 'active' &&
    c.expires_at &&
    new Date(c.expires_at) < new Date() &&
    c.refresh_token_encrypted
  ) {
    status = await tryRefreshToken(c, supabase);
  }

  return {
    connected: true as const,
    enabled: isSubscriberVerificationActive(c),
    status,
    twitchUsername: c.twitch_username,
    twitchAvatarUrl: c.twitch_avatar_url,
    scopes: c.scopes,
    authorizedAt: c.authorized_at,
    twitchUserId: c.twitch_user_id,
  };
}

export async function disableSubVerification() {
  const user = await getUser();
  if (!user) return { error: 'No autenticado.' };

  const supabase = await createServerClient();

  const { error } = await supabase
    .from('creator_twitch_connections')
    .update({
      subscriber_verification_enabled: false,
      revoked_at: new Date().toISOString(),
    })
    .eq('profile_id', user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function enableSubVerification() {
  const user = await getUser();
  if (!user) return { error: 'No autenticado.' };

  const supabase = await createServerClient();

  const { data: connection } = await supabase
    .from('creator_twitch_connections')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!connection) {
    redirect('/auth/twitch/sub-verification');
  }

  const { error } = await supabase
    .from('creator_twitch_connections')
    .update({
      subscriber_verification_enabled: true,
      revoked_at: null,
    })
    .eq('profile_id', user.id);

  if (error) return { error: error.message };
  return { error: null };
}
