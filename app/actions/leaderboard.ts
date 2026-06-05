'use server';

import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';

export interface LeaderboardEntry {
  rank: number;
  profile_id: string;
  display_name: string | null;
  total_score: number;
  correct_answers: number;
  total_questions: number;
}

export async function getLeaderboard(eventId: string): Promise<LeaderboardEntry[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .rpc('get_event_leaderboard', { p_event_id: eventId });

  if (error) {
    console.error('[getLeaderboard]', error);
    return [];
  }

  return (data ?? []) as LeaderboardEntry[];
}

export async function getMyScore(eventId: string): Promise<{
  total_score: number | null;
  correct_answers: number;
  total_questions: number;
} | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();

  const { data: scores } = await supabase
    .from('prediction_scores')
    .select('correct_count, total_points')
    .eq('event_id', eventId)
    .eq('profile_id', user.id);

  if (!scores || scores.length === 0) return null;

  const { count: totalQuestions } = await supabase
    .from('prediction_questions')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('is_active', true);

  return {
    total_score: scores.reduce((sum, s) => sum + (s.total_points ?? 0), 0),
    correct_answers: scores.reduce((sum, s) => sum + (s.correct_count ?? 0), 0),
    total_questions: totalQuestions ?? 0,
  };
}
