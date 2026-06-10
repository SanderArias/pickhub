import type { PrizeDefinition, PrizeStackingPolicy } from '../types';

/* ------------------------------------------------------------------ */
/*  Exported types                                                     */
/* ------------------------------------------------------------------ */

export interface FinalRankingEntry {
  rank: number;
  profileId: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalScore: number;
  isVerifiedSubscriber: boolean;
}

export interface TieGroupAnalysis {
  score: number;
  participantProfileIds: string[];
  tiedAtRank: number;
  participantCount: number;
  affectedRanks: number[];
  requiresManualTiebreaker: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getAffectedRanksForTieGroup(tiedAtRank: number, participantCount: number): number[] {
  return Array.from({ length: participantCount }, (_, i) => tiedAtRank + i);
}

function getTargetRank(def: PrizeDefinition): number | null {
  if (def.category === 'general_rank') return def.rankPosition;
  return def.subscriberOrder;
}

function doesTieAffectGeneralPrizes(
  affectedRanks: number[],
  rewardedRanks: Set<number>,
): boolean {
  return affectedRanks.some((r) => rewardedRanks.has(r));
}

function determineAutomaticRankingRule(): 'submission_completed_at' | 'profile_id' {
  return 'submission_completed_at';
}

/* ------------------------------------------------------------------ */
/*  Analyze tie groups                                                 */
/* ------------------------------------------------------------------ */

export async function analyzeTieGroups(
  eventId: string,
  finalRanking: FinalRankingEntry[],
  definitions: PrizeDefinition[],
  settings: { stackingPolicy: PrizeStackingPolicy },
): Promise<TieGroupAnalysis[]> {
  const { createServerClient } = await import('@/services/supabase');
  const supabase = await createServerClient();

  const { data: submissions } = await supabase
    .from('submissions')
    .select('total_score, participant_id')
    .eq('event_id', eventId)
    .eq('status', 'scored');

  if (!submissions) return [];

  const scoreGroups = new Map<number, string[]>();
  for (const s of submissions) {
    if (s.total_score === null || s.total_score === undefined) continue;
    const list = scoreGroups.get(s.total_score) ?? [];
    list.push(s.participant_id);
    scoreGroups.set(s.total_score, list);
  }

  const generalRewardedRanks = new Set<number>();
  let maxSubOrder = 0;
  for (const d of definitions) {
    if (d.category === 'general_rank' && d.rankPosition !== null) {
      generalRewardedRanks.add(d.rankPosition);
    }
    if (d.category === 'subscriber_benefit' && d.subscriberOrder !== null) {
      if (d.subscriberOrder > maxSubOrder) maxSubOrder = d.subscriberOrder;
    }
  }

  const { data: participants } = await supabase
    .from('event_participants')
    .select('id, profile_id')
    .eq('event_id', eventId);

  const pidByPartic = new Map((participants ?? []).map((p) => [p.id, p.profile_id]));

  const profileRankMap = new Map(finalRanking.map((e) => [e.profileId, e.rank]));
  const profileScoreMap = new Map(finalRanking.map((e) => [e.profileId, e.totalScore]));

  const results: TieGroupAnalysis[] = [];

  for (const [score, particIds] of scoreGroups) {
    if (particIds.length < 2) continue;

    const profileIds = particIds.map((pid) => pidByPartic.get(pid) ?? '').filter(Boolean);

    const ranks = profileIds.map((pid) => profileRankMap.get(pid)).filter((r): r is number => r !== undefined);
    const tiedAtRank = ranks.length > 0 ? Math.min(...ranks) : 1;
    const affectedRanks = getAffectedRanksForTieGroup(tiedAtRank, profileIds.length);

    const affectsGeneralPrize = doesTieAffectGeneralPrizes(affectedRanks, generalRewardedRanks);

    const anySubInTie = finalRanking.some(
      (e) => profileIds.includes(e.profileId) && e.isVerifiedSubscriber,
    );
    const subBenefitsExist = maxSubOrder > 0;
    const affectsSubBenefit = anySubInTie && subBenefitsExist;

    const requiresManualTiebreaker = affectsGeneralPrize || affectsSubBenefit;

    results.push({
      score,
      participantProfileIds: profileIds,
      tiedAtRank,
      participantCount: profileIds.length,
      affectedRanks,
      requiresManualTiebreaker,
    });
  }

  return results;
}

export function isTieGroupFullyDrawn(
  tieGroup: { participantProfileIds: string[] },
  drawProfileIds: Set<string>,
): boolean {
  return tieGroup.participantProfileIds.every((profileId) => drawProfileIds.has(profileId));
}

/* ------------------------------------------------------------------ */
/*  Resolve non-prize ties deterministically                           */
/* ------------------------------------------------------------------ */

export function resolveNonPrizeTieGroupsDeterministically(
  finalRanking: FinalRankingEntry[],
  automaticTieGroups: TieGroupAnalysis[],
): FinalRankingEntry[] {
  if (automaticTieGroups.length === 0) return finalRanking;

  const rule = determineAutomaticRankingRule();

  const tieProfileSet = new Set<string>();
  for (const g of automaticTieGroups) {
    for (const pid of g.participantProfileIds) {
      tieProfileSet.add(pid);
    }
  }

  const ranking = [...finalRanking];
  const nonTied = ranking.filter((e) => !tieProfileSet.has(e.profileId));
  const tied = ranking.filter((e) => tieProfileSet.has(e.profileId));

  if (rule === 'submission_completed_at' || tied.length === 0) {
    tied.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.profileId.localeCompare(b.profileId);
    });
  }

  const reordered = [...nonTied, ...tied];
  reordered.forEach((e, i) => { e.rank = i + 1; });

  return reordered;
}
