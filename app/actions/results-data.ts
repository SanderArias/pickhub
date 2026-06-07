'use server';

import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { getProfileAvatarUrl } from '@/lib/getProfileAvatarUrl';
import type { LegacyMigrationStatus } from '@/lib/legacy-prizes';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PodiumEntry {
  rank: number;
  profile_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_score: number;
  correct_answers: number;
  total_questions: number;
  tiebreaker_winner: boolean;
  is_verified_subscriber: boolean;
  awards: Array<{
    prize_id: string;
    category: string;
    label: string;
    value_label: string | null;
  }>;
}

export interface PrizeAwardEntry {
  prize_id: string;
  prize_label: string;
  prize_amount: number | null;
  prize_currency: string | null;
  prize_category: string | null;
  prize_quantity: number;
  eligibility_type: string;
  profile_id: string | null;
  display_name: string | null;
  rank_achieved: number | null;
  award_status: 'assigned' | 'unassigned' | 'partial' | 'blocked_by_tiebreaker' | 'pending_migration' | 'review_required' | 'migration_failed';
  migration_status?: LegacyMigrationStatus;
}

export interface CompletedSummary {
  eventId: string;
  eventTitle: string;
  eventDescription: string | null;
  submissionCount: number;
  playerCount: number;
  predictionCount: number;
  podium: PodiumEntry[];
  prizeAwards: PrizeAwardEntry[];
  hasTiebreakers: boolean;
  tiebreakerGroups: Array<{
    score: number;
    participants: Array<{ profile_id: string; display_name: string | null }>;
    draws: Array<{ profile_id: string; draw_order: number }>;
  }>;
  maxScore: number | null;
  avgScore: number | null;
  prizesAssignedCount: number;
  legacyMigrationStatus: LegacyMigrationStatus;
  hasLegacyPrizes: boolean;
}

export interface RankingEntry {
  rank: number;
  profile_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_score: number;
  correct_answers: number;
  total_questions: number;
  prizes: string[];
  is_tiebreaker_winner: boolean;
  is_verified_subscriber: boolean;
}

export interface PaginatedRanking {
  entries: RankingEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalSlots: number;
  hasPrizes: boolean;
}

export interface OfficialResultEntry {
  position: number;
  player_name: string;
  country_code: string | null;
  seed: number | null;
  image_url: string | null;
}

/* ------------------------------------------------------------------ */
/*  assignEventPrizes — explicit action to persist prize assignments   */
/*  Only called from publishResultsAndCalculateScores or backfill.     */
/* ------------------------------------------------------------------ */

export type PrizeAssignmentResult =
  | { success: true; assignedCount: number }
  | {
      success: false;
      errorMessage: string;
      errorCode: string | null;
      errorDetails: string | null;
      errorHint: string | null;
      operation: string;
    };

export async function assignEventPrizes(eventId: string, awardRows: Array<{ event_prize_id: string; profile_id: string; rank_achieved: number }>): Promise<PrizeAssignmentResult> {
  const supabase = await createServerClient();

  if (awardRows.length === 0) return { success: true, assignedCount: 0 };

  const { error } = await supabase.from('prize_winners').upsert(awardRows, {
    onConflict: 'event_prize_id,profile_id',
  });

  if (error) {
    console.error('[assignEventPrizes] upsert failed', {
      message: error.message ?? null,
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
      eventId,
      awardCount: awardRows.length,
    });
    return {
      success: false,
      errorMessage: error.message ?? 'Error desconocido al asignar premios.',
      errorCode: error.code ?? null,
      errorDetails: error.details ?? null,
      errorHint: error.hint ?? null,
      operation: 'prize_winners_upsert',
    };
  }

  return { success: true, assignedCount: awardRows.length };
}

/* ------------------------------------------------------------------ */
/*  Raw leaderboard (internal)                                        */
/* ------------------------------------------------------------------ */

async function getRawLeaderboard(eventId: string) {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc('get_event_leaderboard', { p_event_id: eventId });
  const entries = (data ?? []) as Array<{
    rank: number;
    profile_id: string;
    display_name: string | null;
    total_score: number;
    correct_answers: number;
    total_questions: number;
  }>;
  if (entries.length === 0) return [];

  const { data: draws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  if (!draws || draws.length === 0) return entries;

  const drawMap = new Map(draws.map((d) => [d.profile_id, d.draw_order]));
  const byScore = new Map<number, typeof entries>();
  for (const e of entries) {
    const g = byScore.get(e.total_score) ?? [];
    g.push(e);
    byScore.set(e.total_score, g);
  }

  const reordered: typeof entries = [];
  for (const score of [...byScore.keys()].sort((a, b) => b - a)) {
    const group = byScore.get(score)!;
    const hasDraws = group.some((e) => drawMap.has(e.profile_id));
    if (hasDraws) {
      group.sort((a, b) => (drawMap.get(a.profile_id) ?? 999) - (drawMap.get(b.profile_id) ?? 999));
    }
    reordered.push(...group);
  }
  reordered.forEach((e, i) => { e.rank = i + 1; });
  return reordered;
}

/* ------------------------------------------------------------------ */
/*  getCompletedSummary                                                */
/* ------------------------------------------------------------------ */

export async function getCompletedSummary(eventId: string): Promise<CompletedSummary> {
  await requireCreator();
  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('title, description, prize_stacking_policy, status')
    .eq('id', eventId)
    .single();

  const { count: submissionCount } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'scored');

  const { count: playerCount } = await supabase
    .from('event_players')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('is_active', true);

  const { count: predictionCount } = await supabase
    .from('prediction_questions')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('is_active', true);

  const leaderboard = await getRawLeaderboard(eventId);

  const { data: draws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  const drawMap = new Map((draws ?? []).map((d) => [d.profile_id, d.draw_order]));

  // Fetch profile avatars and subscriber status for podium
  const podiumProfileIds = leaderboard.slice(0, 3).map((e) => e.profile_id);
  const { data: podiumProfiles } = await supabase
    .from('profiles')
    .select('id, avatar_url, twitch_avatar_url')
    .in('id', podiumProfileIds);

  const podiumAvatarMap = new Map(
    (podiumProfiles ?? []).map((p) => [p.id, getProfileAvatarUrl(p)]),
  );

  // Sync Twitch avatars for profiles missing them (idempotent RPC)
  const podiumMissingAvatar = (podiumProfiles ?? []).filter(
    (p) => !p.twitch_avatar_url && !p.avatar_url,
  );
  if (podiumMissingAvatar.length > 0) {
    for (const p of podiumMissingAvatar) {
      const { error: rpcErr } = await supabase.rpc('sync_twitch_from_auth', { profile_id: p.id });
      if (rpcErr) {
        console.error('[podium/avatar/sync] RPC failed for', p.id, rpcErr);
      }
    }
    const { data: updatedPodium } = await supabase
      .from('profiles')
      .select('id, avatar_url, twitch_avatar_url')
      .in('id', podiumMissingAvatar.map((p) => p.id));
    for (const p of updatedPodium ?? []) {
      const fresh = getProfileAvatarUrl(p);
      if (fresh) {
        podiumAvatarMap.set(p.id, fresh);
      }
    }
  }

  const { data: podiumParticipants } = await supabase
    .from('event_participants')
    .select('profile_id, subscriber_verification_status')
    .eq('event_id', eventId)
    .in('profile_id', podiumProfileIds);
  const podiumSubMap = new Map(
    (podiumParticipants ?? []).map((p) => [p.profile_id, p.subscriber_verification_status]),
  );

  // Map awards to podium participants
  const { data: podiumAwards } = await supabase
    .from('prize_winners')
    .select('event_prize_id, profile_id')
    .in('profile_id', podiumProfileIds);

  const { data: podiumPrizeDefs } = await supabase
    .from('event_prizes')
    .select('id, label, amount, currency, prize_category')
    .eq('event_id', eventId);

  const prizeById = new Map((podiumPrizeDefs ?? []).map((p) => [p.id, p]));
  const awardsByProfile = new Map<string, PodiumEntry['awards']>();
  for (const a of podiumAwards ?? []) {
    const p = prizeById.get(a.event_prize_id);
    if (!p) continue;
    const list = awardsByProfile.get(a.profile_id) ?? [];
    list.push({
      prize_id: a.event_prize_id,
      category: p.prize_category ?? 'general_ranking',
      label: p.label,
      value_label: p.amount !== null ? `${p.amount.toLocaleString('es-ES')} ${p.currency ?? 'USD'}` : null,
    });
    awardsByProfile.set(a.profile_id, list);
  }

  const podium: PodiumEntry[] = leaderboard.slice(0, 3).map((e) => ({
    ...e,
    avatar_url: podiumAvatarMap.get(e.profile_id) ?? null,
    tiebreaker_winner: drawMap.has(e.profile_id) && drawMap.get(e.profile_id) === 1,
    is_verified_subscriber: podiumSubMap.get(e.profile_id) === 'verified_sub',
    awards: awardsByProfile.get(e.profile_id) ?? [],
  }));

  const maxScore = leaderboard.length > 0 ? leaderboard[0].total_score : null;
  const avgScore =
    leaderboard.length > 0
      ? Math.round((leaderboard.reduce((s, e) => s + e.total_score, 0) / leaderboard.length) * 10) / 10
      : null;

  // Prize awards
  const { data: prizes } = await supabase
    .from('event_prizes')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });

  const { data: awardRows } = await supabase
    .from('prize_winners')
    .select('event_prize_id, profile_id, rank_achieved')
    .in('event_prize_id', (prizes ?? []).map((p) => p.id));

  // [diag] prize state
  console.log('[diag/prizes]', JSON.stringify({
    eventStatus: event?.status,
    prizeCount: (prizes ?? []).length,
    prizes: (prizes ?? []).map(p => ({ id: p.id, label: p.label, category: p.prize_category, qty: p.quantity })),
    awardRowCount: (awardRows ?? []).length,
    awardRows: (awardRows ?? []).map(a => ({ prizeId: a.event_prize_id, profileId: a.profile_id, rank: a.rank_achieved })),
  }));

  const awardByPrize = new Map<string, typeof awardRows>();
  for (const a of awardRows ?? []) {
    const list = awardByPrize.get(a.event_prize_id) ?? [];
    list.push(a);
    awardByPrize.set(a.event_prize_id, list);
  }

  const profileIds = [...new Set((awardRows ?? []).map((a) => a.profile_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', profileIds);

  const profileNameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const { isLegacyPrize, getMigrationStatus } = await import('@/lib/legacy-prizes');

  const prizeAwards: PrizeAwardEntry[] = (prizes ?? []).map((p) => {
    const assignedAwards = awardByPrize.get(p.id) ?? [];
    const isLegacy = isLegacyPrize(p);

    // Legacy prizes with no assignments should show pending_migration
    if (assignedAwards.length === 0) {
      if (isLegacy) {
        return {
          prize_id: p.id,
          prize_label: p.label,
          prize_amount: p.amount,
          prize_currency: p.currency,
          prize_category: p.prize_category ?? null,
          prize_quantity: p.quantity,
          eligibility_type: p.eligibility_type,
          profile_id: null,
          display_name: null,
          rank_achieved: null,
          award_status: 'pending_migration' as const,
        };
      }
      return {
        prize_id: p.id,
        prize_label: p.label,
        prize_amount: p.amount,
        prize_currency: p.currency,
        prize_category: p.prize_category ?? null,
        prize_quantity: p.quantity,
        eligibility_type: p.eligibility_type,
        profile_id: null,
        display_name: null,
        rank_achieved: null,
        award_status: 'unassigned' as const,
      };
    }
    if (assignedAwards.length < p.quantity) {
      return {
        prize_id: p.id,
        prize_label: p.label,
        prize_amount: p.amount,
        prize_currency: p.currency,
        prize_category: p.prize_category ?? null,
        prize_quantity: p.quantity,
        eligibility_type: p.eligibility_type,
        profile_id: assignedAwards[0].profile_id,
        display_name: profileNameMap.get(assignedAwards[0].profile_id) ?? null,
        rank_achieved: assignedAwards[0].rank_achieved,
        award_status: 'partial' as const,
      };
    }
    return {
      prize_id: p.id,
      prize_label: p.label,
      prize_amount: p.amount,
      prize_currency: p.currency,
      prize_category: p.prize_category ?? null,
      prize_quantity: p.quantity,
      eligibility_type: p.eligibility_type,
      profile_id: assignedAwards[0].profile_id,
      display_name: profileNameMap.get(assignedAwards[0].profile_id) ?? null,
      rank_achieved: assignedAwards[0].rank_achieved,
      award_status: 'assigned' as const,
    };
  });

  const prizesAssignedCount = prizeAwards.filter((a) => a.award_status === 'assigned').length;
  const hasLegacyPrizes = (prizes ?? []).some((p) => isLegacyPrize(p));
  const legacyMigrationStatus = getMigrationStatus(prizes ?? [], prizesAssignedCount);

  // Tiebreaker info
  const { data: tiebreakerDraws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  const { data: tieGroups } = await supabase
    .from('submissions')
    .select('total_score, participant_id')
    .eq('event_id', eventId)
    .eq('status', 'scored');

  const scoreGroups = new Map<number, string[]>();
  for (const s of tieGroups ?? []) {
    if (s.total_score === null) continue;
    const list = scoreGroups.get(s.total_score) ?? [];
    list.push(s.participant_id);
    scoreGroups.set(s.total_score, list);
  }

  const tiedScores = [...scoreGroups.entries()].filter(([, ids]) => ids.length > 1);
  const allTiedParticipantIds = tiedScores.flatMap(([, ids]) => ids);

  const { data: tiedParticipants } = await supabase
    .from('event_participants')
    .select('id, profile_id')
    .in('id', allTiedParticipantIds);

  const ppMap = new Map((tiedParticipants ?? []).map((p) => [p.id, p.profile_id]));
  const tiedProfileIds = [...new Set((tiedParticipants ?? []).map((p) => p.profile_id).filter(Boolean))];
  const allNameIds = [...new Set([...tiedProfileIds, ...profileIds])];
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', allNameIds);

  const fullNameMap = new Map((allProfiles ?? []).map((p) => [p.id, p.display_name]));
  const drawMap2 = new Map((tiebreakerDraws ?? []).map((d) => [d.profile_id, d.draw_order]));

  const tiebreakerGroups = tiedScores
    .map(([score, participantIds]) => {
      const pids = participantIds.map((pid) => ppMap.get(pid) ?? '').filter(Boolean);
      const uniquePids = [...new Set(pids)];
      return {
        score,
        participants: uniquePids.map((pid) => ({
          profile_id: pid,
          display_name: fullNameMap.get(pid) ?? null,
        })),
        draws: uniquePids
          .filter((pid) => drawMap2.has(pid))
          .map((pid) => ({ profile_id: pid, draw_order: drawMap2.get(pid) ?? 0 })),
      };
    })
    .filter((g) => g.participants.length > 1);

  return {
    eventId,
    eventTitle: event?.title ?? '',
    eventDescription: event?.description ?? null,
    submissionCount: submissionCount ?? 0,
    playerCount: playerCount ?? 0,
    predictionCount: predictionCount ?? 0,
    podium,
    prizeAwards,
    hasTiebreakers: tiebreakerGroups.length > 0,
    tiebreakerGroups,
    maxScore,
    avgScore,
    prizesAssignedCount,
    legacyMigrationStatus,
    hasLegacyPrizes,
  };
}

/* ------------------------------------------------------------------ */
/*  getFinalRanking                                                    */
/* ------------------------------------------------------------------ */

export async function getFinalRanking(
  eventId: string,
  page: number = 1,
  pageSize: number = 50,
  search?: string,
): Promise<PaginatedRanking> {
  await requireCreator();
  const supabase = await createServerClient();

  const leaderboard = await getRawLeaderboard(eventId);
  if (leaderboard.length === 0) return { entries: [], totalCount: 0, page, pageSize, totalPages: 0, totalSlots: 0, hasPrizes: false };

  const { data: draws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  const drawWinnerSet = new Set(
    (draws ?? []).filter((d) => d.draw_order === 1).map((d) => d.profile_id),
  );

  // Total prediction slots (correct denominator for aciertos)
  const { data: questions } = await supabase
    .from('prediction_questions')
    .select('max_selections')
    .eq('event_id', eventId)
    .eq('is_active', true);
  const totalSlots = (questions ?? []).reduce((sum, q) => sum + (q.max_selections ?? 0), 0);

  // Prize info per profile
  const { data: prizes } = await supabase
    .from('event_prizes')
    .select('id, label, amount, currency, prize_category')
    .eq('event_id', eventId);

  const hasPrizes = (prizes ?? []).length > 0;
  const prizeIds = (prizes ?? []).map((p) => p.id);

  const { data: awardRows } = await supabase
    .from('prize_winners')
    .select('event_prize_id, profile_id')
    .in('event_prize_id', prizeIds);

  const prizeMap = new Map((prizes ?? []).map((p) => [p.id, p]));
  const prizesByProfile = new Map<string, string[]>();
  for (const a of awardRows ?? []) {
    const list = prizesByProfile.get(a.profile_id) ?? [];
    const p = prizeMap.get(a.event_prize_id);
    if (p) {
      list.push(p.label);
    }
    prizesByProfile.set(a.profile_id, list);
  }

  // Profile avatars
  const profileIds = leaderboard.map((e) => e.profile_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, avatar_url, twitch_avatar_url')
    .in('id', profileIds);
  const avatarMap = new Map((profiles ?? []).map((p) => [p.id, getProfileAvatarUrl(p)]));

  // Sync Twitch avatars for profiles missing them (idempotent RPC)
  const missingAvatar = (profiles ?? []).filter((p) => !p.twitch_avatar_url && !p.avatar_url);
  if (missingAvatar.length > 0) {
    for (const p of missingAvatar) {
      const { error: rpcErr } = await supabase.rpc('sync_twitch_from_auth', { profile_id: p.id });
      if (rpcErr) {
        console.error('[ranking/avatar/sync] RPC failed for', p.id, rpcErr);
      }
    }
    const { data: updatedProfiles } = await supabase
      .from('profiles')
      .select('id, avatar_url, twitch_avatar_url')
      .in('id', missingAvatar.map((p) => p.id));
    for (const p of updatedProfiles ?? []) {
      const fresh = getProfileAvatarUrl(p);
      if (fresh) avatarMap.set(p.id, fresh);
    }
  }

  // Fetch subscriber verification status for ranking
  const { data: rankingParticipants } = await supabase
    .from('event_participants')
    .select('profile_id, subscriber_verification_status')
    .eq('event_id', eventId)
    .in('profile_id', profileIds);
  const rankingSubMap = new Map(
    (rankingParticipants ?? []).map((p) => [p.profile_id, p.subscriber_verification_status]),
  );

  // Build enriched entries
  let entries: RankingEntry[] = leaderboard.map((e) => ({
    ...e,
    avatar_url: avatarMap.get(e.profile_id) ?? null,
    prizes: prizesByProfile.get(e.profile_id) ?? [],
    is_tiebreaker_winner: drawWinnerSet.has(e.profile_id),
    is_verified_subscriber: rankingSubMap.get(e.profile_id) === 'verified_sub',
  }));

  // Search
  if (search) {
    const q = search.toLowerCase();
    entries = entries.filter((e) => (e.display_name ?? '').toLowerCase().includes(q));
  }

  const totalCount = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize;
  const paged = entries.slice(start, start + pageSize);

  return { entries: paged, totalCount, page, pageSize, totalPages, totalSlots, hasPrizes };
}

/* ------------------------------------------------------------------ */
/*  getOfficialResults                                                 */
/* ------------------------------------------------------------------ */

export async function getOfficialResults(eventId: string): Promise<OfficialResultEntry[]> {
  await requireCreator();
  const supabase = await createServerClient();

  const { data: players } = await supabase
    .from('event_players')
    .select('name, country_code, seed, image_url')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('seed', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  return (players ?? []).map((p, i) => ({
    position: i + 1,
    player_name: p.name,
    country_code: p.country_code,
    seed: p.seed,
    image_url: p.image_url,
  }));
}

/* ------------------------------------------------------------------ */
/*  getMyResult (for participant self-view)                            */
/* ------------------------------------------------------------------ */

export async function getMyResult(
  eventId: string,
  profileId: string,
): Promise<{
  rank: number | null;
  total_score: number | null;
  correct_answers: number;
  total_questions: number;
  prizes: Array<{ label: string; amount: number | null; currency: string | null; prize_category: string | null }>;
} | null> {
  const supabase = await createServerClient();

  const leaderboard = await getRawLeaderboard(eventId);
  const myEntry = leaderboard.find((e) => e.profile_id === profileId);
  if (!myEntry) return null;

  const { data: prizes } = await supabase
    .from('event_prizes')
    .select('id, label, amount, currency, prize_category')
    .eq('event_id', eventId);

  const prizeIds = (prizes ?? []).map((p) => p.id);

  const { data: awardRows } = await supabase
    .from('prize_winners')
    .select('event_prize_id')
    .in('event_prize_id', prizeIds)
    .eq('profile_id', profileId);

  const assignedPrizeIds = new Set((awardRows ?? []).map((a) => a.event_prize_id));
  const myPrizes = (prizes ?? []).filter((p) => assignedPrizeIds.has(p.id)).map((p) => ({
    label: p.label,
    amount: p.amount,
    currency: p.currency,
    prize_category: p.prize_category ?? null,
  }));

  return {
    rank: myEntry.rank,
    total_score: myEntry.total_score,
    correct_answers: myEntry.correct_answers,
    total_questions: myEntry.total_questions,
    prizes: myPrizes,
  };
}

/* ------------------------------------------------------------------ */
/*  diagnosePrizeAssignment — diagnostic tool (temporary)               */
/* ------------------------------------------------------------------ */

export async function diagnosePrizeAssignment(eventId: string) {
  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, status, title')
    .eq('id', eventId)
    .single();

  const { data: prizes } = await supabase
    .from('event_prizes')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });

  const prizeIds = (prizes ?? []).map((p: { id: string }) => p.id);
  const { data: winners } = await supabase
    .from('prize_winners')
    .select('event_prize_id, profile_id, rank_achieved')
    .in('event_prize_id', prizeIds.length > 0 ? prizeIds : ['__none__']);

  const { data: draws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  const { data: lbRaw } = await supabase.rpc('get_event_leaderboard', { p_event_id: eventId });
  const leaderboard = (lbRaw ?? []) as Array<{ rank: number; profile_id: string; display_name?: string; total_score: number }>;

  const { data: participants } = await supabase
    .from('event_participants')
    .select('profile_id, subscriber_verification_status')
    .eq('event_id', eventId)
    .in('profile_id', leaderboard.map((e: { profile_id: string }) => e.profile_id));

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', [...new Set(leaderboard.map((e: { profile_id: string }) => e.profile_id))]);

  const profileNameMap = new Map((profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]));

  const pendingTies = (() => {
    const scoreGroups = new Map<number, string[]>();
    for (const e of leaderboard) {
      const g = scoreGroups.get(e.total_score) ?? [];
      g.push(e.profile_id);
      scoreGroups.set(e.total_score, g);
    }
    const tiedScores = [...scoreGroups.entries()].filter(([, pids]) => pids.length > 1);
    return tiedScores.filter(([, pids]) => !pids.every((pid) => draws?.some((d) => d.profile_id === pid)));
  })();

  return {
    eventStatus: event?.status ?? 'unknown',
    prizes: (prizes ?? []).map((p: { id: string; label: string; prize_category: string | null; eligibility_type: string; eligible_rank_start: number; quantity: number; sort_order: number }) => ({
      id: p.id,
      label: p.label,
      category: p.prize_category,
      eligibility: p.eligibility_type,
      rankStart: p.eligible_rank_start,
      qty: p.quantity,
      sortOrder: p.sort_order,
    })),
    winners: (winners ?? []).map((w: { event_prize_id: string; profile_id: string; rank_achieved: number | null }) => ({
      prizeId: w.event_prize_id,
      profileId: w.profile_id,
      winnerName: profileNameMap.get(w.profile_id) ?? null,
      rankAchieved: w.rank_achieved,
    })),
    leaderboard: leaderboard.map((e: { rank: number; profile_id: string; total_score: number }) => ({
      rank: e.rank,
      profileId: e.profile_id,
      name: profileNameMap.get(e.profile_id) ?? null,
      score: e.total_score,
      subStatus: (participants ?? []).find((p: { profile_id: string }) => p.profile_id === e.profile_id)?.subscriber_verification_status ?? null,
    })),
    pendingTiebreakerCount: pendingTies.length,
    drawCount: draws?.length ?? 0,
    prizeCount: (prizes ?? []).length,
    winnerCount: (winners ?? []).length,
  };
}
