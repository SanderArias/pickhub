'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { checkPickemCapability } from '../lib/capability-guards.server';
import { pickemRoutes } from '../routes';

export async function createEventPlayer(
  eventId: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ error: string | null; player?: { id: string; created_at: string } }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'El nombre del jugador es obligatorio.' };

  const countryCode = (formData.get('country_code') as string)?.trim() || null;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };

  const { data, error } = await supabase
    .from('event_players')
    .insert({ event_id: eventId, name, country_code: countryCode })
    .select('id, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'Este jugador ya existe en el evento.' };
    }
    return { error: `Error al crear jugador: ${error.message}` };
  }

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null, player: { id: data.id, created_at: data.created_at } };
}

export async function updateEventPlayerCountry(
  eventId: string,
  playerId: string,
  country: string | null,
): Promise<{ error: string | null }> {
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

  const { error } = await supabase
    .from('event_players')
    .update({ country_code: country })
    .eq('id', playerId)
    .eq('event_id', eventId);

  if (error) return { error: `Error al actualizar país: ${error.message}` };

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null };
}

export async function deleteEventPlayer(eventId: string, playerId: string) {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) throw new Error(mgmtErr);

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

  revalidatePath(pickemRoutes.creator.detail(eventId));
}
