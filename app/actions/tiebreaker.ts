'use server';

import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';
import { checkPickemCapability } from '@/activities/pickem/lib/capability-guards.server';

export interface TieGroup {
  score: number;
  participants: {
    profile_id: string;
    display_name: string | null;
  }[];
}

export interface TiebreakerDraw {
  profile_id: string;
  draw_order: number;
}

export async function getTieGroups(eventId: string): Promise<TieGroup[]> {
  const supabase = await createServerClient();

  const { data: scores } = await supabase
    .from('submissions')
    .select('total_score, participant_id')
    .eq('event_id', eventId)
    .eq('status', 'scored');

  if (!scores || scores.length === 0) return [];

  // Group by total_score, find groups with 2+ participants
  const groups = new Map<number, string[]>();
  for (const s of scores) {
    if (s.total_score === null || s.total_score === undefined) continue;
    const list = groups.get(s.total_score) ?? [];
    list.push(s.participant_id);
    groups.set(s.total_score, list);
  }

  const tieGroups: { score: number; participantIds: string[] }[] = [];
  for (const [score, participantIds] of groups) {
    if (participantIds.length > 1) {
      tieGroups.push({ score, participantIds });
    }
  }

  if (tieGroups.length === 0) return [];

  // Fetch display names
  const allParticipantIds = tieGroups.flatMap((g) => g.participantIds);
  const { data: participants } = await supabase
    .from('event_participants')
    .select('id, profile_id')
    .in('id', allParticipantIds);

  const profileIds = [...new Set((participants ?? []).map((p) => p.profile_id))];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', profileIds);

  const profileNameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const participantProfileMap = new Map((participants ?? []).map((p) => [p.id, p.profile_id]));

  return tieGroups.map((g) => ({
    score: g.score,
    participants: g.participantIds.map((pid) => {
      const profId = participantProfileMap.get(pid) ?? '';
      return {
        profile_id: profId,
        display_name: profileNameMap.get(profId) ?? null,
      };
    }),
  }));
}

export async function getTiebreakerDraws(eventId: string): Promise<Record<string, number>> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  const map: Record<string, number> = {};
  for (const d of data ?? []) {
    map[d.profile_id] = d.draw_order;
  }
  return map;
}

export async function performTiebreaker(
  eventId: string,
  score: number,
): Promise<{ error: string | null; draws: TiebreakerDraw[] | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr, draws: null };

  const user = await getUser();
  if (!user) return { error: 'Debes iniciar sesión.', draws: null };

  const supabase = await createServerClient();

  // Verify user is the creator of this event
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();

  if (!event) return { error: 'Evento no encontrado.', draws: null };

  // Find tied participants for this score
  const { data: submissions } = await supabase
    .from('submissions')
    .select('participant_id')
    .eq('event_id', eventId)
    .eq('status', 'scored')
    .eq('total_score', score);

  if (!submissions || submissions.length < 2) {
    return { error: 'No hay suficientes participantes empatados.', draws: null };
  }

  const participantIds = submissions.map((s) => s.participant_id);

  const { data: participants } = await supabase
    .from('event_participants')
    .select('id, profile_id')
    .in('id', participantIds);

  if (!participants || participants.length < 2) {
    return { error: 'No hay suficientes participantes empatados.', draws: null };
  }

  // Check if draws already exist for this event+score group (idempotent)
  const profileIds = participants.map((p) => p.profile_id);
  const { data: existingDraws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId)
    .in('profile_id', profileIds);

  if (existingDraws && existingDraws.length > 0) {
    // All participants already have draws — return existing result
    if (existingDraws.length === profileIds.length) {
      return { error: null, draws: existingDraws };
    }
    // Inconsistent state: only some participants have draws — admin must resolve
    return { error: 'El desempate tiene un estado inconsistente. Contacta al administrador.', draws: null };
  }

  // Fisher-Yates shuffle
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Insert shuffled order
  const rows = shuffled.map((p, i) => ({
    event_id: eventId,
    profile_id: p.profile_id,
    draw_order: i + 1,
  }));

  const { error: insErr } = await supabase
    .from('tiebreaker_draws')
    .insert(rows);

  if (insErr) return { error: `Error al guardar sorteo: ${insErr.message}`, draws: null };

  // After successful draw, check if all tiebreakers are resolved and auto-finalize
  try {
    const { finalizeEventAfterTiebreakers } = await import('./scoring');
    const result = await finalizeEventAfterTiebreakers(eventId);
    if (result.error) {
      console.error('[performTiebreaker] auto-finalization warning:', result.error);
    }
  } catch (e) {
    console.error('[performTiebreaker] auto-finalization error:', e);
  }

  return {
    error: null,
    draws: rows.map((r) => ({ profile_id: r.profile_id, draw_order: r.draw_order })),
  };
}
