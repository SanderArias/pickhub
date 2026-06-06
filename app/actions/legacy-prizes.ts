'use server';

import { revalidatePath } from 'next/cache';
import { backfillLegacyPrizeAwards } from './legacy-migration';

export type LegacyPrizeBackfillState = {
  success: boolean;
  message: string | null;
};

export async function runLegacyPrizeBackfillAction(
  eventId: string,
  _previousState: LegacyPrizeBackfillState,
): Promise<LegacyPrizeBackfillState> {
  try {
    const result = await backfillLegacyPrizeAwards(eventId);

    if (!result.success) {
      return {
        success: false,
        message: result.errorMessage ?? 'No pudimos migrar los premios.',
      };
    }

    revalidatePath(`/creator/pickems/${eventId}`);

    return {
      success: true,
      message: 'Premios migrados correctamente.',
    };
  } catch (error) {
    console.error('[legacy-prizes/backfill-action] Failed', { eventId, error });

    return {
      success: false,
      message: 'No pudimos migrar los premios. Int\u00e9ntalo nuevamente.',
    };
  }
}
