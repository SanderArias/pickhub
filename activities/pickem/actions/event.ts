'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { getUser } from '@/app/actions/auth';
import { requireCreator } from '@/lib/auth';
import { normalizeTwitchChannel } from '@/lib/twitch';
import { slugify } from '../lib/validation';
import { pickemRoutes } from '../routes';
import type { EventInsert, EventUpdate } from '@/types/database-helpers';
import {
  CREATOR_EVENT_DETAIL_COLUMNS,
  EVENT_PRIZE_COLUMNS,
} from '../data/selects';

export async function getCreatorPickems() {
  requirePickemCapability('readHistoricalData');

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: events } = await supabase
    .from('events')
    .select('id, title, slug, description, status, ends_at, event_config, created_at, updated_at')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (!events || events.length === 0) return [];

  const eventIds = events.map((e) => e.id);

  const prizeCounts = new Map<string, number>();
  const { data: prizeData } = await supabase
    .from('event_prizes')
    .select('event_id')
    .in('event_id', eventIds);
  for (const p of prizeData ?? []) {
    prizeCounts.set(p.event_id, (prizeCounts.get(p.event_id) ?? 0) + 1);
  }

  const subCounts = new Map<string, number>();
  const { data: partData } = await supabase
    .from('event_participants')
    .select('event_id')
    .in('event_id', eventIds);
  for (const p of partData ?? []) {
    subCounts.set(p.event_id, (subCounts.get(p.event_id) ?? 0) + 1);
  }

  return events.map((e) => ({
    ...e,
    prizeCount: prizeCounts.get(e.id) ?? 0,
    submissionCount: subCounts.get(e.id) ?? 0,
  }));
}

export async function getCreatorPickemById(id: string) {
  requirePickemCapability('readHistoricalData');

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select(CREATOR_EVENT_DETAIL_COLUMNS)
    .eq('id', id)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return null;

  const { data: prizes } = await supabase
    .from('event_prizes')
    .select(EVENT_PRIZE_COLUMNS)
    .eq('event_id', id)
    .order('sort_order', { ascending: true });

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('handle, display_name, avatar_url')
    .eq('id', creatorId)
    .maybeSingle();

  const { data: players } = await supabase
    .from('event_players')
    .select('id, name, is_active, country_code, image_url, seed, sort_order, created_at')
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
  type QuestionShape = {
    id: string; title: string; description: string | null; question_type: string;
    pick_type: string; max_selections: number; points_per_correct: number;
    sort_order: number; is_active: boolean; created_at: string;
    template_type: string | null; config: Record<string, unknown>;
    options: OptionShape[];
  };
  let predictions: QuestionShape[] = [];
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
      ...q as Omit<QuestionShape, 'options'>,
      options: optionsByQuestion[q.id] ?? [],
    }));
  }

  const { count: submissionCount } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id);

  return { ...event, creator: creatorProfile ?? null, prizes: prizes ?? [], players: players ?? [], predictions, submissionCount: submissionCount ?? 0 };
}

import { isActivityCapabilityEnabled } from '@/activities/registry.server';
import { checkPickemCapability, requirePickemCapability } from '../lib/capability-guards.server';

export async function createPickem(formData: FormData) {
  if (!isActivityCapabilityEnabled('pickem', 'create')) {
    throw new Error('La creación de nuevos Pick\'ems está temporalmente deshabilitada.');
  }

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const title = (formData.get('title') as string)?.trim();
  if (!title) throw new Error('El título es obligatorio.');

  const description = (formData.get('description') as string)?.trim() || null;

  const closureMode = formData.get('closure_mode') as string;
  const endsAtRaw = formData.get('ends_at') as string;
  const endsAt = closureMode === 'auto' && endsAtRaw ? endsAtRaw : null;
  const predictionsCloseTimezone = closureMode === 'auto' && endsAtRaw
    ? (formData.get('predictions_close_timezone') as string) || null
    : null;

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

  const twitchRaw = formData.get('twitch_channel') as string | null;
  const twitchChannel = normalizeTwitchChannel(twitchRaw);

  const eventPayload: EventInsert = {
    creator_id: creatorId,
    dynamic_type_id: pickemType.id,
    title,
    slug,
    description,
    ends_at: endsAt,
    status: 'draft',
    twitch_channel: twitchChannel,
    predictions_close_timezone: predictionsCloseTimezone ?? undefined,
  };

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert(eventPayload)
    .select('id')
    .single();

  if (eventError) throw new Error(`Error al crear evento: ${eventError.message}`);

  revalidatePath(pickemRoutes.creator.list);
  redirect(pickemRoutes.creator.detail(event.id));
}

export async function updatePickemGeneralInfo(eventId: string, _prev: unknown, formData: FormData): Promise<{ error: string | null }> {
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
  if (event.status !== 'draft') return { error: 'Solo se puede editar la información en estado draft.' };

  const title = (formData.get('title') as string)?.trim();
  if (!title) return { error: 'El título es obligatorio.' };

  const description = (formData.get('description') as string)?.trim() || null;
  const closureMode = formData.get('closure_mode') as string;

  let endsAt: string | null = null;
  let predictionsCloseTimezone: string | null = null;

  if (closureMode === 'auto') {
    endsAt = formData.get('ends_at') as string;
    predictionsCloseTimezone = formData.get('predictions_close_timezone') as string || null;
    if (!endsAt) return { error: 'Debes seleccionar una fecha y hora para el cierre automático.' };
  }

  const twitchRaw = formData.get('twitch_channel') as string | null;
  const twitchChannel = normalizeTwitchChannel(twitchRaw);

  const updatePayload: EventUpdate = {
    title,
    description,
    ends_at: endsAt,
    twitch_channel: twitchChannel,
    predictions_close_timezone: predictionsCloseTimezone ?? undefined,
  };

  const { error: uErr } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', eventId);

  if (uErr) return { error: `Error al actualizar: ${uErr.message}` };

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null };
}

import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, extFromMime } from '../lib/validation';

export async function uploadEventLogo(
  eventId: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { url: null, error: mgmtErr };

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.', url: null };

  const file = formData.get('logo') as File | null;
  if (!file || file.size === 0) return { error: 'No se seleccionó ningún archivo.', url: null };

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: 'Formato no soportado. Usa PNG, JPG, WEBP o SVG.', url: null };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'El logo no puede superar 1 MB.', url: null };
  }

  const ext = extFromMime(file.type);
  const path = `pickems/${eventId}/logo.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('pickem-assets')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadErr) return { error: `Error al subir logo: ${uploadErr.message}`, url: null };

  const { data: publicUrl } = supabase.storage
    .from('pickem-assets')
    .getPublicUrl(path);

  const url = publicUrl?.publicUrl ?? null;

  if (url) {
    const { error: updateErr } = await supabase
      .from('events')
      .update({ logo_url: url })
      .eq('id', eventId);

    if (updateErr) return { error: `Error al guardar URL del logo: ${updateErr.message}`, url: null };
  }

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { url, error: null };
}

export async function removeEventLogo(
  eventId: string,
): Promise<{ error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, logo_url')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };

  if (event.logo_url) {
    const pathMatch = event.logo_url.match(/\/pickem-assets\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from('pickem-assets').remove([pathMatch[1]]);
    }
  }

  const { error: updateErr } = await supabase
    .from('events')
    .update({ logo_url: null })
    .eq('id', eventId);

  if (updateErr) return { error: `Error al quitar logo: ${updateErr.message}` };

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null };
}
