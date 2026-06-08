'use server';

import { createServerClient } from '@/services/supabase';
import { getPrizeConfiguration } from '../actions/get-prize-configuration';
import type { PrizeDefinition, PrizeStackingPolicy } from '../types';
import {
  analyzeTieGroups,
  resolveNonPrizeTieGroupsDeterministically,
  getAffectedRanksForTieGroup,
} from './assign-prizes.helpers';
import type { FinalRankingEntry, TieGroupAnalysis } from './assign-prizes.helpers';

export interface AssignPrizesOutput {
  assigned: number;
  pending: number;
  skipped: number;
  errors: string[];
  manualTieGroups: TieGroupAnalysis[];
  automaticTieGroups: TieGroupAnalysis[];
}

function getTargetRank(def: PrizeDefinition): number | null {
  if (def.category === 'general_rank') return def.rankPosition;
  return def.subscriberOrder;
}

export async function assignPickemPrizes(
  eventId: string,
): Promise<AssignPrizesOutput> {
  const output: AssignPrizesOutput = {
    assigned: 0,
    pending: 0,
    skipped: 0,
    errors: [],
    manualTieGroups: [],
    automaticTieGroups: [],
  };

  const supabase = await createServerClient();
  const db = supabase as any;

  // 1. Load prize configuration
  const prizeConfig = await getPrizeConfiguration(eventId);
  const allDefs = [...prizeConfig.generalPrizes, ...prizeConfig.subscriberBenefits];

  if (allDefs.length === 0) {
    output.skipped = 0;
    return output;
  }

  // 2. Load the leaderboard
  const { data: lbRaw } = await supabase.rpc('get_event_leaderboard', { p_event_id: eventId });
  const lb = (lbRaw ?? []) as Array<{
    rank: number;
    profile_id: string;
    display_name: string | null;
    total_score: number;
    correct_answers: number;
    total_questions: number;
  }>;

  // 3. Check for verified subscribers
  const lbProfileIds = lb.map((e) => e.profile_id);
  const { data: eventParticipants } = await db
    .from('event_participants')
    .select('profile_id, subscriber_verification_status')
    .eq('event_id', eventId)
    .in('profile_id', lbProfileIds);

  const subVerificationMap = new Map(
    (eventParticipants ?? []).map((p: any) => [p.profile_id, p.subscriber_verification_status]),
  );

  // 4. Build the final ranking
  let finalRanking: FinalRankingEntry[] = lb.map((e) => ({
    rank: e.rank,
    profileId: e.profile_id,
    displayName: e.display_name,
    avatarUrl: null,
    totalScore: e.total_score,
    isVerifiedSubscriber: subVerificationMap.get(e.profile_id) === 'verified_sub',
  }));

  // 5. Check for draws (tiebreakers already resolved)
  const { data: draws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  // 6. Apply draw reordering if draws exist
  if (draws && draws.length > 0) {
    const drawMap = new Map(draws.map((d) => [d.profile_id, d.draw_order]));
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

  // 7. Analyze tie groups
  const rawTieGroups = await analyzeTieGroups(eventId, finalRanking, allDefs, prizeConfig.settings);

  const manualTieGroups = rawTieGroups.filter((g) => g.requiresManualTiebreaker);
  const automaticTieGroups = rawTieGroups.filter((g) => !g.requiresManualTiebreaker);
  output.manualTieGroups = manualTieGroups;
  output.automaticTieGroups = automaticTieGroups;

  // 8. Resolve automatic ties deterministically
  finalRanking = resolveNonPrizeTieGroupsDeterministically(finalRanking, automaticTieGroups);

  // 9. Check which ranks are affected by UNRESOLVED manual ties.
  //    If all participants in a manual group already have draws, the tie is resolved
  //    and prizes should be assigned, not blocked.
  const drawMapForResolution = new Map((draws ?? []).map((d: any) => [d.profile_id, d.draw_order]));
  const unresolvedManualGroups = manualTieGroups.filter(
    (g) => !g.participantProfileIds.every((pid) => drawMapForResolution.has(pid)),
  );
  const manualAffectedRanks = new Set<number>();
  for (const g of unresolvedManualGroups) {
    for (const r of g.affectedRanks) {
      manualAffectedRanks.add(r);
    }
  }

  // 10. Load existing awards for idempotency skip
  const allDefIds = allDefs.map((d) => d.id);
  const { data: existingAwardRows } = await db
    .from('pickem_prize_awards')
    .select('prize_definition_id, assignment_status')
    .in('prize_definition_id', allDefIds.length > 0 ? allDefIds : ['__none__']);
  const assignedDefIds = new Set(
    (existingAwardRows ?? []).filter((a: any) => a.assignment_status === 'assigned').map((a: any) => a.prize_definition_id),
  );

  // 11. Build the ranking maps
  const rankingByRank = new Map<number, FinalRankingEntry>();
  for (const e of finalRanking) {
    rankingByRank.set(e.rank, e);
  }

  const rankingByProfile = new Map<string, FinalRankingEntry>();
  for (const e of finalRanking) {
    rankingByProfile.set(e.profileId, e);
  }

  // 12. Process each definition
  for (const def of allDefs) {
    const targetRank = getTargetRank(def);
    if (targetRank === null) continue;

    // Idempotency: skip if already assigned
    if (assignedDefIds.has(def.id)) {
      output.assigned++;
      continue;
    }

    try {
      if (def.category === 'general_rank') {
        await assignGeneralPrize(
          db, eventId, def, targetRank,
          rankingByRank, manualAffectedRanks, output,
        );
      } else {
        await assignSubscriberBenefit(
          supabase, db, eventId, def, targetRank,
          finalRanking, rankingByProfile, manualAffectedRanks,
          prizeConfig.settings.stackingPolicy, output,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      output.errors.push(`[${def.id}] ${msg}`);
    }
  }

  console.info('[pickem:prize-assignment]', {
    eventId,
    definitionCount: allDefs.length,
    finalRankingCount: finalRanking.length,
    manualTieCount: unresolvedManualGroups.length,
    automaticTieCount: automaticTieGroups.length,
    assigned: output.assigned,
    pending: output.pending,
    skipped: output.skipped,
    errorCount: output.errors.length,
  });

  return output;
}

/* ------------------------------------------------------------------ */
/*  General prize assignment                                           */
/* ------------------------------------------------------------------ */

async function assignGeneralPrize(
  db: any,
  eventId: string,
  def: PrizeDefinition,
  targetRank: number,
  rankingByRank: Map<number, FinalRankingEntry>,
  manualAffectedRanks: Set<number>,
  output: AssignPrizesOutput,
): Promise<void> {
  const isAffected = manualAffectedRanks.has(targetRank);

  if (isAffected) {
    await upsertAward(db, eventId, def.id, null, targetRank, 'pending', null);
    output.pending++;
    console.info('[pickem:prize-assignment:item]', {
      definitionId: def.id,
      rankPosition: def.rankPosition,
      targetRank,
      status: 'pending',
      reason: 'affected_by_manual_tie',
    });
    return;
  }

  const winner = rankingByRank.get(targetRank);

  if (winner) {
    await upsertAward(db, eventId, def.id, winner.profileId, targetRank, 'assigned', new Date().toISOString());
    output.assigned++;
    console.info('[pickem:prize-assignment:item]', {
      definitionId: def.id,
      rankPosition: def.rankPosition,
      targetRank,
      status: 'assigned',
      winnerProfileId: winner.profileId,
    });
  } else {
    await upsertAward(db, eventId, def.id, null, targetRank, 'unassigned_no_eligible_winner', null);
    output.skipped++;
    console.info('[pickem:prize-assignment:item]', {
      definitionId: def.id,
      rankPosition: def.rankPosition,
      targetRank,
      status: 'unassigned_no_eligible_winner',
      reason: 'no_participant_at_rank',
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Subscriber benefit assignment                                      */
/* ------------------------------------------------------------------ */

async function assignSubscriberBenefit(
  supabase: any,
  db: any,
  eventId: string,
  def: PrizeDefinition,
  subscriberOrder: number,
  finalRanking: FinalRankingEntry[],
  rankingByProfile: Map<string, FinalRankingEntry>,
  manualAffectedRanks: Set<number>,
  stackingPolicy: PrizeStackingPolicy,
  output: AssignPrizesOutput,
): Promise<void> {
  // Check if any verified subscriber's rank is affected by manual ties
  const verifiedSubs = finalRanking.filter((e) => e.isVerifiedSubscriber);
  const subRanks = verifiedSubs.map((e) => e.rank);
  const subRankAffected = subRanks.some((r) => manualAffectedRanks.has(r));

  if (subRankAffected) {
    await upsertAward(db, eventId, def.id, null, null, 'pending', null);
    output.pending++;
    console.info('[pickem:prize-assignment:item]', {
      definitionId: def.id,
      subscriberOrder,
      status: 'pending',
      reason: 'sub_ranking_affected_by_tie',
    });
    return;
  }

  // Build sorted subscriber ranking
  const sortedSubs = [...verifiedSubs].sort((a, b) => a.rank - b.rank);

  // Apply stacking policy
  let eligibleSubs: FinalRankingEntry[];
  if (stackingPolicy === 'pass_subscriber_benefit') {
    const { data: generalAwards } = await db
      .from('pickem_prize_awards')
      .select('profile_id')
      .eq('event_id', eventId)
      .eq('assignment_status', 'assigned');

    const assignedGeneralProfiles = new Set(
      (generalAwards ?? []).map((a: any) => a.profile_id).filter(Boolean),
    );

    eligibleSubs = sortedSubs.filter((s) => !assignedGeneralProfiles.has(s.profileId));
  } else {
    eligibleSubs = sortedSubs;
  }

  const winner = eligibleSubs[subscriberOrder - 1] ?? null;

  if (winner) {
    await upsertAward(db, eventId, def.id, winner.profileId, winner.rank, 'assigned', new Date().toISOString());
    output.assigned++;
    console.info('[pickem:prize-assignment:item]', {
      definitionId: def.id,
      subscriberOrder,
      status: 'assigned',
      winnerProfileId: winner.profileId,
    });
  } else {
    await upsertAward(db, eventId, def.id, null, null, 'unassigned_no_eligible_winner', null);
    output.skipped++;
    console.info('[pickem:prize-assignment:item]', {
      definitionId: def.id,
      subscriberOrder,
      status: 'unassigned_no_eligible_winner',
      reason: 'no_eligible_subscriber',
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Upsert award (idempotent)                                          */
/* ------------------------------------------------------------------ */

async function upsertAward(
  db: any,
  eventId: string,
  prizeDefinitionId: string,
  profileId: string | null,
  awardedRank: number | null,
  assignmentStatus: string,
  awardedAt: string | null,
): Promise<void> {
  const payload: Record<string, unknown> = {
    event_id: eventId,
    prize_definition_id: prizeDefinitionId,
    assignment_source: 'automatic_ranking',
    assignment_status: assignmentStatus,
  };

  if (profileId !== undefined) payload.profile_id = profileId;
  if (awardedRank !== undefined) payload.awarded_rank = awardedRank;
  if (awardedAt !== undefined) payload.awarded_at = awardedAt;

  await db.from('pickem_prize_awards').upsert(payload, {
    onConflict: 'prize_definition_id',
  });
}
