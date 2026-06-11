'use server';

import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { getProfileAvatarUrl } from '@/lib/getProfileAvatarUrl';
import { getPrizeConfiguration } from '@/activities/pickem/prizes/actions/get-prize-configuration';

import { requirePickemCapability } from '@/activities/pickem/lib/capability-guards.server';

import { analyzeTieGroups } from '@/activities/pickem/prizes/domain/assign-prizes.helpers';
import type { FinalRankingEntry, TieGroupAnalysis } from '@/activities/pickem/prizes/domain/assign-prizes.helpers';

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
  tiedScore: boolean;
  tieResolved: boolean;
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
  award_status: 'assigned' | 'unassigned' | 'unassigned_no_eligible_winner' | 'blocked_by_tiebreaker' | 'review_required';
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
  totalPrizeDefinitions: number;
  tiebreakerGroups: Array<{
    score: number;
    participants: Array<{ profile_id: string; display_name: string | null; avatar_url: string | null }>;
    draws: Array<{ profile_id: string; draw_order: number }>;
  }>;
  pendingManualTiebreakers: Array<{
    score: number;
    participants: Array<{ profile_id: string; display_name: string | null; avatar_url: string | null }>;
    draws: Array<{ profile_id: string; draw_order: number }>;
  }>;
  pendingTiebreakerCount: number;
  maxScore: number | null;
  avgScore: number | null;
  prizesAssignedCount: number;
  eventStatus: string;
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
  requirePickemCapability('readHistoricalData');
  await requireCreator();
  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('title, description, status')
    .eq('id', eventId)
    .maybeSingle();

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
    .select('id, avatar_url')
    .in('id', podiumProfileIds);

  const podiumAvatarMap = new Map(
    (podiumProfiles ?? []).map((p) => [p.id, getProfileAvatarUrl(p as any)]),
  );

  // Sync Twitch avatars for profiles missing them (idempotent RPC)
  const podiumMissingAvatar = (podiumProfiles ?? []).filter(
    (p) => !(p as any).twitch_avatar_url && !p.avatar_url,
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
      .select('id, avatar_url')
      .in('id', podiumMissingAvatar.map((p) => p.id));
    for (const p of updatedPodium ?? []) {
      const fresh = getProfileAvatarUrl(p as any);
      if (fresh) {
        podiumAvatarMap.set(p.id, fresh);
      }
    }
  }

  const { data: allParticipants } = await supabase
    .from('event_participants')
    .select('profile_id, subscriber_verification_status')
    .eq('event_id', eventId)
    .in('profile_id', leaderboard.map((e) => e.profile_id));
  const participantSubMap = new Map(
    (allParticipants ?? []).map((p) => [p.profile_id, p.subscriber_verification_status]),
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

  const podiumEntries = leaderboard.slice(0, 3);
  const podiumScores = podiumEntries.map((e) => e.total_score);
  const tiedScoreSet = new Set<number>();
  for (let i = 0; i < podiumScores.length; i++) {
    for (let j = i + 1; j < podiumScores.length; j++) {
      if (podiumScores[i] === podiumScores[j]) {
        tiedScoreSet.add(podiumScores[i]);
        break;
      }
    }
  }

  const eventStatus = event?.status ?? '';
  const isEffectivelyCompleted = eventStatus === 'completed';
  const hasDraws = (draws ?? []).length > 0;
  const podium: PodiumEntry[] = podiumEntries.map((e) => ({
    ...e,
    avatar_url: podiumAvatarMap.get(e.profile_id) ?? null,
    tiebreaker_winner: isEffectivelyCompleted && drawMap.has(e.profile_id) && drawMap.get(e.profile_id) === 1,
    is_verified_subscriber: participantSubMap.get(e.profile_id) === 'verified_sub',
    tiedScore: tiedScoreSet.has(e.total_score),
    tieResolved: isEffectivelyCompleted && tiedScoreSet.has(e.total_score) && hasDraws,
    awards: awardsByProfile.get(e.profile_id) ?? [],
  }));

  const maxScore = leaderboard.length > 0 ? leaderboard[0].total_score : null;
  const avgScore =
    leaderboard.length > 0
      ? Math.round((leaderboard.reduce((s, e) => s + e.total_score, 0) / leaderboard.length) * 10) / 10
      : null;

  // Prize definitions via getPrizeConfiguration (uses security-definer RPC, avoids schema-cache issues)
  const prizeConfig = await getPrizeConfiguration(eventId);
  const prizeDefDefs = [
    ...prizeConfig.generalPrizes,
    ...prizeConfig.subscriberBenefits,
  ];
  const prizeDefs = prizeDefDefs.map((d: any) => ({
    ...d,
    rank_position: d.rankPosition,
    subscriber_order: d.subscriberOrder,
    sort_order: d.sortOrder,
  }));

  console.info('[pickem:completed-prizes-ui] definition count:', prizeDefs.length);

  // Awards via SECURITY DEFINER RPC (bypasses RLS that blocks direct table reads)
  const db2 = supabase as any;
  const { data: rpcAwards, error: rpcAwardsErr } = await (supabase.rpc as any)(
    'get_pickem_prize_awards',
    { p_event_id: eventId },
  );
  console.info('[pickem:awards-read]', {
    eventId,
    count: Array.isArray(rpcAwards) ? rpcAwards.length : 0,
    error: rpcAwardsErr
      ? { code: rpcAwardsErr.code, message: rpcAwardsErr.message, details: rpcAwardsErr.details, hint: rpcAwardsErr.hint }
      : null,
  });
  if (rpcAwardsErr) {
    console.error('[pickem:awards-read] RPC error', { eventId, code: rpcAwardsErr.code, message: rpcAwardsErr.message, details: rpcAwardsErr.details });
  }
  const allAwardRows: any[] = Array.isArray(rpcAwards) ? rpcAwards : [];

  const awardByDefId = new Map<string, any>();
  for (const a of allAwardRows ?? []) {
    awardByDefId.set(a.prize_definition_id, a);
  }

  const rawProfileIds = (allAwardRows ?? []).map((a: any) => a.profile_id as string | undefined).filter((id: string | undefined) => id != null) as string[];
  const profileIds = [...new Set(rawProfileIds)];
  const { data: profiles } = profileIds.length > 0
    ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', profileIds)
    : { data: [] };

  const profileNameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));

  // Load stacking policy for tie analysis
  const { data: settingsRow } = await db2
    .from('pickem_prize_settings')
    .select('stacking_policy')
    .eq('event_id', eventId)
    .maybeSingle();
  const stackingPolicy: string = settingsRow?.stacking_policy ?? 'allow_both';

  // Tiebreaker info (computed before prizeAwards since prizeAwards references tiebreakerGroups)
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
    .select('id, display_name, avatar_url')
    .in('id', allNameIds);

  const fullNameMap = new Map((allProfiles ?? []).map((p) => [p.id, p.display_name]));
  const fullAvatarMap = new Map(
    (allProfiles ?? []).map((p) => [p.id, p.avatar_url ?? null]),
  );
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
          avatar_url: fullAvatarMap.get(pid) ?? null,
        })),
        draws: uniquePids
          .filter((pid) => drawMap2.has(pid))
          .map((pid) => ({ profile_id: pid, draw_order: drawMap2.get(pid) ?? 0 })),
      };
    })
    .filter((g) => g.participants.length > 1);

  // Classify tie groups into manual (affects prizes) vs automatic (no prizes affected)
  const finalRanking: FinalRankingEntry[] = leaderboard.map((e) => ({
    rank: e.rank,
    profileId: e.profile_id,
    displayName: e.display_name,
    avatarUrl: null,
    totalScore: e.total_score,
    isVerifiedSubscriber: participantSubMap.get(e.profile_id) === 'verified_sub',
  }));
  const tieAnalysis = await analyzeTieGroups(eventId, finalRanking, prizeDefDefs, { stackingPolicy: stackingPolicy as any });
  const manualScoreSet = new Set(
    tieAnalysis.filter((g) => g.requiresManualTiebreaker).map((g) => g.score),
  );
  const prizeTiebreakerGroups = tiebreakerGroups.filter(
    (g) => manualScoreSet.has(g.score),
  );
  const pendingManualTiebreakers = prizeTiebreakerGroups.filter(
    (g) => g.participants.length !== g.draws.length,
  );
  const pendingTiebreakerCount = pendingManualTiebreakers.length;

  // Update podium entries: tiebreaker_winner is only valid when no pending ties
  if (pendingTiebreakerCount > 0) {
    for (const entry of podium) {
      entry.tiebreaker_winner = false;
    }
  }

  // Correct tieResolved for podium entries: a tie is resolved if
  // the event is completed AND (draws exist OR the tie doesn't affect prizes).
  // Non-prize ties are resolved deterministically without draws.
  if (isEffectivelyCompleted) {
    for (const entry of podium) {
      if (entry.tiedScore && !entry.tieResolved) {
        entry.tieResolved = hasDraws || !manualScoreSet.has(entry.total_score);
      }
    }
  }

  const prizeAwards: PrizeAwardEntry[] = (prizeDefs ?? []).map((d: any) => {
    const award = awardByDefId.get(d.id);
    const isGeneral = d.category === 'general_rank';
    if (!award) {
      return {
        prize_id: d.id,
        prize_label: d.title,
        prize_amount: d.amount,
        prize_currency: d.currency,
        prize_category: isGeneral ? 'general_ranking' : 'subscriber_bonus',
        prize_quantity: 1,
        eligibility_type: isGeneral ? 'all' : 'subscribers',
        profile_id: null,
        display_name: null,
        rank_achieved: null,
        award_status: (pendingTiebreakerCount > 0 ? 'blocked_by_tiebreaker' : 'unassigned') as 'blocked_by_tiebreaker' | 'unassigned',
      };
    }
    if (award.assignment_status === 'pending') {
      return {
        prize_id: d.id,
        prize_label: d.title,
        prize_amount: d.amount,
        prize_currency: d.currency,
        prize_category: isGeneral ? 'general_ranking' : 'subscriber_bonus',
        prize_quantity: 1,
        eligibility_type: isGeneral ? 'all' : 'subscribers',
        profile_id: null,
        display_name: null,
        rank_achieved: null,
        award_status: (pendingTiebreakerCount > 0 ? 'blocked_by_tiebreaker' : 'unassigned') as 'blocked_by_tiebreaker' | 'unassigned',
      };
    }
    if (award.assignment_status === 'revoked') {
      return {
        prize_id: d.id,
        prize_label: d.title,
        prize_amount: d.amount,
        prize_currency: d.currency,
        prize_category: isGeneral ? 'general_ranking' : 'subscriber_bonus',
        prize_quantity: 1,
        eligibility_type: isGeneral ? 'all' : 'subscribers',
        profile_id: null,
        display_name: null,
        rank_achieved: null,
        award_status: 'unassigned_no_eligible_winner' as const,
      };
    }
    if (award.assignment_status === 'unassigned_no_eligible_winner') {
      return {
        prize_id: d.id,
        prize_label: d.title,
        prize_amount: d.amount,
        prize_currency: d.currency,
        prize_category: isGeneral ? 'general_ranking' : 'subscriber_bonus',
        prize_quantity: 1,
        eligibility_type: isGeneral ? 'all' : 'subscribers',
        profile_id: null,
        display_name: null,
        rank_achieved: null,
        award_status: 'unassigned_no_eligible_winner' as const,
      };
    }
    return {
      prize_id: d.id,
      prize_label: d.title,
      prize_amount: d.amount,
      prize_currency: d.currency,
      prize_category: isGeneral ? 'general_ranking' : 'subscriber_bonus',
      prize_quantity: 1,
      eligibility_type: isGeneral ? 'all' : 'subscribers',
      profile_id: award.profile_id,
      display_name: award.profile_id ? (profileNameMap.get(award.profile_id) ?? null) : null,
      rank_achieved: award.awarded_rank ?? award.subscriber_rank ?? null,
      award_status: 'assigned' as const,
    };
  });

  // When event is not yet completed, hide assigned awards as blocked
  // to prevent revealing partial results while tiebreaker_pending
  if (!isEffectivelyCompleted) {
    for (const a of prizeAwards) {
      if (a.award_status === 'assigned') {
        a.award_status = 'blocked_by_tiebreaker';
      }
    }
  }

  const prizesAssignedCount = prizeAwards.filter((a) => a.award_status === 'assigned').length;

  return {
    eventId,
    eventTitle: event?.title ?? '',
    eventDescription: event?.description ?? null,
    submissionCount: submissionCount ?? 0,
    playerCount: playerCount ?? 0,
    predictionCount: predictionCount ?? 0,
    podium,
    prizeAwards,
    hasTiebreakers: prizeTiebreakerGroups.length > 0,
    totalPrizeDefinitions: (prizeDefs ?? []).length,
    tiebreakerGroups: prizeTiebreakerGroups,
    pendingManualTiebreakers,
    pendingTiebreakerCount,
    maxScore,
    avgScore,
    prizesAssignedCount,
    eventStatus,
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
  requirePickemCapability('readHistoricalData');
  await requireCreator();
  const supabase = await createServerClient();

  const leaderboard = await getRawLeaderboard(eventId);
  if (leaderboard.length === 0) return { entries: [], totalCount: 0, page, pageSize, totalPages: 0, totalSlots: 0, hasPrizes: false };

  // Only show tiebreaker winners when no pending ties remain
  const { data: draws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  const { data: eventForTies } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single();

  const eventIsCompleted = eventForTies?.status === 'completed';
  const drawWinnerSet = new Set(
    eventIsCompleted
      ? (draws ?? []).filter((d) => d.draw_order === 1).map((d) => d.profile_id)
      : [],
  );

  // Total prediction slots (correct denominator for aciertos)
  const { data: questions } = await supabase
    .from('prediction_questions')
    .select('max_selections')
    .eq('event_id', eventId)
    .eq('is_active', true);
  const totalSlots = (questions ?? []).reduce((sum, q) => sum + (q.max_selections ?? 0), 0);

  // Prize info per profile (new architecture)
  const db = supabase as any;
  const { data: prizeDefs } = await db
    .from('pickem_prize_definitions')
    .select('id, title')
    .eq('event_id', eventId)
    .eq('is_active', true);

  const hasPrizes = (prizeDefs ?? []).length > 0;
  const defIds = (prizeDefs ?? []).map((p: any) => p.id);

  const { data: awardRows } = await db
    .from('pickem_prize_awards')
    .select('prize_definition_id, profile_id')
    .in('prize_definition_id', defIds)
    .eq('assignment_status', 'assigned');

  const titleMap = new Map<string, string>((prizeDefs ?? []).map((p: any) => [p.id, p.title]));
  const prizesByProfile = new Map<string, string[]>();
  for (const a of (awardRows ?? []) as Array<{ prize_definition_id: string; profile_id: string }>) {
    const list = prizesByProfile.get(a.profile_id) ?? [];
    const title = titleMap.get(a.prize_definition_id);
    if (title) {
      list.push(title);
    }
    prizesByProfile.set(a.profile_id, list);
  }

  // Profile avatars
  const profileIds = leaderboard.map((e) => e.profile_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .in('id', profileIds);
  const avatarMap = new Map((profiles ?? []).map((p) => [p.id, getProfileAvatarUrl(p as any)]));

  // Sync Twitch avatars for profiles missing them (idempotent RPC)
  const missingAvatar = (profiles ?? []).filter((p) => !(p as any).twitch_avatar_url && !p.avatar_url);
  if (missingAvatar.length > 0) {
    for (const p of missingAvatar) {
      const { error: rpcErr } = await supabase.rpc('sync_twitch_from_auth', { profile_id: p.id });
      if (rpcErr) {
        console.error('[ranking/avatar/sync] RPC failed for', p.id, rpcErr);
      }
    }
    const { data: updatedProfiles } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', missingAvatar.map((p) => p.id));
    for (const p of updatedProfiles ?? []) {
      const fresh = getProfileAvatarUrl(p as any);
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
  requirePickemCapability('readHistoricalData');
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
  requirePickemCapability('readHistoricalData');

  const supabase = await createServerClient();

  const leaderboard = await getRawLeaderboard(eventId);
  const myEntry = leaderboard.find((e) => e.profile_id === profileId);
  if (!myEntry) return null;

  const db = supabase as any;
  const { data: prizeDefs } = await db
    .from('pickem_prize_definitions')
    .select('id, title, amount, currency, category')
    .eq('event_id', eventId)
    .eq('is_active', true);

  const defIds = (prizeDefs ?? []).map((p: any) => p.id);

  const { data: awardRows } = await db
    .from('pickem_prize_awards')
    .select('prize_definition_id')
    .in('prize_definition_id', defIds)
    .eq('profile_id', profileId)
    .eq('assignment_status', 'assigned');

  const assignedDefIds = new Set((awardRows ?? []).map((a: any) => a.prize_definition_id));
  const myPrizes = (prizeDefs ?? []).filter((p: any) => assignedDefIds.has(p.id)).map((p: any) => ({
    label: p.title,
    amount: p.amount,
    currency: p.currency,
    prize_category: p.category ?? null,
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
  const db = supabase as any;

  const { data: event } = await supabase
    .from('events')
    .select('id, status, title')
    .eq('id', eventId)
    .single();

  const { data: prizeDefs } = await db
    .from('pickem_prize_definitions')
    .select('id, category, title, description, amount, currency, rank_position, subscriber_order, sort_order')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const defIds = (prizeDefs ?? []).map((p: any) => p.id);
  const { data: awards } = await db
    .from('pickem_prize_awards')
    .select('prize_definition_id, profile_id, awarded_rank, subscriber_rank, assignment_status')
    .in('prize_definition_id', defIds.length > 0 ? defIds : ['__none__']);

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

  const awardByDefId = new Map<string, { assignment_status: string; profile_id: string | null; awarded_rank: number | null; subscriber_rank: number | null }>(
    (awards ?? []).map((a: any) => [a.prize_definition_id, a]),
  );

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
    prizes: (prizeDefs ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      rank_position: p.rank_position,
      subscriber_order: p.subscriber_order,
      amount: p.amount,
      currency: p.currency,
      sortOrder: p.sort_order,
      award_status: awardByDefId.get(p.id)?.assignment_status ?? 'unassigned',
    })),
    winners: (awards ?? [])
      .filter((a: any) => a.assignment_status === 'assigned')
      .map((a: any) => ({
        defId: a.prize_definition_id,
        profileId: a.profile_id,
        winnerName: profileNameMap.get(a.profile_id) ?? null,
        rankAchieved: a.awarded_rank ?? a.subscriber_rank ?? null,
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
    prizeCount: (prizeDefs ?? []).length,
    winnerCount: (awards ?? []).filter((a: any) => a.assignment_status === 'assigned').length,
  };
}
