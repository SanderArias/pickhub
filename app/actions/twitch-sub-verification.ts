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

  const status = getTwitchVerificationStatus(connection as CreatorTwitchConnection);

  return {
    connected: true as const,
    enabled: isSubscriberVerificationActive(connection as CreatorTwitchConnection),
    status,
    twitchUsername: connection.twitch_username,
    twitchAvatarUrl: connection.twitch_avatar_url,
    scopes: connection.scopes,
    authorizedAt: connection.authorized_at,
    twitchUserId: connection.twitch_user_id,
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
