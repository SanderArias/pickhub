import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/services/supabase';
import { getUser } from '@/app/actions/auth';
import { getTwitchAccountInfo } from '@/lib/getTwitchAccountInfo';
import { perf } from '@/lib/perf';

export type CreatorProfile = {
  id: string;
  profile_id: string;
  handle: string;
  bio: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'reopened';
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'creator' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  twitch_username: string | null;
  twitch_id: string | null;
  twitch_avatar_url: string | null;
  creator_profile: CreatorProfile | null;
};

export const getCurrentProfile = cache(async (
  existingUser?: Awaited<ReturnType<typeof getUser>> | null,
): Promise<Profile | null> => {
  return perf.measure('[performance:dashboard:profile]', async () => {
    const user = existingUser ?? (await getUser());
    if (!user) return null;

    const supabase = await createServerClient();

    let profileData: Record<string, unknown> | null = null;
    let profileError: unknown = null;

    const result = await (supabase as any)
      .from('profiles')
      .select('id, display_name, avatar_url, role, is_active, created_at, updated_at, twitch_username')
      .eq('id', user.id)
      .maybeSingle();

    profileData = result.data ?? null;
    profileError = result.error ?? null;

    if (!profileData) {
      console.log('[profile-debug]', {
        userId: user.id,
        hasProfile: false,
        profileErrorCode: (profileError as any)?.code ?? null,
        profileErrorMessage: (profileError as any)?.message ?? null,
      });
      return null;
    }

    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('id, profile_id, handle, bio, status, reason, created_at, updated_at')
      .eq('profile_id', user.id)
      .maybeSingle();

    return {
      id: profileData.id,
      display_name: profileData.display_name ?? null,
      avatar_url: profileData.avatar_url ?? null,
      role: profileData.role ?? 'user',
      is_active: profileData.is_active ?? true,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
      twitch_username: profileData.twitch_username ?? null,
      twitch_id: null,
      twitch_avatar_url: null,
      creator_profile: creatorProfile ?? null,
    } as Profile;
  });
});

/**
 * Determines if the user has Twitch linked by checking:
 * 1. Persisted profile (twitch_username, twitch_id)
 * 2. Supabase Auth provider metadata / identities
 *
 * Auto-syncs the profile when Twitch data is found in auth but missing from profile.
 */
export async function checkTwitchLinked(
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>,
  profile: Profile | null,
): Promise<{ hasLinkedTwitch: boolean; twitchUsername: string | null; twitchAvatarUrl: string | null }> {
  const supabase = await createServerClient();

  // 1. Gather info from all sources
  const info = getTwitchAccountInfo(profile, user);

  // 2. Auto-sync if Twitch is connected but profile is missing data
  if (info.isConnected && !profile?.twitch_username) {
    try {
      await supabase.rpc('sync_twitch_from_auth', { profile_id: user.id });

      // Also try direct upsert from identities if RPC didn't capture everything
      if (info.username || info.avatarUrl || info.twitchId) {
        const updates: Record<string, unknown> = {};
        if (info.username) updates.twitch_username = info.username;
        if (info.twitchId) updates.twitch_id = info.twitchId;
        if (info.avatarUrl) {
          updates.twitch_avatar_url = info.avatarUrl;
          updates.avatar_url = info.avatarUrl;
        }
        if (Object.keys(updates).length > 0) {
          await (supabase as any).from('profiles').update(updates).eq('id', user.id);
        }
      }

      const { data: refreshed } = await (supabase as any)
        .from('profiles')
        .select('display_name, twitch_username, twitch_id, twitch_avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (refreshed) {
        return {
          hasLinkedTwitch: true,
          twitchUsername: refreshed.twitch_username ?? info.username,
          twitchAvatarUrl: refreshed.twitch_avatar_url ?? info.avatarUrl,
        };
      }
    } catch (e) {
      console.error('[checkTwitchLinked] sync_twitch_from_auth failed:', e);
    }
  }

  return {
    hasLinkedTwitch: info.isConnected,
    twitchUsername: info.username,
    twitchAvatarUrl: info.avatarUrl,
  };
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/inicio');
  if (profile.role !== 'admin') {
    throw new Error('Acceso denegado. Se requiere rol de administrador.');
  }
  return profile;
}

export async function requireCreator(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (profile.role !== 'creator') {
    throw new Error('Acceso denegado. Se requiere rol de creador.');
  }
  if (!profile.creator_profile || profile.creator_profile.status !== 'approved') {
    throw new Error('Tu perfil de creador no ha sido aprobado aún.');
  }
  return profile;
}
