'use server';

import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { revalidatePickemPaths } from '@/activities/pickem/lib/revalidation.server';
import { checkPickemCapability, requirePickemCapability } from '@/activities/pickem/lib/capability-guards.server';

async function detectTies(eventId: string): Promise<boolean> {
  const supabase = await createServerClient();
  const { data: submissions } = await supabase
    .from('submissions')
    .select('total_score')
    .eq('event_id', eventId)
    .eq('status', 'scored');

  if (!submissions || submissions.length < 2) return false;

  const scoreCount = new Map<number, number>();
  for (const s of submissions) {
    if (s.total_score === null || s.total_score === undefined) continue;
    scoreCount.set(s.total_score, (scoreCount.get(s.total_score) ?? 0) + 1);
  }

  for (const count of scoreCount.values()) {
    if (count > 1) return true;
  }
  return false;
}

export async function getEventResults(eventId: string) {
  requirePickemCapability('readHistoricalData');

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) throw new Error('Evento no encontrado.');

  const { data: results } = await supabase
    .from('prediction_results')
    .select('id, question_id, option_id, is_correct, position')
    .eq('event_id', eventId);

  return results ?? [];
}

export async function publishResultsAndCalculateScores(
  eventId: string,
  standardResults: Record<string, string[]>,
  rankingResults: Record<string, { position: number; option_id: string }[]>,
): Promise<{ error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  // 1. Validate creator owns event
  const { data: event } = await supabase
    .from('events')
    .select('id, status, title')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };

  // 2. Validate event status
  if (event.status === 'completed') {
    return { error: 'Este Pick\'em ya fue completado.' };
  }
  if (event.status !== 'predictions_closed') {
    return { error: 'El Pick\'em debe estar en estado "Predicciones cerradas" para publicar resultados.' };
  }

  // 3. Validate standard results
  const stdQuestionIds = Object.keys(standardResults);
  if (stdQuestionIds.length > 0) {
    const { data: questions } = await supabase
      .from('prediction_questions')
      .select('id, question_type')
      .eq('event_id', eventId)
      .in('id', stdQuestionIds);

    if (!questions || questions.length === 0) {
      return { error: 'No se encontraron preguntas.' };
    }

    for (const q of questions) {
      const selected = standardResults[q.id] ?? [];
      if (q.question_type === 'single' && selected.length > 1) {
        return {
          error: `La pregunta "${q.id}" es de tipo única y solo permite una opción correcta.`,
        };
      }
    }
  }

  // 4. Validate ranking results
  const rankQuestionIds = Object.keys(rankingResults);
  if (rankQuestionIds.length > 0) {
    const { data: rankQuestions } = await supabase
      .from('prediction_questions')
      .select('id, template_type')
      .eq('event_id', eventId)
      .in('id', rankQuestionIds);

    for (const q of rankQuestions ?? []) {
      const positions = rankingResults[q.id] ?? [];
      if (q.template_type === 'top8_ordered' && positions.length !== 8) {
        return { error: `La pregunta "${q.id}" requiere exactamente 8 posiciones.` };
      }
    }
  }

  // 5. Delete old prediction_results
  const { error: delErr } = await supabase
    .from('prediction_results')
    .delete()
    .eq('event_id', eventId);

  if (delErr) return { error: `Error al limpiar resultados anteriores: ${delErr.message}` };

  // 6. Insert standard results
  const stdRows: { event_id: string; question_id: string; option_id: string; is_correct: boolean }[] = [];
  for (const questionId of stdQuestionIds) {
    for (const optionId of standardResults[questionId] ?? []) {
      stdRows.push({ event_id: eventId, question_id: questionId, option_id: optionId, is_correct: true });
    }
  }

  if (stdRows.length > 0) {
    const { error: insErr } = await supabase.from('prediction_results').insert(stdRows);
    if (insErr) return { error: `Error al guardar resultados: ${insErr.message}` };
  }

  // 7. Insert ranking results
  const rankRows: { event_id: string; question_id: string; option_id: string; position: number; is_correct: boolean }[] = [];
  for (const [questionId, positions] of Object.entries(rankingResults)) {
    for (const { position, option_id } of positions) {
      rankRows.push({ event_id: eventId, question_id: questionId, option_id, position, is_correct: true });
    }
  }

  if (rankRows.length > 0) {
    const { error: insErr } = await supabase.from('prediction_results').insert(rankRows);
    if (insErr) return { error: `Error al guardar resultados de ranking: ${insErr.message}` };
  }

  // 8. Calculate scores
  const { data: results } = await supabase
    .from('prediction_results')
    .select('question_id, option_id, position')
    .eq('event_id', eventId)
    .eq('is_correct', true);

  if (!results || results.length === 0) {
    return { error: 'No hay resultados guardados para calcular puntuaciones.' };
  }

  const correctSet = new Map<string, Set<string>>();
  const correctPositionMap = new Map<string, Map<number, string>>();
  for (const r of results) {
    if (r.position !== null && r.position !== undefined) {
      if (!correctPositionMap.has(r.question_id)) correctPositionMap.set(r.question_id, new Map());
      correctPositionMap.get(r.question_id)!.set(r.position, r.option_id);
    } else {
      if (!correctSet.has(r.question_id)) correctSet.set(r.question_id, new Set());
      correctSet.get(r.question_id)!.add(r.option_id);
    }
  }

  const { data: questions } = await supabase
    .from('prediction_questions')
    .select('id, points_per_correct, question_type, template_type')
    .eq('event_id', eventId);

  const pointsMap = new Map<string, number>();
  for (const q of questions ?? []) {
    pointsMap.set(q.id, q.points_per_correct);
  }

  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, participant_id')
    .eq('event_id', eventId)
    .eq('status', 'submitted');

  if (!submissions || submissions.length === 0) {
    return { error: 'No hay participaciones para puntuar.' };
  }

  const submissionIds = submissions.map((s) => s.id);

  const { data: answers } = await supabase
    .from('prediction_answers')
    .select('submission_id, question_id, option_id, position')
    .in('submission_id', submissionIds);

  const answersBySubmission = new Map<string, { submission_id: string; question_id: string; option_id: string; position: number | null }[]>();
  for (const a of answers ?? []) {
    if (!answersBySubmission.has(a.submission_id)) answersBySubmission.set(a.submission_id, []);
    answersBySubmission.get(a.submission_id)!.push(a);
  }

  const participantIds = submissions.map((s) => s.participant_id);

  const { data: participants } = await supabase
    .from('event_participants')
    .select('id, profile_id')
    .in('id', participantIds);

  const profileIdMap = new Map<string, string>();
  for (const p of participants ?? []) {
    profileIdMap.set(p.id, p.profile_id);
  }

  const scoreRows: {
    event_id: string;
    profile_id: string;
    submission_id: string;
    question_id: string;
    correct_count: number;
    total_points: number;
  }[] = [];

  const submissionTotals = new Map<string, number>();

  for (const submission of submissions) {
    const profileId = profileIdMap.get(submission.participant_id);
    if (!profileId) continue;

    const userAnswers = answersBySubmission.get(submission.id) ?? [];
    const answersByQuestion = new Map<string, Set<string>>();
    const answersByPosition = new Map<string, Map<number, string>>();
    for (const a of userAnswers) {
      if (a.position !== null) {
        if (!answersByPosition.has(a.question_id)) answersByPosition.set(a.question_id, new Map());
        answersByPosition.get(a.question_id)!.set(a.position, a.option_id);
      } else {
        if (!answersByQuestion.has(a.question_id)) answersByQuestion.set(a.question_id, new Set());
        answersByQuestion.get(a.question_id)!.add(a.option_id);
      }
    }

    let totalScore = 0;

    for (const [qId, correctOptions] of correctSet) {
      const userSelected = answersByQuestion.get(qId) ?? new Set();
      let correctCount = 0;
      for (const opt of userSelected) {
        if (correctOptions.has(opt)) correctCount++;
      }
      const points = pointsMap.get(qId) ?? 1;
      const questionPoints = correctCount * points;
      totalScore += questionPoints;

      scoreRows.push({
        event_id: eventId,
        profile_id: profileId,
        submission_id: submission.id,
        question_id: qId,
        correct_count: correctCount,
        total_points: questionPoints,
      });
    }

    for (const [qId, correctPositions] of correctPositionMap) {
      const userPositions = answersByPosition.get(qId);
      let exactMatches = 0;
      let presenceMatches = 0;

      if (userPositions) {
        const correctOptionIds = new Set(correctPositions.values());

        for (const [pos, predictedOptId] of userPositions) {
          const inTop8 = correctOptionIds.has(predictedOptId);
          const exactPosition = correctPositions.get(pos) === predictedOptId;

          if (inTop8) presenceMatches++;
          if (exactPosition) exactMatches++;
        }
      }

      const questionPoints = presenceMatches + exactMatches;
      totalScore += questionPoints;

      scoreRows.push({
        event_id: eventId,
        profile_id: profileId,
        submission_id: submission.id,
        question_id: qId,
        correct_count: exactMatches,
        total_points: questionPoints,
      });
    }

    submissionTotals.set(submission.id, totalScore);
  }

  // 9. Delete old scores and insert new ones
  const { error: delScoreErr } = await supabase
    .from('prediction_scores')
    .delete()
    .eq('event_id', eventId);

  if (delScoreErr) return { error: `Error al limpiar puntuaciones anteriores: ${delScoreErr.message}` };

  if (scoreRows.length > 0) {
    const { error: insScoreErr } = await supabase
      .from('prediction_scores')
      .upsert(scoreRows, { onConflict: 'event_id,profile_id,question_id' });
    if (insScoreErr) return { error: `Error al guardar puntuaciones: ${insScoreErr.message}` };
  }

  // 10. Update submissions to scored
  for (const [subId, total] of submissionTotals) {
    const { error: upErr } = await supabase
      .from('submissions')
      .update({ status: 'scored', total_score: total })
      .eq('id', subId);

    if (upErr) return { error: `Error al actualizar participación: ${upErr.message}` };
  }

  // 11. Detect ties before completing
  const hasTies = await detectTies(eventId);

  // 12. Mark event as completed
  const { error: statusErr } = await supabase
    .from('events')
    .update({ status: 'completed' })
    .eq('id', eventId);

  if (statusErr) return { error: `Error al actualizar estado del Pick\'em: ${statusErr.message}` };

  // 13. Prize handling
  if (hasTies) {
    // Ties exist: create pending awards for all active definitions (no profile_id).
    // Assignment happens after tiebreaker resolution in finalizeEventAfterTiebreakers.
    try {
      const db = supabase as any;
      const { data: defs } = await db
        .from('pickem_prize_definitions')
        .select('id')
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (defs && (defs as any[]).length > 0) {
        const pendingRows = (defs as any[]).map((d: any) => ({
          event_id: eventId,
          prize_definition_id: d.id,
          assignment_source: 'automatic_ranking',
          assignment_status: 'pending',
        }));
        await db.from('pickem_prize_awards').upsert(pendingRows, {
          onConflict: 'prize_definition_id',
          ignoreDuplicates: true,
        });
      }
    } catch (prizeErr) {
      console.error('[publishResults] pending award creation error:', prizeErr);
    }
  } else {
    // No ties: auto-assign via RPC
    try {
      await (supabase.rpc as any)('assign_pickem_prizes', { p_event_id: eventId });
    } catch (prizeErr) {
      console.error('[publishResults] prize assignment error:', prizeErr);
    }
  }

  // 14. Revalidate paths
  revalidatePickemPaths(eventId);

  return { error: null };
}

/**
 * Called after all tiebreakers have been manually resolved by the creator.
 * Assigns prizes that were deferred during publishResultsAndCalculateScores.
 */
export async function finalizeEventAfterTiebreakers(
  eventId: string,
): Promise<{ error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  // Verify creator owns event
  const { data: event } = await supabase
    .from('events')
    .select('id, status, title')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };

  // Verify no pending tiebreakers remain
  const hasTies = await detectTies(eventId);
  if (hasTies) {
    const { data: draws } = await supabase
      .from('tiebreaker_draws')
      .select('profile_id')
      .eq('event_id', eventId);

    const { data: submissions } = await supabase
      .from('submissions')
      .select('total_score, participant_id')
      .eq('event_id', eventId)
      .eq('status', 'scored');

    const scoreMap = new Map<number, string[]>();
    for (const s of submissions ?? []) {
      if (s.total_score === null) continue;
      const list = scoreMap.get(s.total_score) ?? [];
      list.push(s.participant_id);
      scoreMap.set(s.total_score, list);
    }

    const { data: participants } = await supabase
      .from('event_participants')
      .select('id, profile_id')
      .in('id', [...scoreMap.values()].flat());

    const pidByPartic = new Map(participants?.map((p) => [p.id, p.profile_id]));

    for (const [, pids] of scoreMap) {
      if (pids.length < 2) continue;
      const profileIds = pids.map((pid) => pidByPartic.get(pid) ?? '').filter(Boolean);
      const resolved = profileIds.every((pid) => draws?.some((d) => d.profile_id === pid));
      if (!resolved) {
        return { error: 'Aún hay desempates pendientes. Resuelve todos antes de finalizar.' };
      }
    }
  }

  // Fetch leaderboard with draws applied
  const { data: lbRaw } = await supabase.rpc('get_event_leaderboard', { p_event_id: eventId });
  let leaderboard = (lbRaw ?? []) as Array<{ rank: number; profile_id: string; total_score: number }>;

  if (leaderboard.length === 0) {
    return { error: 'No hay clasificación para asignar premios.' };
  }

  // Reorder by draws within score groups (same logic as getRawLeaderboard in results-data.ts)
  const { data: draws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  if (draws && draws.length > 0) {
    const drawMap = new Map(draws.map((d) => [d.profile_id, d.draw_order]));
    const byScore = new Map<number, typeof leaderboard>();
    for (const e of leaderboard) {
      const g = byScore.get(e.total_score) ?? [];
      g.push(e);
      byScore.set(e.total_score, g);
    }
    const reordered: typeof leaderboard = [];
    for (const score of [...byScore.keys()].sort((a, b) => b - a)) {
      const group = byScore.get(score)!;
      const hasDraws = group.some((e) => drawMap.has(e.profile_id));
      if (hasDraws) {
        group.sort((a, b) => (drawMap.get(a.profile_id) ?? 999) - (drawMap.get(b.profile_id) ?? 999));
      }
      reordered.push(...group);
    }
    reordered.forEach((e, i) => { e.rank = i + 1; });
    leaderboard = reordered;
  }

  // Assign prizes: update pending awards with correct profile_id
  const db = supabase as any;
  const { data: defs } = await db
    .from('pickem_prize_definitions')
    .select('id, category, rank_position, subscriber_order')
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (defs) {
    for (const d of (defs as any[])) {
      if (d.category === 'general_rank' && d.rank_position != null) {
        const winner = leaderboard.find((e) => e.rank === d.rank_position);
        if (winner) {
          await db
            .from('pickem_prize_awards')
            .upsert({
              event_id: eventId,
              prize_definition_id: d.id,
              profile_id: winner.profile_id,
              awarded_rank: d.rank_position,
              assignment_source: 'automatic_ranking',
              assignment_status: 'assigned',
              awarded_at: new Date().toISOString(),
            }, { onConflict: 'prize_definition_id' });
        }
      }
    }
  }

  // Mark event as completed (safe even if already completed)
  const { error: completeErr } = await supabase
    .from('events')
    .update({ status: 'completed' })
    .eq('id', eventId);

  if (completeErr) {
    console.error('[finalizeEventAfterTiebreakers] error marking event completed:', completeErr);
  }

  revalidatePickemPaths(eventId);

  return { error: null };
}
