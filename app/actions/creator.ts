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

export async function getCreatorPickemById(id: string) {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return null;

  const { data: prizes } = await supabase
    .from('event_prizes')
    .select('*')
    .eq('event_id', id);

  const { data: players } = await supabase
    .from('event_players')
    .select('*')
    .eq('event_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  const { data: questions } = await supabase
    .from('prediction_questions')
    .select('id, title, description, question_type, pick_type, max_selections, points_per_correct, sort_order, is_active, created_at')
    .eq('event_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  type OptionShape = { id: string; question_id: string; player_id: string | null; label: string; sort_order: number };
  let predictions: Array<Record<string, unknown> & { options: OptionShape[] }> = [];
  if (questions && questions.length > 0) {
    const questionIds = questions.map((q) => q.id);
    const { data: options } = await supabase
      .from('prediction_options')
      .select('id, question_id, player_id, label, sort_order')
      .in('question_id', questionIds)
      .order('sort_order', { ascending: true });

    const optionsByQuestion: Record<string, OptionShape[]> = {};
    for (const opt of (options ?? []) as OptionShape[]) {
      if (!optionsByQuestion[opt.question_id]) optionsByQuestion[opt.question_id] = [];
      optionsByQuestion[opt.question_id].push(opt);
    }

    predictions = questions.map((q) => ({
      ...q,
      options: optionsByQuestion[q.id] ?? [],
    }));
  }

  return { ...event, prizes: prizes ?? [], players: players ?? [], predictions };
}

export async function createPickem(formData: FormData) {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const title = (formData.get('title') as string)?.trim();
  if (!title) throw new Error('El título es obligatorio.');

  const description = (formData.get('description') as string)?.trim() || null;

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
    })
    .select('id')
    .single();

  if (eventError) throw new Error(`Error al crear evento: ${eventError.message}`);

  revalidatePath('/creator/pickems');
  redirect(`/creator/pickems/${event.id}`);
}

export async function createPredictionQuestion(eventId: string, _prev: unknown, formData: FormData) {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };

  const { count: existingCount } = await supabase
    .from('prediction_questions')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (existingCount && existingCount >= 5) {
    return { error: 'Este Pick\'em ya alcanzó el máximo de 5 predicciones.' };
  }

  const title = (formData.get('title') as string)?.trim();
  if (!title) return { error: 'El título de la predicción es obligatorio.' };

  const description = (formData.get('description') as string)?.trim() || null;
  const questionType = formData.get('question_type') as string;
  const pickType = formData.get('pick_type') as string;

  if (!['single', 'multiple'].includes(questionType)) {
    return { error: 'Tipo de pregunta inválido.' };
  }

  if (!['player', 'custom'].includes(pickType)) {
    return { error: 'Tipo de selección inválido.' };
  }

  const maxSelections = parseInt(formData.get('max_selections') as string, 10);
  if (isNaN(maxSelections) || maxSelections < 1) {
    return { error: 'El número máximo de selecciones debe ser al menos 1.' };
  }

  if (questionType === 'single' && maxSelections !== 1) {
    return { error: 'Para preguntas de tipo single, max_selections debe ser 1.' };
  }

  if (questionType === 'multiple' && maxSelections < 2) {
    return { error: 'Para preguntas de tipo multiple, max_selections debe ser mayor a 1.' };
  }

  const pointsPerCorrect = parseInt(formData.get('points_per_correct') as string, 10);
  if (isNaN(pointsPerCorrect) || pointsPerCorrect < 1) {
    return { error: 'Los puntos por acierto deben ser al menos 1.' };
  }

  const { data: question, error: qErr } = await supabase
    .from('prediction_questions')
    .insert({
      event_id: eventId,
      title,
      description,
      question_type: questionType,
      pick_type: pickType,
      max_selections: maxSelections,
      points_per_correct: pointsPerCorrect,
    })
    .select('id')
    .single();

  if (qErr) return { error: `Error al crear predicción: ${qErr.message}` };

  let options: { question_id: string; player_id?: string; label: string }[] = [];

  if (pickType === 'player') {
    const { data: activePlayers } = await supabase
      .from('event_players')
      .select('id, name')
      .eq('event_id', eventId)
      .eq('is_active', true);

    if (!activePlayers || activePlayers.length === 0) {
      await supabase.from('prediction_questions').delete().eq('id', question.id);
      return { error: 'Debe existir al menos un jugador activo en el evento.' };
    }

    options = activePlayers.map((p) => ({
      question_id: question.id,
      player_id: p.id,
      label: p.name,
    }));
  } else {
    const customRaw = formData.get('custom_options') as string;
    const labels = customRaw
      ?.split('\n')
      .map((l) => l.trim())
      .filter(Boolean) ?? [];

    if (labels.length < 2) {
      await supabase.from('prediction_questions').delete().eq('id', question.id);
      return { error: 'Debes escribir al menos 2 opciones personalizadas (una por línea).' };
    }

    options = labels.map((label) => ({
      question_id: question.id,
      label,
    }));
  }

  const { error: oErr } = await supabase.from('prediction_options').insert(options);

  if (oErr) {
    await supabase.from('prediction_questions').delete().eq('id', question.id);
    return { error: `Error al crear opciones: ${oErr.message}` };
  }

  revalidatePath(`/creator/pickems/${eventId}`);
  return { error: null };
}

export async function createEventPlayer(eventId: string, _prev: unknown, formData: FormData) {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const name = (formData.get('name') as string)?.trim();
  if (!name) throw new Error('El nombre del jugador es obligatorio.');

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) throw new Error('Evento no encontrado.');

  const { error } = await supabase.from('event_players').insert({
    event_id: eventId,
    name,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'Este jugador ya existe en el evento.' };
    }
    return { error: `Error al crear jugador: ${error.message}` };
  }

  revalidatePath(`/creator/pickems/${eventId}`);
  return { error: null };
}

export async function deleteEventPlayer(eventId: string, playerId: string) {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) throw new Error('Evento no encontrado.');

  const { error } = await supabase
    .from('event_players')
    .delete()
    .eq('id', playerId)
    .eq('event_id', eventId);

  if (error) throw new Error(`Error al eliminar jugador: ${error.message}`);

  revalidatePath(`/creator/pickems/${eventId}`);
}
