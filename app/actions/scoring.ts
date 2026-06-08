'use server';

import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { revalidatePickemPaths } from '@/activities/pickem/lib/revalidation.server';
import { checkPickemCapability, requirePickemCapability } from '@/activities/pickem/lib/capability-guards.server';
import { pickemRoutes } from '@/activities/pickem/routes';

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

export type PublishResultsOutcome =
  | { success: true; status: 'completed'; pendingTiebreakerCount: 0; redirectTo: string }
  | { success: true; status: 'tiebreaker_pending'; pendingTiebreakerCount: number; redirectTo: string }
  | { success: false; error: string };

export async function publishResultsAndCalculateScores(
  eventId: string,
  standardResults: Record<string, string[]>,
  rankingResults: Record<string, { position: number; option_id: string }[]>,
): Promise<PublishResultsOutcome> {
  console.info('[publish-results:start]', { eventId });
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { success: false, error: mgmtErr };

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

  if (!event) return { success: false, error: 'Evento no encontrado.' };

  // 2. Validate event status
  if (event.status === 'completed') {
    return { success: false, error: 'Este Pick\'em ya fue completado.' };
  }
  if (event.status !== 'predictions_closed') {
    return { success: false, error: 'El Pick\'em debe estar en estado "Predicciones cerradas" para publicar resultados.' };
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
      return { success: false, error: 'No se encontraron preguntas.' };
    }

    for (const q of questions) {
      const selected = standardResults[q.id] ?? [];
      if (q.question_type === 'single' && selected.length > 1) {
        return {
          success: false,
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
        return { success: false, error: `La pregunta "${q.id}" requiere exactamente 8 posiciones.` };
      }
    }
  }

  // 5. Persist results
  const { error: delErr } = await supabase
    .from('prediction_results')
    .delete()
    .eq('event_id', eventId);

  if (delErr) return { success: false, error: `Error al limpiar resultados anteriores: ${delErr.message}` };

  const stdRows: { event_id: string; question_id: string; option_id: string; is_correct: boolean }[] = [];
  for (const questionId of stdQuestionIds) {
    for (const optionId of standardResults[questionId] ?? []) {
      stdRows.push({ event_id: eventId, question_id: questionId, option_id: optionId, is_correct: true });
    }
  }

  if (stdRows.length > 0) {
    const { error: insErr } = await supabase.from('prediction_results').insert(stdRows);
    if (insErr) return { success: false, error: `Error al guardar resultados: ${insErr.message}` };
  }

  const rankRows: { event_id: string; question_id: string; option_id: string; position: number; is_correct: boolean }[] = [];
  for (const [questionId, positions] of Object.entries(rankingResults)) {
    for (const { position, option_id } of positions) {
      rankRows.push({ event_id: eventId, question_id: questionId, option_id, position, is_correct: true });
    }
  }

  if (rankRows.length > 0) {
    const { error: insErr } = await supabase.from('prediction_results').insert(rankRows);
    if (insErr) return { success: false, error: `Error al guardar resultados de ranking: ${insErr.message}` };
  }

  // 6. Calculate scores
  const { data: results } = await supabase
    .from('prediction_results')
    .select('question_id, option_id, position')
    .eq('event_id', eventId)
    .eq('is_correct', true);

  if (!results || results.length === 0) {
    return { success: false, error: 'No hay resultados guardados para calcular puntuaciones.' };
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
    return { success: false, error: 'No hay participaciones para puntuar.' };
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

  // 7. Persist scores
  const { error: delScoreErr } = await supabase
    .from('prediction_scores')
    .delete()
    .eq('event_id', eventId);

  if (delScoreErr) return { success: false, error: `Error al limpiar puntuaciones anteriores: ${delScoreErr.message}` };

  if (scoreRows.length > 0) {
    const { error: insScoreErr } = await supabase
      .from('prediction_scores')
      .upsert(scoreRows, { onConflict: 'event_id,profile_id,question_id' });
    if (insScoreErr) return { success: false, error: `Error al guardar puntuaciones: ${insScoreErr.message}` };
  }

  // 8. Update submissions to scored
  for (const [subId, total] of submissionTotals) {
    const { error: upErr } = await supabase
      .from('submissions')
      .update({ status: 'scored', total_score: total })
      .eq('id', subId);

    if (upErr) return { success: false, error: `Error al actualizar participación: ${upErr.message}` };
  }

  console.info('[publish-results:scoring-complete]', { eventId, scoreRows: scoreRows.length });

  // 9. Prize assignment (creates awards, detects ties)
  const { assignPickemPrizes } = await import('@/activities/pickem/prizes/domain/assign-prizes');
  const prizeResult = await assignPickemPrizes(eventId);

  console.info('[publish-results:prizes-complete]', { eventId, assigned: prizeResult.assigned, pending: prizeResult.pending, manualTieGroups: prizeResult.manualTieGroups.length });

  if (prizeResult.errors.length > 0) {
    console.error('[publishResults] prize assignment errors:', prizeResult.errors);
    revalidatePickemPaths(eventId);
    return { success: false, error: `Error al asignar premios: ${prizeResult.errors.slice(0, 3).join(', ')}` };
  }

  // 10. Decide final status
  const pendingCount = prizeResult.pending;
  const hasManualTies = prizeResult.manualTieGroups.length > 0;

  if (hasManualTies) {
    const { error: statusErr } = await supabase
      .from('events')
      .update({ status: 'tiebreaker_pending' })
      .eq('id', eventId);
    if (statusErr) return { success: false, error: `Error al actualizar estado: ${statusErr.message}` };

    revalidatePickemPaths(eventId);

    const redirectTo = pickemRoutes.creator.detail(eventId);
    console.info('[publish-results:return]', { eventId, status: 'tiebreaker_pending', redirectTo, pendingTiebreakerCount: prizeResult.manualTieGroups.length });

    return { success: true, status: 'tiebreaker_pending', pendingTiebreakerCount: prizeResult.manualTieGroups.length, redirectTo };
  }

  const { error: statusErr } = await supabase
    .from('events')
    .update({ status: 'completed' })
    .eq('id', eventId);
  if (statusErr) return { success: false, error: `Error al actualizar estado: ${statusErr.message}` };

  revalidatePickemPaths(eventId);

  // Event is completed — send prize winner notifications (fire-and-forget, never blocks return)
  try {
    const { sendPrizeNotifications } = await import('@/services/prize-notifications');
    await sendPrizeNotifications(eventId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[pickem:prize-email:pipeline-error]', { eventId, error: msg });
  }

  const redirectTo = `${pickemRoutes.creator.detail(eventId)}?tab=summary`;
  console.info('[publish-results:return]', { eventId, status: 'completed', redirectTo, assigned: prizeResult.assigned, pending: pendingCount });

  return { success: true, status: 'completed', pendingTiebreakerCount: 0, redirectTo };
}

import type { TiebreakerFinalizationResult } from './tiebreaker';

/**
 * Called after tiebreakers have been resolved by the creator.
 * Loads FRESH data, assigns prizes, recalculates remaining manual groups,
 * and updates event status.
 *
 * Returns a discriminated result:
 *   - success + completed        → no remaining tiebreakers
 *   - success + tiebreaker_pending → other groups remain (legitimate, not an error)
 *   - success: false              → real error (DB constraint, duplicate, etc.)
 */
export async function finalizeEventAfterTiebreakers(
  eventId: string,
): Promise<TiebreakerFinalizationResult> {
  console.info('[pickem:finalization:start]', { eventId });

  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { success: false, error: mgmtErr };

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  // Verify creator owns event
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, status, title')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .maybeSingle();

  console.info('[pickem:finalization:event-query]', {
    eventId,
    creatorId,
    eventFound: !!event,
    eventStatus: event?.status ?? null,
    error: eventErr?.message ?? null,
    errorCode: eventErr?.code ?? null,
  });

  if (eventErr) {
    console.error('[pickem:finalization:event-query-error]', { eventId, code: eventErr.code, message: eventErr.message, details: eventErr.details });
    return { success: false, error: 'Error de base de datos al verificar el evento.' };
  }

  if (!event) return { success: false, error: 'Evento no encontrado.' };

  // 1. Assign prizes with unified engine (loads FRESH leaderboard + draws)
  const { assignPickemPrizes } = await import('@/activities/pickem/prizes/domain/assign-prizes');
  const prizeResult = await assignPickemPrizes(eventId);

  console.info('[tiebreaker:assignment-result]', {
    eventId,
    pendingAwards: prizeResult.pending,
    assignedAwards: prizeResult.assigned,
    skippedAwards: prizeResult.skipped,
    errors: prizeResult.errors,
  });

  if (prizeResult.errors.length > 0) {
    const errMsg = `Error al asignar premios: ${prizeResult.errors.slice(0, 3).join(', ')}`;
    console.error('[finalizeEventAfterTiebreakers]', errMsg);
    revalidatePickemPaths(eventId);
    return { success: false, error: errMsg };
  }

  // 2. Validate invariants (fresh data) — distinguishes real errors from
  //    legitimate remaining tie groups
  const { validatePickemFinalization } = await import('@/activities/pickem/lib/validate-finalization');
  const validation = await validatePickemFinalization(eventId);

  console.info('[tiebreaker:remaining]', {
    eventId,
    remainingManualTiebreakers: validation.pendingManualTiebreakerCount,
    pendingAwards: validation.pendingAwardCount,
    nextStatus: validation.pendingManualTiebreakerCount > 0 ? 'tiebreaker_pending' : 'completed',
  });

  if (validation.errors.length > 0) {
    // Real invariant violations (duplicates, constraint issues, etc.)
    console.error('[finalizeEventAfterTiebreakers] validation errors:', validation.errors);
    revalidatePickemPaths(eventId);
    return { success: false, error: 'No pudimos completar el desempate. El sorteo guardado no fue modificado. Inténtalo nuevamente.' };
  }

  // 3. Update event status based on remaining groups
  let finalStatus: string;
  const remaining = validation.pendingManualTiebreakerCount;
  if (remaining > 0) {
    finalStatus = 'tiebreaker_pending';
    console.info('[finalizeEventAfterTiebreakers] remaining tiebreakers:', remaining);
  } else {
    finalStatus = 'completed';
    console.info('[finalizeEventAfterTiebreakers] all prizes assigned and validated, status=completed');
  }

  const { data: updatedEvent, error: statusErr } = await supabase
    .from('events')
    .update({ status: finalStatus })
    .eq('id', eventId)
    .select('id')
    .maybeSingle();

  if (statusErr) {
    console.error('[finalizeEventAfterTiebreakers] error updating status:', statusErr);
    revalidatePickemPaths(eventId);
    return { success: false, error: 'Error al actualizar el estado del evento.' };
  }

  if (!updatedEvent) {
    console.error('[finalizeEventAfterTiebreakers] update affected 0 rows', { eventId, finalStatus });
    revalidatePickemPaths(eventId);
    return { success: false, error: 'El evento no pudo ser actualizado. Inténtalo nuevamente.' };
  }

  revalidatePickemPaths(eventId);

  // Load draws for the result
  const { data: finalDraws } = await supabase
    .from('tiebreaker_draws')
    .select('profile_id, draw_order')
    .eq('event_id', eventId);

  const draws = (finalDraws ?? []).map((d: any) => ({ profile_id: d.profile_id, draw_order: d.draw_order }));

  if (remaining > 0) {
    return {
      success: true,
      status: 'tiebreaker_pending' as const,
      remainingTiebreakers: remaining,
      draws,
    };
  }

  // Event is completed — send prize winner notifications (fire-and-forget, never blocks return)
  try {
    const { sendPrizeNotifications } = await import('@/services/prize-notifications');
    await sendPrizeNotifications(eventId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[pickem:prize-email:pipeline-error]', { eventId, error: msg });
  }

  return {
    success: true,
    status: 'completed' as const,
    remainingTiebreakers: 0,
    draws,
  };
}
