'use server';

import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';

export async function getActivityLastSeenAt(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('creator_activity_reads')
    .select('last_seen_at')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('getActivityLastSeenAt error:', error);
    return null;
  }

  return data?.last_seen_at ?? null;
}

export async function updateActivityLastSeenAt(): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const supabase = await createServerClient();

  // Use the database's now() by reading it fresh from a known record
  const { data: existing } = await supabase
    .from('creator_activity_reads')
    .select('id, last_seen_at')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('creator_activity_reads')
      .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('profile_id', user.id);
    if (error) {
      console.error('updateActivityLastSeenAt (update) error:', error);
    }
  } else {
    const { error } = await supabase
      .from('creator_activity_reads')
      .insert({ profile_id: user.id, last_seen_at: new Date().toISOString() });
    if (error) {
      console.error('updateActivityLastSeenAt (insert) error:', error);
    }
  }
}
