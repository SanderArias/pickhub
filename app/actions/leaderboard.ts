'use server';

import { createServerClient } from '@/services/supabase';
import { getUser } from './auth';
import { requirePickemCapability } from '@/activities/pickem/lib/capability-guards.server';

export interface LeaderboardEntry {
  rank: number;
  profile_id: string;
  display_name: string | null;
  total_score: number;
  correct_answers: number;
  total_questions: number;
}

export async function getLeaderboard(eventId: string): Promise<LeaderboardEntry[]> {
  requirePickemCapability('readHistoricalData');

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .rpc('get_event_leaderboard', { p_event_id: eventId });

  if (error) {
    console.error('[getLeaderboard]', error);
    return [];
  }

  const entries = (data ?? []) as LeaderboardEntry[];
  if (entries.length === 0) return [];

  // Apply tiebreaker draws within each score group
  const { data: draws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  if (draws && draws.length > 0) {
    const drawMap = new Map(draws.map((d) => [d.profile_id, d.draw_order]));

    // Group entries by score and apply tiebreaker ordering
    const byScore = new Map<number, LeaderboardEntry[]>();
    for (const e of entries) {
      const group = byScore.get(e.total_score) ?? [];
      group.push(e);
      byScore.set(e.total_score, group);
    }

    const reordered: LeaderboardEntry[] = [];
    const scores = [...byScore.keys()].sort((a, b) => b - a);

    for (const score of scores) {
      const group = byScore.get(score)!;
      const hasDraws = group.some((e) => drawMap.has(e.profile_id));
      if (hasDraws) {
        group.sort((a, b) => {
          const aOrder = drawMap.get(a.profile_id) ?? 999;
          const bOrder = drawMap.get(b.profile_id) ?? 999;
          return aOrder - bOrder;
        });
      }
      reordered.push(...group);
    }

    // Reassign ranks
    reordered.forEach((e, i) => {
      e.rank = i + 1;
    });

    return reordered;
  }

  return entries;
}

export async function getMyScore(eventId: string): Promise<{
  total_score: number | null;
  correct_answers: number;
  total_questions: number;
} | null> {
  requirePickemCapability('readHistoricalData');

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
