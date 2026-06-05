'use server';

import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';
import type { AdminNotification } from '@/types/notifications';

export async function getUserNotifications(): Promise<AdminNotification[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createServerClient();

  const { data: cp } = await supabase
    .from('creator_profiles')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!cp) return [];

  const { data: notifications } = await supabase
    .from('admin_notifications')
    .select('id, type, title, message, created_at, read_at')
    .eq('creator_profile_id', cp.id)
    .order('created_at', { ascending: false });

  return (notifications ?? []) as AdminNotification[];
}
