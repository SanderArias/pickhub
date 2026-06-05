export type DynamicType =
  | 'pickem'
  | 'trivia'
  | 'bingo'
  | 'voting'
  | 'fantasy'
  | 'raffle';

export type DynamicStatus = 'draft' | 'open' | 'predictions_closed' | 'completed' | 'archived';

export interface Dynamic {
  id: string;
  type: DynamicType;
  title: string;
  slug: string;
  description: string | null;
  status: DynamicStatus;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DynamicParticipation {
  id: string;
  dynamic_id: string;
  participant_id: string;
  answers: Record<string, unknown>;
  score: number | null;
  created_at: string;
}
