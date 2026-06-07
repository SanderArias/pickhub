'use server';

import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';
import {
  type TwitchVerificationStatus,
  type CreatorTwitchConnection,
  isSubscriberVerificationActive,
} from '@/lib/twitch';
import { getTwitchAccountInfo } from '@/lib/getTwitchAccountInfo';

export async function getCreatorTwitchVerificationStatus(): Promise<{
  status: TwitchVerificationStatus;
}> {
  const user = await getUser();
  if (!user) {
    return { status: 'inactive' };
  }

  const supabase = await createServerClient();

  const { data: connection, error } = await supabase
    .from('creator_twitch_connections')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching Twitch connection:', error.message);
    return { status: 'error' };
  }

  return {
    status: isSubscriberVerificationActive(
      connection as CreatorTwitchConnection | null,
    )
      ? 'active'
      : 'inactive',
  };
}

export async function checkParticipantTwitchStatus(): Promise<'connected' | 'not_connected'> {
  const user = await getUser();
  if (!user) return 'not_connected';

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('twitch_username, twitch_id, twitch_avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const info = getTwitchAccountInfo(profile, user);
  return info.isConnected ? 'connected' : 'not_connected';
}
