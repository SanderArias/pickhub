'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';

export async function getCreatorProfile() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const { data } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle();

  return data;
}

export async function createCreatorProfile(formData: FormData) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const handle = formData.get('handle') as string;
  const bio = (formData.get('bio') as string) || null;

  if (!handle || handle.trim().length === 0) {
    throw new Error('El handle es obligatorio');
  }

  if (!/^[a-zA-Z0-9_]{3,}$/.test(handle.trim())) {
    throw new Error(
      'El handle debe tener al menos 3 caracteres y solo puede contener letras, números y guiones bajos',
    );
  }

  const supabase = await createServerClient();

  const { error: rpcError } = await supabase.rpc('create_creator_profile', {
    p_profile_id: user.id,
    p_handle: handle.trim(),
    p_bio: bio ?? undefined,
  });

  if (rpcError) {
    if (rpcError.code === '23505' || rpcError.message?.includes('duplicate key')) {
      throw new Error('Este handle ya está en uso');
    }
    if (rpcError.code === '23503') {
      throw new Error(
        'No se encontró tu perfil de usuario. Intenta cerrar sesión y volver a iniciarla.',
      );
    }
    throw new Error(`Error al crear el perfil: ${rpcError.message} (código: ${rpcError.code})`);
  }

  redirect('/inicio');
}

export async function requestCreatorAccess(): Promise<{ error: string | null }> {
  const user = await getUser();
  if (!user) return { error: 'Debes iniciar sesión.' };

  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('creator_profiles')
    .select('id, status')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (existing && existing.status !== 'reopened') {
    return { error: 'Ya tienes una solicitud de acceso.' };
  }

  if (existing && existing.status === 'reopened') {
    const { error: updateErr } = await supabase
      .from('creator_profiles')
      .update({ status: 'pending' })
      .eq('id', existing.id);

    if (updateErr) return { error: `Error al reactivar solicitud: ${updateErr.message}` };

    revalidatePath('/inicio');
    return { error: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const base = (profile?.display_name || user.email?.split('@')[0] || 'creador')
    .toLowerCase()
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20);

  const suffix = Math.random().toString(36).slice(2, 6);
  const handle = `${base}_${suffix}`;

  const { error: rpcError } = await supabase.rpc('create_creator_profile', {
    p_profile_id: user.id,
    p_handle: handle,
    p_bio: undefined,
  });

  if (rpcError) return { error: `Error al solicitar acceso: ${rpcError.message}` };

  revalidatePath('/inicio');
  return { error: null };
}
