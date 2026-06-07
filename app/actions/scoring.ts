'use server';

import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { assignPrizes } from '@/lib/prize-assignment';
import type { PrizeEligibilityType, PrizeStackingPolicy } from '@/lib/prize-types';
import { assignEventPrizes } from './results-data';

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

  // 13. Auto-assign prizes ONLY when no ties exist.
  //     When ties exist, prizes are assigned after manual tiebreaker resolution via finalizeEventAfterTiebreakers().
  if (!hasTies) {
    try {
      const { data: newPrizes } = await supabase
        .from('event_prizes')
        .select('id, prize_category, eligibility_type, eligible_rank_start, quantity, sort_order')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (newPrizes && newPrizes.length > 0) {
        const { data: lb } = await supabase.rpc('get_event_leaderboard', { p_event_id: eventId });
        const leaderboardEntries = (lb ?? []) as Array<{ rank: number; profile_id: string; total_score: number }>;

        if (leaderboardEntries.length > 0) {
          // Fetch real subscriber status for all participants
          const lbProfileIds = leaderboardEntries.map((e) => e.profile_id);
          const { data: scoringParticipants } = await supabase
            .from('event_participants')
            .select('profile_id, subscriber_verification_status')
            .eq('event_id', eventId)
            .in('profile_id', lbProfileIds);

          const scoringSubMap = new Map(
            (scoringParticipants ?? []).map((p) => [p.profile_id, p.subscriber_verification_status]),
          );

          const participants = leaderboardEntries.map((e) => {
            const subStatus = scoringSubMap.get(e.profile_id);
            return {
              profile_id: e.profile_id,
              rank: e.rank,
              is_verified_subscriber: subStatus === 'verified_sub',
              is_verified_non_subscriber: subStatus === 'verified_non_sub',
            };
          });

          const prizeDefs = newPrizes.map((p) => ({
            id: p.id,
            sort_order: p.sort_order,
            eligibility_type: p.eligibility_type as PrizeEligibilityType,
            eligible_rank_start: p.eligible_rank_start,
            winner_count: p.quantity,
          }));

          const { data: eventData } = await supabase
            .from('events')
            .select('prize_stacking_policy')
            .eq('id', eventId)
            .single();

          const policy: PrizeStackingPolicy =
            (eventData?.prize_stacking_policy as PrizeStackingPolicy) ?? 'single_prize_per_participant';

          const result = assignPrizes(participants, prizeDefs, policy);

          if (result.winners.length > 0) {
            const rows = result.winners.map((w) => ({
              event_prize_id: w.prize_id,
              profile_id: w.profile_id,
              rank_achieved: w.rank,
            }));
            await assignEventPrizes(eventId, rows);
          }
        }
      }
    } catch (prizeErr) {
      console.error('[publishResults] prize assignment error:', prizeErr);
    }
  }

  // 14. Revalidate paths
  revalidatePath(`/creator/pickems/${eventId}`);
  revalidatePath(`/creator/pickems/${eventId}/results`);
  revalidatePath(`/pickems/[slug]`);

  return { error: null };
}

/**
 * Called after all tiebreakers have been manually resolved by the creator.
 * Assigns prizes that were deferred during publishResultsAndCalculateScores.
 */
export async function finalizeEventAfterTiebreakers(
  eventId: string,
): Promise<{ error: string | null }> {
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

  // Diagnostic log
  if (process.env.NODE_ENV === 'development') {
    console.info('[prizes/finalize]', { eventId, eventStatus: event.status });
  }

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

  // Fetch leaderboard
  const { data: lb } = await supabase.rpc('get_event_leaderboard', { p_event_id: eventId });
  const leaderboardEntries = (lb ?? []) as Array<{ rank: number; profile_id: string; total_score: number }>;

  if (leaderboardEntries.length === 0) {
    return { error: 'No hay clasificación para asignar premios.' };
  }

  // Fetch subscriber verification status for all participants
  const lbProfileIds = leaderboardEntries.map((e) => e.profile_id);
  const { data: eventParticipants } = await supabase
    .from('event_participants')
    .select('profile_id, subscriber_verification_status')
    .eq('event_id', eventId)
    .in('profile_id', lbProfileIds);

  const subStatusMap = new Map(
    (eventParticipants ?? []).map((p) => [p.profile_id, p.subscriber_verification_status]),
  );

  // Fetch prizes
  const { data: newPrizes } = await supabase
    .from('event_prizes')
    .select('id, prize_category, eligibility_type, eligible_rank_start, quantity, sort_order')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });

  if (!newPrizes || newPrizes.length === 0) {
    return { error: null };
  }

  // Check if prizes are already assigned (idempotent)
  const prizeIds = newPrizes.map((p) => p.id);
  const { data: existingAwards } = await supabase
    .from('prize_winners')
    .select('event_prize_id')
    .in('event_prize_id', prizeIds);

  if (existingAwards && existingAwards.length >= prizeIds.length) {
    return { error: null };
  }

  // Build participants with real subscriber status
  const participants = leaderboardEntries.map((e) => {
    const subStatus = subStatusMap.get(e.profile_id);
    return {
      profile_id: e.profile_id,
      rank: e.rank,
      is_verified_subscriber: subStatus === 'verified_sub',
      is_verified_non_subscriber: subStatus === 'verified_non_sub',
    };
  });

  const { data: eventData } = await supabase
    .from('events')
    .select('prize_stacking_policy')
    .eq('id', eventId)
    .single();

  const prizeDefs = newPrizes.map((p) => ({
    id: p.id,
    sort_order: p.sort_order,
    eligibility_type: p.eligibility_type as PrizeEligibilityType,
    eligible_rank_start: p.eligible_rank_start,
    winner_count: p.quantity,
  }));

  const policy: PrizeStackingPolicy =
    (eventData?.prize_stacking_policy as PrizeStackingPolicy) ?? 'single_prize_per_participant';

  const result = assignPrizes(participants, prizeDefs, policy);

  if (process.env.NODE_ENV === 'development') {
    for (const w of result.winners) {
      console.info('[prizes/assignment]', {
        prizeId: w.prize_id,
        profileId: w.profile_id,
        rank: w.rank,
        assignmentStatus: 'assigned',
      });
    }
    for (const warn of result.warnings) {
      console.info('[prizes/assignment] warning:', warn);
    }
  }

  if (result.winners.length > 0) {
    const rows = result.winners.map((w) => ({
      event_prize_id: w.prize_id,
      profile_id: w.profile_id,
      rank_achieved: w.rank,
    }));

    const { error: assignErr } = await supabase.from('prize_winners').upsert(rows, {
      onConflict: 'event_prize_id,profile_id',
    });

    if (assignErr) {
      console.error('[finalizeEventAfterTiebreakers] upsert error:', {
        message: assignErr.message,
        code: assignErr.code,
        details: assignErr.details,
        hint: assignErr.hint,
        operation: 'prize_winners_upsert',
      });
      return { error: `Error al asignar premios: ${assignErr.message}` };
    }
  }

  // Mark event as completed (safe to call even if already completed)
  const { error: completeErr } = await supabase
    .from('events')
    .update({ status: 'completed' })
    .eq('id', eventId);

  if (completeErr) {
    console.error('[finalizeEventAfterTiebreakers] error marking event completed:', completeErr);
  }

  revalidatePath(`/creator/pickems/${eventId}`);
  revalidatePath(`/creator/pickems/${eventId}/results`);
  revalidatePath(`/pickems/[slug]`);

  return { error: null };
}
