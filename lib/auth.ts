import { redirect } from 'next/navigation';
import { createServerClient } from '@/services/supabase';
import { getUser } from '@/app/actions/auth';
import { getTwitchAccountInfo } from '@/lib/getTwitchAccountInfo';

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

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;

  console.log('[getCurrentProfile] user.id:', user.id);

  const supabase = await createServerClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  console.log('[getCurrentProfile] profile:', profile);
  console.log('[getCurrentProfile] profileError:', profileError);

  if (!profile) return null;

  const { data: creatorProfile, error: creatorError } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle();

  console.log('[getCurrentProfile] creatorProfile:', creatorProfile);
  console.log('[getCurrentProfile] creatorError:', creatorError);

  return { ...profile, creator_profile: creatorProfile ?? null } as Profile;
}

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
          await supabase.from('profiles').update(updates).eq('id', user.id);
        }
      }

      const { data: refreshed } = await supabase
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
  if (!profile) redirect('/login');
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
