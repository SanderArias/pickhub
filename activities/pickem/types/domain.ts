import type { ActivitySummary } from '@/types/activities';
import type { ActivityType } from '@/activities/registry';

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
  | 'tiebreaker_pending'
  | 'completed'
  | 'archived';

export interface PickemSettings {
  twitchChannel: string | null;
  predictionsCloseTimezone: string;
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
