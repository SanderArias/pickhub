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
    p_bio: null,
  });

  if (rpcError) return { error: `Error al solicitar acceso: ${rpcError.message}` };

  revalidatePath('/inicio');
  return { error: null };
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

  const { data: prizes, error: prizesError } = await supabase
    .from('event_prizes')
    .select('*')
    .eq('event_id', id)
    .order('tier', { ascending: true });

  console.log('[getCreatorPickemById] Prizes query', {
    eventId: id,
    creatorId,
    prizesCount: prizes?.length ?? 0,
    prizes,
    prizesError: prizesError ? { message: prizesError.message, code: prizesError.code, details: prizesError.details } : null,
  });

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('handle, display_name, avatar_url')
    .eq('id', creatorId)
    .maybeSingle();

  const { data: players } = await supabase
    .from('event_players')
    .select('*')
    .eq('event_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  const { data: questions } = await supabase
    .from('prediction_questions')
    .select('id, title, description, question_type, pick_type, max_selections, points_per_correct, sort_order, is_active, created_at, template_type, config')
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

  return { ...event, creator: creatorProfile ?? null, prizes: prizes ?? [], players: players ?? [], predictions };
}

export async function createPickem(formData: FormData) {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const title = (formData.get('title') as string)?.trim();
  if (!title) throw new Error('El título es obligatorio.');

  const description = (formData.get('description') as string)?.trim() || null;

  const closureMode = formData.get('closure_mode') as string;
  const endsAtRaw = formData.get('ends_at') as string;
  const endsAt = closureMode === 'auto' && endsAtRaw ? new Date(endsAtRaw).toISOString() : null;

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
      ends_at: endsAt,
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
  const templateType = formData.get('template_type') as string;

  let questionType: string;
  let pickType: string;
  let maxSelections: number;
  let pointsPerCorrect: number;
  let config: Record<string, unknown> = {};

  if (templateType === 'top8_ordered') {
    if (description === null) {
      return { error: 'La descripción es obligatoria para la plantilla Top 8 ordenado.' };
    }
    questionType = 'ranking';
    pickType = 'player';
    maxSelections = 8;
    pointsPerCorrect = 1;
    config = { template: 'top8_ordered', positions: 8 };
  } else {
    const rawQuestionType = formData.get('question_type') as string;
    const rawPickType = formData.get('pick_type') as string;

    if (!['single', 'multiple'].includes(rawQuestionType)) {
      return { error: 'Tipo de pregunta inválido.' };
    }
    if (!['player', 'custom'].includes(rawPickType)) {
      return { error: 'Tipo de selección inválido.' };
    }

    questionType = rawQuestionType;
    pickType = rawPickType;

    const rawMax = parseInt(formData.get('max_selections') as string, 10);
    if (isNaN(rawMax) || rawMax < 1) {
      return { error: 'El número máximo de selecciones debe ser al menos 1.' };
    }
    if (questionType === 'single' && rawMax !== 1) {
      return { error: 'Para preguntas de tipo single, max_selections debe ser 1.' };
    }
    if (questionType === 'multiple' && rawMax < 2) {
      return { error: 'Para preguntas de tipo multiple, max_selections debe ser mayor a 1.' };
    }
    maxSelections = rawMax;

    const rawPts = parseInt(formData.get('points_per_correct') as string, 10);
    if (isNaN(rawPts) || rawPts < 1) {
      return { error: 'Los puntos por acierto deben ser al menos 1.' };
    }
    pointsPerCorrect = rawPts;
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
      template_type: templateType || null,
      config,
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

    if (templateType === 'top8_ordered' && activePlayers.length < 8) {
      await supabase.from('prediction_questions').delete().eq('id', question.id);
      return { error: 'El Top 8 ordenado necesita al menos 8 jugadores activos en el evento.' };
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

export async function deletePredictionQuestion(questionId: string): Promise<{ error: string | null }> {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: question, error: fetchErr } = await supabase
    .from('prediction_questions')
    .select('event_id')
    .eq('id', questionId)
    .single();

  if (fetchErr || !question) return { error: 'Predicción no encontrada.' };

  const { data: event } = await supabase
    .from('events')
    .select('status')
    .eq('id', question.event_id)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };

  if (event.status !== 'draft') {
    return { error: 'Solo se pueden eliminar predicciones en estado draft.' };
  }

  const { error: delErr } = await supabase
    .from('prediction_questions')
    .delete()
    .eq('id', questionId);

  if (delErr) return { error: `Error al eliminar predicción: ${delErr.message}` };

  revalidatePath(`/creator/pickems/${question.event_id}`);
  return { error: null };
}

export async function updatePredictionQuestion(questionId: string, eventId: string, _prev: unknown, formData: FormData): Promise<{ error: string | null }> {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, status, creator_id')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };
  if (event.status !== 'draft') return { error: 'Solo se pueden editar predicciones en estado draft.' };

  const { data: question } = await supabase
    .from('prediction_questions')
    .select('id, pick_type, template_type')
    .eq('id', questionId)
    .eq('event_id', eventId)
    .single();

  if (!question) return { error: 'Predicción no encontrada.' };

  const title = (formData.get('title') as string)?.trim();
  if (!title) return { error: 'El título de la predicción es obligatorio.' };

  const description = (formData.get('description') as string)?.trim() || null;

  let questionType: string;
  let pickType: string;
  let maxSelections: number;
  let pointsPerCorrect: number;

  if (question.template_type === 'top8_ordered') {
    questionType = 'ranking';
    pickType = 'player';
    maxSelections = 8;
    pointsPerCorrect = 1;
  } else {
    const rawQuestionType = formData.get('question_type') as string;
    const rawPickType = formData.get('pick_type') as string;

    if (!['single', 'multiple'].includes(rawQuestionType)) return { error: 'Tipo de pregunta inválido.' };
    if (!['player', 'custom'].includes(rawPickType)) return { error: 'Tipo de selección inválido.' };

    questionType = rawQuestionType;
    pickType = rawPickType;

    const rawMax = parseInt(formData.get('max_selections') as string, 10);
    if (isNaN(rawMax) || rawMax < 1) return { error: 'El número máximo de selecciones debe ser al menos 1.' };
    if (questionType === 'single' && rawMax !== 1) return { error: 'Para preguntas de tipo single, max_selections debe ser 1.' };
    if (questionType === 'multiple' && rawMax < 2) return { error: 'Para preguntas de tipo multiple, max_selections debe ser mayor a 1.' };
    maxSelections = rawMax;

    const rawPts = parseInt(formData.get('points_per_correct') as string, 10);
    if (isNaN(rawPts) || rawPts < 1) return { error: 'Los puntos por acierto deben ser al menos 1.' };
    pointsPerCorrect = rawPts;
  }

  const { error: uErr } = await supabase
    .from('prediction_questions')
    .update({
      title,
      description,
      question_type: questionType,
      pick_type: pickType,
      max_selections: maxSelections,
      points_per_correct: pointsPerCorrect,
    })
    .eq('id', questionId);

  if (uErr) return { error: `Error al actualizar predicción: ${uErr.message}` };

  const pickChanged = pickType !== question.pick_type;
  if (pickChanged) {
    await supabase.from('prediction_options').delete().eq('question_id', questionId);
  }

  if (pickType === 'player') {
    const { data: activePlayers } = await supabase
      .from('event_players')
      .select('id, name')
      .eq('event_id', eventId)
      .eq('is_active', true);

    if (!activePlayers || activePlayers.length === 0) {
      return { error: 'Debe existir al menos un jugador activo en el evento.' };
    }

    if (pickChanged) {
      const { error: oErr } = await supabase.from('prediction_options').insert(
        activePlayers.map((p) => ({
          question_id: questionId,
          player_id: p.id,
          label: p.name,
        }))
      );
      if (oErr) return { error: `Error al regenerar opciones: ${oErr.message}` };
    }
  } else {
    const customRaw = formData.get('custom_options') as string;
    const labels = customRaw
      ?.split('\n')
      .map((l) => l.trim())
      .filter(Boolean) ?? [];

    if (labels.length < 2) return { error: 'Debes escribir al menos 2 opciones personalizadas (una por línea).' };

    if (pickChanged) {
      const { error: oErr } = await supabase.from('prediction_options').insert(
        labels.map((label) => ({
          question_id: questionId,
          label,
        }))
      );
      if (oErr) return { error: `Error al regenerar opciones: ${oErr.message}` };
    }
  }

  revalidatePath(`/creator/pickems/${eventId}`);
  return { error: null };
}

export async function updatePickemGeneralInfo(eventId: string, _prev: unknown, formData: FormData): Promise<{ error: string | null }> {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };
  if (event.status !== 'draft') return { error: 'Solo se puede editar la información en estado draft.' };

  const title = (formData.get('title') as string)?.trim();
  if (!title) return { error: 'El título es obligatorio.' };

  const description = (formData.get('description') as string)?.trim() || null;
  const closureMode = formData.get('closure_mode') as string;

  let endsAt: string | null = null;

  if (closureMode === 'auto') {
    endsAt = formData.get('ends_at') as string;
    if (!endsAt) return { error: 'Debes seleccionar una fecha y hora para el cierre automático.' };
  }

  const { error: uErr } = await supabase
    .from('events')
    .update({
      title,
      description,
      ends_at: endsAt,
    })
    .eq('id', eventId);

  if (uErr) return { error: `Error al actualizar: ${uErr.message}` };

  revalidatePath(`/creator/pickems/${eventId}`);
  return { error: null };
}

export async function upsertEventPrize(eventId: string, _prev: unknown, formData: FormData): Promise<{ error: string | null }> {
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

  const rawTier = formData.get('tier') as string;
  const tier = (
    rawTier === 'subscribers' || rawTier === 'Suscriptores' ? 'subscriber' :
    rawTier === 'non_subscribers' || rawTier === 'No suscriptores' ? 'nonsubscriber' :
    rawTier
  );
  if (!['subscriber', 'nonsubscriber'].includes(tier)) return { error: 'Tipo de premio inválido.' };

  const label = (formData.get('label') as string)?.trim();
  if (!label) return { error: 'La etiqueta del premio es obligatoria.' };

  const description = (formData.get('description') as string)?.trim() || null;

  const amountRaw = formData.get('amount') as string;
  const amount = amountRaw?.trim() ? parseFloat(amountRaw) : null;
  if (amount !== null && (isNaN(amount) || amount < 0)) return { error: 'El monto debe ser un número válido mayor o igual a 0.' };

  const currency = (formData.get('currency') as string)?.trim() || 'USD';

  const quantityRaw = formData.get('quantity') as string;
  const quantity = parseInt(quantityRaw, 10);
  if (isNaN(quantity) || quantity < 1) return { error: 'La cantidad debe ser al menos 1.' };

  const { error: rpcErr } = await supabase.rpc('upsert_event_prize', {
    p_event_id: eventId,
    p_tier: tier,
    p_label: label,
    p_description: description,
    p_amount: amount,
    p_currency: currency,
    p_quantity: quantity,
  });

  if (rpcErr) return { error: `Error al guardar premio: ${rpcErr.message}` };

  revalidatePath(`/creator/pickems/${eventId}`);
  return { error: null };
}

export async function deleteEventPrize(eventId: string, prizeId: string): Promise<{ error: string | null }> {
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

  const { error: dErr } = await supabase
    .from('event_prizes')
    .delete()
    .eq('id', prizeId)
    .eq('event_id', eventId);

  if (dErr) return { error: `Error al eliminar premio: ${dErr.message}` };

  revalidatePath(`/creator/pickems/${eventId}`);
  return { error: null };
}

export async function publishPickem(eventId: string): Promise<{ error: string | null }> {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };
  if (event.status !== 'draft') return { error: 'El Pick\'em ya fue publicado o no está en estado borrador.' };

  if (!event.title?.trim()) return { error: 'El título es obligatorio.' };

  const { count: activePlayers } = await supabase
    .from('event_players')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (!activePlayers || activePlayers < 2) {
    return { error: 'Se requieren al menos 2 jugadores activos para publicar.' };
  }

  const { data: questions } = await supabase
    .from('prediction_questions')
    .select('id, title, prediction_options(id)')
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (!questions || questions.length < 1) {
    return { error: 'Se requiere al menos 1 predicción activa para publicar.' };
  }

  for (const q of questions) {
    const opts = q.prediction_options ?? [];
    if (opts.length < 2) {
      return { error: `La predicción "${q.title}" necesita al menos 2 opciones.` };
    }
  }

  if (event.ends_at) {
    const endsAt = new Date(event.ends_at);
    if (endsAt <= new Date()) {
      return { error: 'La fecha de cierre debe ser posterior a la actual.' };
    }
  }

  const { error: updateErr } = await supabase
    .from('events')
    .update({ status: 'open' })
    .eq('id', eventId);

  if (updateErr) return { error: `Error al publicar: ${updateErr.message}` };

  revalidatePath(`/creator/pickems/${eventId}`);
  return { error: null };
}

export async function closePredictions(eventId: string): Promise<{ error: string | null }> {
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };
  if (event.status !== 'open') return { error: 'Solo se pueden cerrar predicciones de un Pick\'em abierto.' };

  const { error: updateErr } = await supabase
    .from('events')
    .update({ status: 'predictions_closed' })
    .eq('id', eventId);

  if (updateErr) return { error: `Error al cerrar predicciones: ${updateErr.message}` };

  revalidatePath(`/creator/pickems/${eventId}`);
  return { error: null };
}
