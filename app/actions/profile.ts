'use server';

import { createServerClient } from '@/services/supabase';
import type { User } from '@supabase/supabase-js';

type EnsureProfileResult = {
  profile: {
    id: string;
    display_name: string | null;
    role: string;
    is_active: boolean;
  } | null;
  wasCreated: boolean;
  error: string | null;
};

export async function ensureUserProfile(user: User): Promise<EnsureProfileResult> {
  const supabase = await createServerClient();

  const { data: existing, error: readError } = await (supabase as any)
    .from('profiles')
    .select('id, display_name, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (readError) {
    console.error('[ensureProfile] read error:', readError.message);
    return { profile: null, wasCreated: false, error: readError.message };
  }

  if (existing) {
    return { profile: existing, wasCreated: false, error: null };
  }

  const meta = user.user_metadata ?? {};
  const identities = user.identities ?? [];

  const twitchIdentity = identities.find((id) => id.provider === 'twitch');
  const identityData = twitchIdentity?.identity_data ?? {};

  const displayName: string | null =
    (identityData.preferred_username as string) ??
    (identityData.user_name as string) ??
    (identityData.name as string) ??
    (identityData.full_name as string) ??
    (meta.preferred_username as string) ??
    (meta.user_name as string) ??
    (meta.name as string) ??
    (meta.full_name as string) ??
    (user.email ? user.email.split('@')[0] : null) ??
    null;

  const avatarUrl: string | null =
    (identityData.avatar_url as string) ??
    (identityData.picture as string) ??
    (meta.avatar_url as string) ??
    (meta.picture as string) ??
    null;

  const twitchUsername: string | null =
    (identityData.preferred_username as string) ??
    (meta.preferred_username as string) ??
    null;

  const twitchAvatarUrl: string | null =
    (identityData.avatar_url as string) ??
    (identityData.picture as string) ??
    null;

  const { data: created, error: insertError } = await (supabase as any)
    .from('profiles')
    .upsert(
      {
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
        twitch_username: twitchUsername,
        twitch_avatar_url: twitchAvatarUrl,
        role: 'user',
        is_active: true,
      },
      { onConflict: 'id' },
    )
    .select('id, display_name, role, is_active')
    .single();

  if (insertError) {
    console.error('[ensureProfile] insert error:', insertError.message);
    return { profile: null, wasCreated: false, error: insertError.message };
  }

  const createdProfile = created as {
    id: string;
    display_name: string | null;
    role: string;
    is_active: boolean;
  } | null;

  console.log('[ensureProfile] created profile for user', user.id, 'displayName:', displayName);
  return { profile: createdProfile, wasCreated: true, error: null };
}
