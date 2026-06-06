import type { PrizeEligibilityType, PrizeStackingPolicy } from './prize-types';

export interface RankedParticipant {
  profile_id: string;
  rank: number;
  is_verified_subscriber: boolean;
  is_verified_non_subscriber: boolean;
}

export interface PrizeDefinition {
  id: string;
  sort_order: number;
  eligibility_type: PrizeEligibilityType;
  eligible_rank_start: number;
  winner_count: number;
}

export interface WinnerRecord {
  prize_id: string;
  profile_id: string;
  rank: number;
}

export interface AssignmentResult {
  winners: WinnerRecord[];
  warnings: string[];
}

function isEligible(
  participant: RankedParticipant,
  eligibility: PrizeEligibilityType,
): boolean {
  if (eligibility === 'all') return true;
  if (eligibility === 'subscribers') return participant.is_verified_subscriber;
  if (eligibility === 'non_subscribers') return participant.is_verified_non_subscriber;
  return false;
}

export function assignPrizes(
  participants: RankedParticipant[],
  prizes: PrizeDefinition[],
  policy: PrizeStackingPolicy,
): AssignmentResult {
  const sortedPrizes = [...prizes].sort((a, b) => a.sort_order - b.sort_order);
  const winners: WinnerRecord[] = [];
  const warnings: string[] = [];
  const awardedProfileIds = new Set<string>();

  for (const prize of sortedPrizes) {
    // Build eligible ranking
    const eligibleRanking = participants
      .filter((p) => isEligible(p, prize.eligibility_type))
      .sort((a, b) => a.rank - b.rank);

    if (eligibleRanking.length === 0) {
      warnings.push(
        `No hay participantes elegibles para "${prize.id}".`,
      );
      continue;
    }

    // Start from eligible_rank_start (1-indexed within eligible group)
    const startIndex = Math.max(0, prize.eligible_rank_start - 1);
    let assigned = 0;

    for (let i = startIndex; i < eligibleRanking.length && assigned < prize.winner_count; i++) {
      const candidate = eligibleRanking[i];

      // If single prize per participant and already awarded, skip
      if (policy === 'single_prize_per_participant' && awardedProfileIds.has(candidate.profile_id)) {
        continue;
      }

      winners.push({
        prize_id: prize.id,
        profile_id: candidate.profile_id,
        rank: candidate.rank,
      });
      awardedProfileIds.add(candidate.profile_id);
      assigned++;
    }

    if (assigned < prize.winner_count) {
      warnings.push(
        `Solo se pudo asignar ${assigned} de ${prize.winner_count} ganadores para "${prize.id}".`,
      );
    }
  }

  return { winners, warnings };
}
