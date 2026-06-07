'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { checkPickemCapability } from '../lib/capability-guards.server';
import { pickemRoutes } from '../routes';

export async function publishPickem(eventId: string): Promise<{ error: string | null }> {
  const pubErr = checkPickemCapability('publish');
  if (pubErr) return { error: pubErr };
  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, status, title, ends_at')
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

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null };
}

export async function closePredictions(eventId: string): Promise<{ error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

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

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null };
}
