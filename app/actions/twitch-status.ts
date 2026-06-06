'use server';

import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';
import {
  type TwitchVerificationStatus,
  type CreatorTwitchConnection,
  getTwitchVerificationStatus,
} from '@/lib/twitch';

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
    status: getTwitchVerificationStatus(
      connection as CreatorTwitchConnection | null,
    ),
  };
}
