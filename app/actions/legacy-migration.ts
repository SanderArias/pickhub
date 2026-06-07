'use server';

import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { pickemRoutes } from '@/activities/pickem/routes';
import { isLegacyPrize, normalizeLegacyPrize } from '@/lib/legacy-prizes';
import { assignPrizes } from '@/lib/prize-assignment';
import type { PrizeEligibilityType, PrizeStackingPolicy } from '@/lib/prize-types';
import { assignEventPrizes } from '@/activities/pickem/actions/results-data';

export type BackfillResult =
  | { success: true; assignedCount: number; dryRun: boolean }
  | {
      success: false;
      errorMessage: string;
      errorCode: string | null;
      errorDetails: string | null;
      errorHint: string | null;
      operation: string;
    };

export async function backfillLegacyPrizeAwards(
  eventId: string,
  options?: { dryRun?: boolean },
): Promise<BackfillResult> {
  const user = await requireCreator();

  const supabase = await createServerClient();

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, creator_id, prize_stacking_policy')
    .eq('id', eventId)
    .single();

  if (eventErr || !event) {
    return {
      success: false,
      errorMessage: 'Pick\'em no encontrado.',
      errorCode: 'EVENT_NOT_FOUND',
      errorDetails: eventErr?.message ?? null,
      errorHint: null,
      operation: 'get_event',
    };
  }

  if (event.creator_id !== user.id) {
    return {
      success: false,
      errorMessage: 'No tienes permiso para migrar premios de este Pick\'em.',
      errorCode: 'FORBIDDEN',
      errorDetails: null,
      errorHint: null,
      operation: 'authorization',
    };
  }

  const { data: prizes, error: prizesErr } = await supabase
    .from('event_prizes')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });

  if (prizesErr) {
    return {
      success: false,
      errorMessage: 'Error al obtener premios.',
      errorCode: 'PRIZES_FETCH_ERROR',
      errorDetails: prizesErr.message ?? null,
      errorHint: null,
      operation: 'get_prizes',
    };
  }

  if (!prizes || prizes.length === 0) {
    return { success: true, assignedCount: 0, dryRun: options?.dryRun ?? false };
  }

  const legacyPrizes = prizes.filter((p) => isLegacyPrize(p));
  if (legacyPrizes.length === 0) {
    return { success: true, assignedCount: 0, dryRun: options?.dryRun ?? false };
  }

  const { data: lb } = await supabase.rpc('get_event_leaderboard', { p_event_id: eventId });
  const leaderboardEntries = (lb ?? []) as Array<{ rank: number; profile_id: string; total_score: number }>;

  if (leaderboardEntries.length === 0) {
    return {
      success: true,
      assignedCount: 0,
      dryRun: options?.dryRun ?? false,
    };
  }

  const participants = leaderboardEntries.map((e) => ({
    profile_id: e.profile_id,
    rank: e.rank,
    is_verified_subscriber: false,
    is_verified_non_subscriber: false,
  }));

  const policy: PrizeStackingPolicy =
    (event.prize_stacking_policy as PrizeStackingPolicy) ?? 'single_prize_per_participant';

  const allWinners: Array<{ prize_id: string; profile_id: string; rank: number }> = [];

  for (const lp of legacyPrizes) {
    const rules = normalizeLegacyPrize(lp);

    const prizeDefs = rules.map((r) => ({
      id: `${lp.id}::${r.rank}`,
      sort_order: lp.sort_order + r.rank,
      eligibility_type: (r.category === 'subscriber_bonus' ? 'subscribers' : 'all') as PrizeEligibilityType,
      eligible_rank_start: 1,
      winner_count: 1,
    }));

    const result = assignPrizes(participants, prizeDefs, policy);

    for (const w of result.winners) {
      allWinners.push({
        prize_id: lp.id,
        profile_id: w.profile_id,
        rank: w.rank,
      });
    }
  }

  if (options?.dryRun) {
    return { success: true, assignedCount: allWinners.length, dryRun: true };
  }

  if (allWinners.length === 0) {
    return { success: true, assignedCount: 0, dryRun: false };
  }

  const rows = allWinners.map((w) => ({
    event_prize_id: w.prize_id,
    profile_id: w.profile_id,
    rank_achieved: w.rank,
  }));

  const result = await assignEventPrizes(eventId, rows);

  if (!result.success) {
    return {
      success: false,
      errorMessage: result.errorMessage,
      errorCode: result.errorCode,
      errorDetails: result.errorDetails,
      errorHint: result.errorHint,
      operation: 'assign_event_prizes',
    };
  }

  revalidatePath(pickemRoutes.api.revalidate(eventId));

  return { success: true, assignedCount: result.assignedCount, dryRun: false };
}
