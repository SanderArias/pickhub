'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import type { UpdateEventPrizesResult } from '../types';
import { checkPickemCapability } from '../lib/capability-guards.server';
import { pickemRoutes } from '../routes';
import type { EventPrizeUpdate, EventPrizeInsert } from '@/types/database-helpers';

export async function upsertEventPrize(eventId: string, _prev: unknown, formData: FormData): Promise<{ error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };

  const rawTier = formData.get('tier') as string;
  const tier = (
    rawTier === 'subscribers' || rawTier === 'Suscriptores' ? 'subscriber' :
    rawTier === 'non_subscribers' || rawTier === 'No suscriptores' ? 'nonsubscriber' :
    rawTier
  );
  if (!['subscriber', 'nonsubscriber'].includes(tier)) return { error: 'Tipo de premio inválido.' };

  const label = (formData.get('label') as string)?.trim();
  if (!label) return { error: 'La etiqueta del premio es obligatoria.' };

  const description = (formData.get('description') as string)?.trim() || null;

  const amountRaw = formData.get('amount') as string;
  const amount = amountRaw?.trim() ? parseFloat(amountRaw) : null;
  if (amount !== null && (isNaN(amount) || amount < 0)) return { error: 'El monto debe ser un número válido mayor o igual a 0.' };

  const currency = (formData.get('currency') as string)?.trim() || 'USD';

  const quantityRaw = formData.get('quantity') as string;
  const quantity = parseInt(quantityRaw, 10);
  if (isNaN(quantity) || quantity < 1) return { error: 'La cantidad debe ser al menos 1.' };

  const { error: rpcErr } = await supabase.rpc('upsert_event_prize', {
    p_event_id: eventId,
    p_tier: tier,
    p_label: label,
    p_description: description ?? undefined,
    p_amount: amount ?? undefined,
    p_currency: currency,
    p_quantity: quantity,
  });

  if (rpcErr) return { error: `Error al guardar premio: ${rpcErr.message}` };

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null };
}

export async function deleteEventPrize(eventId: string, prizeId: string): Promise<{ error: string | null }> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { error: mgmtErr };

  const profile = await requireCreator();
  const creatorId = profile.creator_profile!.id;

  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('creator_id', creatorId)
    .single();

  if (!event) return { error: 'Evento no encontrado.' };

  const { error: dErr } = await supabase
    .from('event_prizes')
    .delete()
    .eq('id', prizeId)
    .eq('event_id', eventId);

  if (dErr) return { error: `Error al eliminar premio: ${dErr.message}` };

  revalidatePath(pickemRoutes.creator.detail(eventId));
  return { error: null };
}

function createPrizeFailureResult(error: unknown, operation: string): UpdateEventPrizesResult {
  let message = 'Error desconocido';
  let code: string | null = null;
  let details: string | null = null;
  let hint: string | null = null;

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
    const profile = await requireCreator();
    const creatorId = profile.creator_profile!.id;

    const supabase = await createServerClient();

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
          console.error('[prizes/save:server] Failed to update prize', { saveAttemptId, ...failure, eventId, prizeId: prize.id });
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
          prize_category: prize.prize_category ?? '',
        }).select('id').single();
        if (iErr) {
          const failure = createPrizeFailureResult(iErr, 'insert_prize');
          console.error('[prizes/save:server] Failed to insert prize', { saveAttemptId, ...failure, eventId, prizeLabel: prize.label });
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
        console.error('[prizes/save:server] Failed to delete prizes', { saveAttemptId, ...failure, eventId, deletedIds: toDelete });
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
        console.error('[prizes/save:server] Failed to update stacking policy', { saveAttemptId, ...failure, eventId });
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
    console.error('[prizes/save:server] Unexpected error', { ...failure });
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
