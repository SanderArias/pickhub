'use server';

export type PickemResultResolutionStatus =
  | 'not_calculated'
  | 'calculated_without_ties'
  | 'tiebreaker_pending'
  | 'finalized';

export type ParticipantPlacementStatus =
  | 'pending'
  | 'tied_pending_resolution'
  | 'final';

export interface ParticipantPlacementViewModel {
  profileId: string;
  displayName: string | null;
  avatarUrl: string | null;
  points: number;
  finalRank: number | null;
  tiedAtRank: number | null;
  tieGroupId: string | null;
  placementStatus: ParticipantPlacementStatus;
}

export type PrizeResolutionStatus =
  | 'configured'
  | 'awaiting_results'
  | 'on_hold_tiebreaker'
  | 'assigned'
  | 'unassigned_no_eligible_winner'
  | 'revoked';

export interface PrizeWinnerViewModel {
  profileId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PrizeResultViewModel {
  definitionId: string;
  category: string;
  label: string;
  title: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  resolutionStatus: PrizeResolutionStatus;
  winner: PrizeWinnerViewModel | null;
  affectedByTieGroupId: string | null;
}
