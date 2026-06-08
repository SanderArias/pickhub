import 'server-only';
import { createServerClient } from '@/services/supabase';

export interface CloseExpiredResult {
  checked: number;
  eligible: number;
  closed: number;
  skipped: number;
  failed: number;
  errors: Array<{ eventId: string; error: string }>;
}

export async function closeExpiredPickems(): Promise<CloseExpiredResult> {
  const supabase = await createServerClient();
  const now = new Date().toISOString();

  const { data: events, error: fetchError } = await (supabase as any)
    .from('events')
    .select('id, status, ends_at')
    .eq('status', 'open')
    .not('ends_at', 'is', null)
    .lte('ends_at', now)
    .limit(100);

  if (fetchError) {
    console.error('[pickem:auto-close] fetch error:', fetchError);
    return { checked: 0, eligible: 0, closed: 0, skipped: 0, failed: 0, errors: [{ eventId: 'fetch', error: fetchError.message }] };
  }

  const eligible = events ?? [];
  const result: CloseExpiredResult = { checked: eligible.length, eligible: eligible.length, closed: 0, skipped: 0, failed: 0, errors: [] };

  for (const event of eligible) {
    if (event.status !== 'open') {
      result.skipped++;
      continue;
    }

    const { error: updateError } = await (supabase as any)
      .from('events')
      .update({ status: 'predictions_closed' })
      .eq('id', event.id)
      .eq('status', 'open');

    if (updateError) {
      result.failed++;
      result.errors.push({ eventId: event.id, error: updateError.message });
      console.error('[pickem:auto-close] close error', { eventId: event.id, error: updateError.message });
    } else {
      result.closed++;
      console.log('[pickem:auto-close] closed', { eventId: event.id, previousStatus: 'open', closeAt: event.ends_at, result: 'predictions_closed' });
    }
  }

  console.info('[pickem:auto-close] summary', {
    checked: result.checked,
    eligible: result.eligible,
    closed: result.closed,
    skipped: result.skipped,
    failed: result.failed,
  });

  return result;
}
