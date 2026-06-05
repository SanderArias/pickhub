import { redirect } from 'next/navigation';
import { createServerClient } from '@/services/supabase';
import { getUser } from '@/app/actions/auth';

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
