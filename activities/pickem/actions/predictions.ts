'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { checkPickemCapability } from '../lib/capability-guards.server';
import { pickemRoutes } from '../routes';
import type { Json } from '@/types/database.types';

export async function createPredictionQuestion(eventId: string, _prev: unknown, formData: FormData): Promise<{ error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

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
      config: config as Json,
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

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null };
}

export async function updatePredictionQuestion(questionId: string, eventId: string, _prev: unknown, formData: FormData): Promise<{ error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

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

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null };
}

export async function deletePredictionQuestion(questionId: string): Promise<{ error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: question } = await supabase
    .from('prediction_questions')
    .select('event_id')
    .eq('id', questionId)
    .single();

  if (!question) return { error: 'Predicción no encontrada.' };

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

  revalidatePath(pickemRoutes.creator.detail(question.event_id));
  return { error: null };
}
