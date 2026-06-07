import type { ActivitySummary } from '@/types/activities';
import type { ActivityType } from '@/activities/registry';

export type UpdateEventPrizesResult =
  | {
      success: true;
      savedCount: number;
      saved: Array<{ clientId: string; id: string }>;
      errorMessage: null;
      errorCode: null;
      errorDetails: null;
      errorHint: null;
      errorOperation: null;
    }
  | {
      success: false;
      savedCount: 0;
      saved: [];
      errorMessage: string;
      errorCode: string | null;
      errorDetails: string | null;
      errorHint: string | null;
      errorOperation: string | null;
    };

export interface PrizeInputPayload {
  clientId?: string;
  id?: string;
  label: string;
  description: string | null;
  amount: number | null;
  currency: string;
  quantity: number;
  eligibility_type: string;
  prize_category?: string;
  eligible_rank_start: number;
  sort_order: number;
  assignment_method?: string;
}

export interface CreatorEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  ends_at: string | null;
  event_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  prizeCount: number;
  submissionCount: number;
}

export type PickemPhase =
  | 'draft'
  | 'open'
  | 'predictions_closed'
  | 'completed'
  | 'archived';

export interface PickemSettings {
  twitchChannel: string | null;
  predictionsCloseTimezone: string;
  prizeStackingPolicy: string | null;
  scoringConfig: Record<string, unknown>;
}

export interface PickemEvent extends ActivitySummary {
  type: 'pickem';
  phase: PickemPhase;
  pickem: PickemSettings;
  endsAt: string | null;
  logoUrl: string | null;
}

export interface PickemParticipantScore {
  participantId: string;
  predictionsCount: number;
  totalScore: number | null;
  rank: number | null;
  tiebreakerRank: number | null;
}

export interface PickemResultSummary {
  eventId: string;
  phase: PickemPhase;
  totalParticipants: number;
  topScores: Array<{
    participantId: string;
    profileId: string;
    score: number;
    rank: number;
  }>;
}
