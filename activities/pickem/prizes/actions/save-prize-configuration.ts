'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/services/supabase';
import { requireCreator } from '@/lib/auth';
import { checkPickemCapability } from '../../lib/capability-guards.server';
import { pickemRoutes } from '../../routes';
import type { SavePrizeConfigurationPayload, SavePrizeConfigurationResult } from '../types';
import { normalizePrizeMoney } from '../prize-money';

export async function savePrizeConfiguration(
  payload: SavePrizeConfigurationPayload,
): Promise<SavePrizeConfigurationResult> {
  const mgmtErr = checkPickemCapability('manageExisting');
  if (mgmtErr) return { success: false, errorMessage: mgmtErr, errorCode: null, errorDetails: null, errorHint: null, errorOperation: 'capability' };

  try {
    const supabase = await createServerClient();

    const { data: { user }, error: sessionErr } = await supabase.auth.getUser();
    if (sessionErr || !user) {
      return { success: false, errorMessage: 'Debes iniciar sesión para administrar premios.', errorCode: null, errorDetails: null, errorHint: null, errorOperation: 'auth' };
    }

    await requireCreator();

    const rpcDefinitions = payload.definitions.map((d) => {
      let amount = d.amount;
      let currency = d.currency;
      try {
        const money = normalizePrizeMoney(d.amount, d.currency);
        amount = money.amount;
        currency = money.currency;
      } catch {
        // keep original values — RPC will fail with a DB error if invalid
      }
      return {
        clientId: d.clientId ?? '',
        id: d.id ?? null,
        category: d.category,
        rankPosition: d.rankPosition,
        subscriberOrder: d.subscriberOrder,
        title: d.title,
        description: d.description,
        amount,
        currency,
        sortOrder: d.sortOrder,
      };
    });

    const { data: rpcResult, error: rpcErr } = await (supabase.rpc as any)(
      'save_pickem_prize_configuration',
      {
        p_event_id: payload.eventId,
        p_stacking_policy: payload.stackingPolicy,
        p_definitions: rpcDefinitions,
      },
    );

    if (rpcErr) {
      return {
        success: false,
        errorMessage: rpcErr.message ?? 'Error al guardar configuración de premios.',
        errorCode: rpcErr.code ?? null,
        errorDetails: rpcErr.details ?? null,
        errorHint: rpcErr.hint ?? null,
        errorOperation: 'save_configuration',
      };
    }

    const result = rpcResult as unknown as { success: boolean; savedCount: number; saved: Array<{ clientId: string; id: string }> };

    if (!result?.success) {
      return {
        success: false,
        errorMessage: 'Error inesperado al guardar premios.',
        errorCode: null,
        errorDetails: null,
        errorHint: null,
        errorOperation: 'save_configuration',
      };
    }

    revalidatePath(pickemRoutes.creator.detail(payload.eventId));

    return {
      success: true,
      savedCount: result.savedCount ?? 0,
      saved: result.saved ?? [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, errorMessage: message, errorCode: null, errorDetails: null, errorHint: null, errorOperation: 'unexpected' };
  }
}
