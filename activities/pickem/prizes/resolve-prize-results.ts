'use server';

import type {
  PrizeResultViewModel,
  PrizeResolutionStatus,
  PickemResultResolutionStatus,
} from './resolution-types';
import type { PrizeDefinition, PrizeAward } from './types';

function getAffectedRanks(tiedAtRank: number, participantCount: number): number[] {
  return Array.from({ length: participantCount }, (_, i) => tiedAtRank + i);
}

export interface UnresolvedTieGroup {
  tiedAtRank: number;
  participantCount: number;
  tieGroupId: string;
  participantProfileIds: string[];
}

export interface ResolvePrizeResultsInput {
  definitions: PrizeDefinition[];
  awards: PrizeAward[];
  resultStatus: PickemResultResolutionStatus;
  unresolvedTieGroups: UnresolvedTieGroup[];
  finalRanking: Array<{
    rank: number;
    profileId: string;
    displayName: string | null;
    avatarUrl: string | null;
  }>;
}

export function resolvePrizeResults(input: ResolvePrizeResultsInput): PrizeResultViewModel[] {
  const { definitions, awards, resultStatus, unresolvedTieGroups, finalRanking } = input;

  const affectedRankSet = new Set<number>();
  for (const g of unresolvedTieGroups) {
    for (const r of getAffectedRanks(g.tiedAtRank, g.participantCount)) {
      affectedRankSet.add(r);
    }
  }

  const awardByDefId = new Map<string, PrizeAward>();
  for (const a of awards) {
    awardByDefId.set(a.prizeDefinitionId, a);
  }

  const finalRankingMap = new Map<string, { rank: number; profileId: string; displayName: string | null }>();
  for (const e of finalRanking) {
    finalRankingMap.set(e.profileId, e);
  }

  const profileNames = new Map(finalRanking.map((r) => [r.profileId, r.displayName]));
  const profileAvatars = new Map(finalRanking.map((r) => [r.profileId, r.avatarUrl]));

  return definitions.map((d) => {
    const award = awardByDefId.get(d.id);
    const isGeneral = d.category === 'general_rank';
    const cat = isGeneral ? 'general_ranking' : 'subscriber_bonus';

    // — Finalized: use awards as source of truth —
    if (resultStatus === 'finalized') {
      if (award?.assignmentStatus === 'assigned' && award.profileId) {
        return makeResolved(d, cat, 'assigned', award.profileId, profileNames, profileAvatars);
      }
      return makeResolved(d, cat, 'unassigned_no_eligible_winner', null, profileNames, profileAvatars);
    }

    // — Tiebreaker pending —
    if (resultStatus === 'tiebreaker_pending') {
      if (isGeneral && d.rankPosition !== null && affectedRankSet.has(d.rankPosition)) {
        return makeResolved(d, cat, 'on_hold_tiebreaker', null, profileNames, profileAvatars);
      }
      if (!isGeneral) {
        const hasSubInTie = unresolvedTieGroups.some((g) =>
          g.participantProfileIds.some((pid) => finalRankingMap.has(pid)),
        );
        if (hasSubInTie) {
          return makeResolved(d, cat, 'on_hold_tiebreaker', null, profileNames, profileAvatars);
        }
      }
      // Non-affected prize: use award if assigned
      if (award?.assignmentStatus === 'assigned' && award.profileId) {
        return makeResolved(d, cat, 'assigned', award.profileId, profileNames, profileAvatars);
      }
      return makeResolved(d, cat, 'awaiting_results', null, profileNames, profileAvatars);
    }

    // — Calculated without ties: use awards —
    if (resultStatus === 'calculated_without_ties') {
      if (award?.assignmentStatus === 'assigned' && award.profileId) {
        return makeResolved(d, cat, 'assigned', award.profileId, profileNames, profileAvatars);
      }
      return makeResolved(d, cat, 'awaiting_results', null, profileNames, profileAvatars);
    }

    // — Not calculated —
    return makeResolved(d, cat, 'awaiting_results', null, profileNames, profileAvatars);
  });
}

function makeResolved(
  d: PrizeDefinition,
  category: string,
  resolutionStatus: PrizeResolutionStatus,
  profileId: string | null,
  profileNames: Map<string, string | null>,
  profileAvatars: Map<string, string | null>,
): PrizeResultViewModel {
  return {
    definitionId: d.id,
    category,
    label: d.title,
    title: d.title,
    description: d.description,
    amount: d.amount,
    currency: d.currency,
    resolutionStatus,
    winner: profileId
      ? {
          profileId,
          displayName: profileNames.get(profileId) ?? null,
          avatarUrl: profileAvatars.get(profileId) ?? null,
        }
      : null,
    affectedByTieGroupId: null,
  };
}
