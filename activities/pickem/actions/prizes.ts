'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import type { UpdateEventPrizesResult } from '../types';
import { checkPickemCapability } from '../lib/capability-guards.server';
import { pickemRoutes } from '../routes';
import type { EventPrizeUpdate } from '@/types/database-helpers';

function createPrizeFailureResult(error: unknown, operation: string): UpdateEventPrizesResult {
  let message = 'Error desconocido';
  let code: string | null = null;
  let details: string | null = null;
  let hint: string | null = null;

  try {
    if (error instanceof Error) {
      message = error.message;
    }

    if (typeof error === 'object' && error !== null) {
      const candidate = error as Record<string, unknown>;
      if (typeof candidate.message === 'string') message = candidate.message;
      if (typeof candidate.code === 'string') code = candidate.code;
      if (typeof candidate.details === 'string') details = candidate.details;
      if (typeof candidate.hint === 'string') hint = candidate.hint;
    }

    if (typeof error === 'string') {
      message = error;
    }
  } catch {
    message = 'Error interno al extraer información del error';
  }

  return {
    success: false,
    savedCount: 0,
    saved: [],
    errorMessage: message,
    errorCode: code,
    errorDetails: details,
    errorHint: hint,
    errorOperation: operation,
  };
}

export async function updateEventPrizes(
  eventId: string,
  prizes: Array<{
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
  }>,
  stackingPolicy?: string,
): Promise<UpdateEventPrizesResult> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return createPrizeFailureResult(mgmtErr, 'capability');

  try {
    const saveAttemptId = crypto.randomUUID();

    const supabase = await createServerClient();

    // Ensure session is fresh on this client before RLS-protected queries
    const { data: { user }, error: sessionErr } = await supabase.auth.getUser();
    if (sessionErr || !user) {
      console.error('[prizes/save:server] No authenticated session', { saveAttemptId, eventId, sessionError: sessionErr?.message ?? null });
      return createPrizeFailureResult('Debes iniciar sesión para administrar premios.', 'auth');
    }

    const profile = await requireCreator();
    const creatorId = profile.creator_profile!.id;

    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('creator_id', creatorId)
      .single();

    if (!event) {
      const failure = createPrizeFailureResult('Evento no encontrado.', 'verify_event');
      console.error('[prizes/save:server] Event not found', { saveAttemptId, eventId });
      return failure;
    }

    const existingIds = new Set<string>();
    const { data: existing } = await supabase
      .from('event_prizes')
      .select('id')
      .eq('event_id', eventId);
    for (const p of existing ?? []) existingIds.add(p.id);

    const incomingIds = new Set(prizes.filter((p) => p.id).map((p) => p.id!));
    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

    const saved: Array<{ clientId: string; id: string }> = [];

    for (const prize of prizes) {
      const payload: EventPrizeUpdate = {
        label: prize.label,
        description: prize.description,
        amount: prize.amount ?? undefined,
        currency: prize.currency,
        quantity: prize.quantity,
        eligibility_type: prize.eligibility_type,
        eligible_rank_start: prize.eligible_rank_start,
        sort_order: prize.sort_order,
        assignment_method: prize.assignment_method ?? 'ranking',
        prize_category: prize.prize_category || undefined,
      };

      if (prize.id && existingIds.has(prize.id)) {
        const { data: updated, error: uErr } = await supabase
          .from('event_prizes')
          .update(payload)
          .eq('id', prize.id)
          .eq('event_id', eventId)
          .select('id')
          .single();
        if (uErr) {
          const failure = createPrizeFailureResult(uErr, 'update_prize');
          console.error('[prizes/save:server] Failed to update prize', { saveAttemptId, eventId, prizeId: prize.id, errorMessage: failure.errorMessage, errorCode: failure.errorCode });
          return failure;
        }
        saved.push({ clientId: prize.clientId ?? '', id: updated.id });
      } else {
        const { data: inserted, error: iErr } = await supabase.from('event_prizes').insert({
          event_id: eventId,
          label: prize.label,
          description: prize.description ?? undefined,
          amount: prize.amount ?? undefined,
          currency: prize.currency,
          quantity: prize.quantity,
          eligibility_type: prize.eligibility_type,
          eligible_rank_start: prize.eligible_rank_start,
          sort_order: prize.sort_order,
          assignment_method: prize.assignment_method ?? 'ranking',
          prize_category: prize.prize_category || (prize.eligibility_type === 'subscribers' ? 'subscriber_bonus' : 'general_ranking'),
        }).select('id').single();
        if (iErr) {
          const failure = createPrizeFailureResult(iErr, 'insert_prize');
          console.error('[prizes/save:server] Failed to insert prize', { saveAttemptId, eventId, prizeLabel: prize.label, errorMessage: failure.errorMessage, errorCode: failure.errorCode });
          return failure;
        }
        saved.push({ clientId: prize.clientId ?? '', id: inserted.id });
      }
    }

    if (toDelete.length > 0) {
      const { error: dErr } = await supabase
        .from('event_prizes')
        .delete()
        .in('id', toDelete)
        .eq('event_id', eventId);
      if (dErr) {
        const failure = createPrizeFailureResult(dErr, 'delete_prizes');
        console.error('[prizes/save:server] Failed to delete prizes', { saveAttemptId, eventId, deletedIds: toDelete, errorMessage: failure.errorMessage, errorCode: failure.errorCode });
        return failure;
      }
    }

    if (stackingPolicy !== undefined) {
      const { error: spErr } = await supabase
        .from('events')
        .update({ prize_stacking_policy: stackingPolicy })
        .eq('id', eventId)
        .eq('creator_id', creatorId);
      if (spErr) {
        const failure = createPrizeFailureResult(spErr, 'update_stacking_policy');
        console.error('[prizes/save:server] Failed to update stacking policy', { saveAttemptId, eventId, errorMessage: failure.errorMessage, errorCode: failure.errorCode });
        return failure;
      }
    }

    revalidatePath(pickemRoutes.creator.detail(eventId));
    const okResult: UpdateEventPrizesResult = {
      success: true,
      savedCount: saved.length,
      saved,
      errorMessage: null,
      errorCode: null,
      errorDetails: null,
      errorHint: null,
      errorOperation: null,
    };
    return okResult;
  } catch (error) {
    const failure = createPrizeFailureResult(error, 'unexpected');
    console.error('[prizes/save:server] Unexpected error', {
      message: failure.errorMessage,
      code: failure.errorCode,
      operation: failure.errorOperation,
    });
    return failure;
  }
}

export async function updatePrizeStackingPolicy(
  eventId: string,
  policy: string,
): Promise<{ error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { error: uErr } = await supabase
    .from('events')
    .update({ prize_stacking_policy: policy })
    .eq('id', eventId)
    .eq('creator_id', creatorId);

  if (uErr) return { error: `Error al actualizar política: ${uErr.message}` };

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null };
}
