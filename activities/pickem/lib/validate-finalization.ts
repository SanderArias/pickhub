import { createServerClient } from '@/services/supabase';
import { analyzeTieGroups } from '@/activities/pickem/prizes/domain/assign-prizes.helpers';
import { getPrizeConfiguration } from '@/activities/pickem/prizes/actions/get-prize-configuration';
import type { FinalRankingEntry, TieGroupAnalysis } from '@/activities/pickem/prizes/domain/assign-prizes.helpers';

export interface UnresolvedManualTieGroup {
  tiedAtRank: number;
  participantProfileIds: string[];
  affectedRanks: number[];
  blockedPrizeDefinitionIds: string[];
}

export interface PickemFinalizationValidation {
  canFinalize: boolean;
  pendingAwardCount: number;
  pendingManualTiebreakerCount: number;
  unresolvedManualTieGroups: UnresolvedManualTieGroup[];
  errors: string[];
}

export async function validatePickemFinalization(
  eventId: string,
): Promise<PickemFinalizationValidation> {
  const errors: string[] = [];
  const supabase = await createServerClient();
  const db = supabase as any;

  // 1. Load event
  const { data: event } = await supabase
    .from('events')
    .select('id, status, prize_stacking_policy')
    .eq('id', eventId)
    .single();

  if (!event) {
    return {
      canFinalize: false,
      pendingAwardCount: 0,
      pendingManualTiebreakerCount: 0,
      unresolvedManualTieGroups: [],
      errors: ['Evento no encontrado.'],
    };
  }

  // 2. Load prize configuration
  const prizeConfig = await getPrizeConfiguration(eventId);
  const allDefs = [...prizeConfig.generalPrizes, ...prizeConfig.subscriberBenefits];

  // 3. Load existing awards
  const allDefIds = allDefs.map((d) => d.id);
  const { data: awardRows } = await db
    .from('pickem_prize_awards')
    .select('prize_definition_id, assignment_status, profile_id, awarded_at, awarded_rank')
    .in('prize_definition_id', allDefIds.length > 0 ? allDefIds : ['__none__']);

  const validAwards = awardRows ?? [];

  const pendingAwardCount = validAwards.filter(
    (a: any) => a.assignment_status === 'pending',
  ).length;

  // Validate award invariants
  for (const a of validAwards) {
    if (a.assignment_status === 'assigned') {
      if (!a.profile_id) {
        errors.push(`Premio ${a.prize_definition_id}: assigned sin profile_id.`);
      }
      if (!a.awarded_at) {
        errors.push(`Premio ${a.prize_definition_id}: assigned sin awarded_at.`);
      }
    }
    if (a.assignment_status === 'pending') {
      if (a.profile_id) {
        errors.push(`Premio ${a.prize_definition_id}: pending con profile_id no nulo.`);
      }
      if (a.awarded_at) {
        errors.push(`Premio ${a.prize_definition_id}: pending con awarded_at no nulo.`);
      }
    }
  }

  // Check for duplicate active awards
  const activeCounts = new Map<string, number>();
  for (const a of validAwards) {
    if (a.assignment_status === 'pending' || a.assignment_status === 'assigned') {
      activeCounts.set(a.prize_definition_id, (activeCounts.get(a.prize_definition_id) ?? 0) + 1);
    }
  }
  for (const [defId, count] of activeCounts) {
    if (count > 1) {
      errors.push(`Premio ${defId}: ${count} awards activos (duplicado).`);
    }
  }

  // 4. Load leaderboard
  const { data: lbRaw } = await supabase.rpc('get_event_leaderboard', { p_event_id: eventId });
  const lb = (lbRaw ?? []) as Array<{
    rank: number;
    profile_id: string;
    display_name: string | null;
    total_score: number;
  }>;

  // 5. Load subscriber verification
  const lbProfileIds = lb.map((e) => e.profile_id);
  const { data: eventParticipants } = await db
    .from('event_participants')
    .select('profile_id, subscriber_verification_status')
    .eq('event_id', eventId)
    .in('profile_id', lbProfileIds.length > 0 ? lbProfileIds : ['__none__']);

  const subVerificationMap = new Map(
    (eventParticipants ?? []).map((p: any) => [p.profile_id, p.subscriber_verification_status]),
  );

  // 6. Build final ranking
  let finalRanking: FinalRankingEntry[] = lb.map((e) => ({
    rank: e.rank,
    profileId: e.profile_id,
    displayName: e.display_name,
    avatarUrl: null,
    totalScore: e.total_score,
    isVerifiedSubscriber: subVerificationMap.get(e.profile_id) === 'verified_sub',
  }));

  // 7. Check for draws and apply reordering
  const { data: draws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  const drawMap = new Map((draws ?? []).map((d: any) => [d.profile_id, d.draw_order]));
  if (draws && draws.length > 0) {
    const byScore = new Map<number, FinalRankingEntry[]>();
    for (const e of finalRanking) {
      const g = byScore.get(e.totalScore) ?? [];
      g.push(e);
      byScore.set(e.totalScore, g);
    }
    const reordered: FinalRankingEntry[] = [];
    for (const score of [...byScore.keys()].sort((a, b) => b - a)) {
      const group = byScore.get(score)!;
      const hasDraws = group.some((e) => drawMap.has(e.profileId));
      if (hasDraws) {
        group.sort((a, b) => (drawMap.get(a.profileId) ?? 999) - (drawMap.get(b.profileId) ?? 999));
      }
      reordered.push(...group);
    }
    reordered.forEach((e, i) => { e.rank = i + 1; });
    finalRanking = reordered;
  }

  // 8. Analyze tie groups
  const rawTieGroups = await analyzeTieGroups(eventId, finalRanking, allDefs, prizeConfig.settings);

  const manualTieGroups = rawTieGroups.filter((g) => g.requiresManualTiebreaker);

  // 9. Find unresolved manual groups (not all participants have draws)
  const drawProfileIds = new Set<string>((draws ?? []).map((d: any) => d.profile_id));
  const unresolvedManualTieGroups: UnresolvedManualTieGroup[] = [];

  for (const g of manualTieGroups) {
    const fullyDrawn = g.participantProfileIds.every((pid) => drawProfileIds.has(pid));

    if (!fullyDrawn) {
      const blockedPrizeDefinitionIds = findBlockedPrizeDefinitionIds(
        g.affectedRanks,
        allDefs,
        finalRanking,
      );
      unresolvedManualTieGroups.push({
        tiedAtRank: g.tiedAtRank,
        participantProfileIds: g.participantProfileIds,
        affectedRanks: g.affectedRanks,
        blockedPrizeDefinitionIds,
      });
    }
  }

  const canFinalize =
    pendingAwardCount === 0 &&
    unresolvedManualTieGroups.length === 0 &&
    errors.length === 0;

  return {
    canFinalize,
    pendingAwardCount,
    pendingManualTiebreakerCount: unresolvedManualTieGroups.length,
    unresolvedManualTieGroups,
    errors,
  };
}

function findBlockedPrizeDefinitionIds(
  affectedRanks: number[],
  allDefs: Array<{ id: string; category: string; rankPosition: number | null; subscriberOrder: number | null }>,
  finalRanking: FinalRankingEntry[],
): string[] {
  const blockedIds: string[] = [];

  for (const def of allDefs) {
    if (def.category === 'general_rank' && def.rankPosition !== null) {
      if (affectedRanks.includes(def.rankPosition)) {
        blockedIds.push(def.id);
      }
    } else if (def.category === 'subscriber_benefit') {
      const verifiedSubs = finalRanking.filter((e) => e.isVerifiedSubscriber);
      const subRanks = verifiedSubs.map((e) => e.rank);
      const subRankAffected = subRanks.some((r) => affectedRanks.includes(r));
      if (subRankAffected) {
        blockedIds.push(def.id);
      }
    }
  }

  return blockedIds;
}
