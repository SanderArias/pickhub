'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';
import { requireCreator } from '@/lib/auth';

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
    p_bio: bio,
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

  redirect('/dashboard');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function getCreatorPickems() {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();
  const { data } = await supabase
    .from('events')
    .select('id, title, slug, description, status, event_config, created_at, updated_at')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function createPickem(formData: FormData) {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const title = (formData.get('title') as string)?.trim();
  if (!title) throw new Error('El título es obligatorio.');

  const description = (formData.get('description') as string)?.trim() || null;
  const predictionCloseAt = (formData.get('prediction_close_at') as string)?.trim() || null;
  const prizeSubscriber = (formData.get('prize_subscriber') as string)?.trim() || null;
  const prizeNonSubscriber = (formData.get('prize_non_subscriber') as string)?.trim() || null;

  const slug = slugify(title);
  if (!slug) throw new Error('El título no puede generar un slug válido.');

  const supabase = await createServerClient();

  const { data: pickemType } = await supabase
    .from('dynamic_types')
    .select('id')
    .eq('slug', 'pickem')
    .eq('is_enabled', true)
    .single();

  if (!pickemType) throw new Error('La actividad Pick\'em no está disponible.');

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      creator_id: creatorId,
      dynamic_type_id: pickemType.id,
      title,
      slug,
      description,
      status: 'draft',
      event_config: predictionCloseAt ? { prediction_close_at: predictionCloseAt } : {},
    })
    .select('id')
    .single();

  if (eventError) throw new Error(`Error al crear evento: ${eventError.message}`);

  if (prizeSubscriber) {
    const { error: psErr } = await supabase.from('event_prizes').insert({
      event_id: event.id,
      tier: 'subscriber',
      label: prizeSubscriber,
    });

    if (psErr) throw new Error(`Error al crear premio subscriber: ${psErr.message}`);
  }

  if (prizeNonSubscriber) {
    const { error: pnErr } = await supabase.from('event_prizes').insert({
      event_id: event.id,
      tier: 'nonsubscriber',
      label: prizeNonSubscriber,
    });

    if (pnErr) throw new Error(`Error al crear premio no subscriber: ${pnErr.message}`);
  }

  revalidatePath('/creator/pickems');
  redirect('/creator/pickems');
}
