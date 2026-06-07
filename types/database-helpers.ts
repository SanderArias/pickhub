import type { Database } from './database.types';

type Schema = Database['public']['Tables'];

export type EventRow = Schema['events']['Row'];
export type EventInsert = Schema['events']['Insert'];
export type EventUpdate = Schema['events']['Update'];

export type ProfileRow = Schema['profiles']['Row'];
export type ProfileInsert = Schema['profiles']['Insert'];
export type ProfileUpdate = Schema['profiles']['Update'];

export type EventParticipantRow = Schema['event_participants']['Row'];
export type EventParticipantInsert = Schema['event_participants']['Insert'];
export type EventParticipantUpdate = Schema['event_participants']['Update'];

export type EventPlayerRow = Schema['event_players']['Row'];
export type EventPlayerInsert = Schema['event_players']['Insert'];
export type EventPlayerUpdate = Schema['event_players']['Update'];

export type PredictionQuestionRow = Schema['prediction_questions']['Row'];
export type PredictionQuestionInsert = Schema['prediction_questions']['Insert'];
export type PredictionQuestionUpdate = Schema['prediction_questions']['Update'];

export type PredictionOptionRow = Schema['prediction_options']['Row'];
export type PredictionOptionInsert = Schema['prediction_options']['Insert'];
export type PredictionOptionUpdate = Schema['prediction_options']['Update'];

export type PredictionAnswerRow = Schema['prediction_answers']['Row'];
export type PredictionAnswerInsert = Schema['prediction_answers']['Insert'];
export type PredictionAnswerUpdate = Schema['prediction_answers']['Update'];

export type PredictionResultRow = Schema['prediction_results']['Row'];
export type PredictionResultInsert = Schema['prediction_results']['Insert'];
export type PredictionResultUpdate = Schema['prediction_results']['Update'];

export type PredictionScoreRow = Schema['prediction_scores']['Row'];
export type PredictionScoreInsert = Schema['prediction_scores']['Insert'];
export type PredictionScoreUpdate = Schema['prediction_scores']['Update'];

export type EventPrizeRow = Schema['event_prizes']['Row'];
export type EventPrizeInsert = Schema['event_prizes']['Insert'];
export type EventPrizeUpdate = Schema['event_prizes']['Update'];

export type PrizeWinnerRow = Schema['prize_winners']['Row'];
export type PrizeWinnerInsert = Schema['prize_winners']['Insert'];
export type PrizeWinnerUpdate = Schema['prize_winners']['Update'];

export type TiebreakerDrawRow = Schema['tiebreaker_draws']['Row'];
export type TiebreakerDrawInsert = Schema['tiebreaker_draws']['Insert'];
export type TiebreakerDrawUpdate = Schema['tiebreaker_draws']['Update'];

export type SubmissionRow = Schema['submissions']['Row'];
export type SubmissionInsert = Schema['submissions']['Insert'];
export type SubmissionUpdate = Schema['submissions']['Update'];

export type CreatorProfileRow = Schema['creator_profiles']['Row'];
export type DynamicTypeRow = Schema['dynamic_types']['Row'];

export type AdminNotificationRow = Schema['admin_notifications']['Row'];
