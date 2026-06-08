'use server';

import { createServerClient } from '@/services/supabase';
import { sendPrizeWinnerEmail } from '@/services/email';

/**
 * Creates pending notification records for all assigned awards in a completed event.
 * Calls SECURITY DEFINER RPC — no direct table access.
 * Idempotent — unique constraint prevents duplicates.
 */
export async function createPrizeNotifications(eventId: string): Promise<void> {
  const supabase = await createServerClient();

  const { data, error } = await (supabase.rpc as any)(
    'create_prize_notifications',
    { p_event_id: eventId },
  );

  if (error) {
    console.error('[pickem:prize-notification:create-error]', {
      eventId,
      error: error.message,
    });
    return;
  }

  const inserted = data?.inserted ?? 0;
  if (inserted > 0) {
    console.info('[pickem:prize-notification:created]', { eventId, count: inserted });
  } else {
    console.info('[pickem:prize-notification:no-new]', { eventId });
  }
}

type PendingNotification = {
  id: string;
  awardId: string;
  profileId: string;
  displayName: string | null;
  email: string;
  eventTitle: string;
  prizeTitle: string;
  prizeAmount: number | null;
  prizeCurrency: string | null;
  awardedRank: number | null;
  subscriberRank: number | null;
  attemptCount: number;
};

/**
 * Processes pending prize notifications: sends email and updates status.
 * All data (including email) is fetched via a single SECURITY DEFINER RPC.
 * Safe to call multiple times — skips already-sent, retries failed.
 */
export async function processPrizeNotifications(eventId: string): Promise<void> {
  const supabase = await createServerClient();

  // 1. Fetch pending + failed notifications with all data via RPC
  const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)(
    'get_pending_prize_notifications',
    { p_event_id: eventId },
  );

  if (rpcErr) {
    console.error('[pickem:prize-email:fetch-error]', {
      eventId,
      error: rpcErr.message,
    });
    return;
  }

  const notifications: PendingNotification[] = Array.isArray(rpcData?.notifications)
    ? rpcData.notifications
    : [];

  if (notifications.length === 0) {
    console.info('[pickem:prize-email:skipped-all-sent]', { eventId });
    return;
  }

  // 2. Send email for each notification
  for (const notif of notifications) {
    // Mark as processing
    await (supabase.rpc as any)('update_prize_notification_status', {
      p_notification_id: notif.id,
      p_status: 'processing',
    });

    const result = await sendPrizeWinnerEmail({
      toEmail: notif.email,
      toName: notif.displayName ?? 'Participante',
      eventTitle: notif.eventTitle,
      prizeTitle: notif.prizeTitle,
      prizeAmount: notif.prizeAmount,
      prizeCurrency: notif.prizeCurrency,
      awardedRank: notif.awardedRank ?? notif.subscriberRank,
    });

    if (result.success) {
      await (supabase.rpc as any)('update_prize_notification_status', {
        p_notification_id: notif.id,
        p_status: 'sent',
        p_provider_message_id: result.messageId,
      });
    } else {
      await (supabase.rpc as any)('update_prize_notification_status', {
        p_notification_id: notif.id,
        p_status: 'failed',
        p_last_error: result.error,
      });
    }
  }
}

/**
 * Full pipeline: create pending notifications then process them.
 * Safe to call on any completion path (first-time or retry).
 */
export async function sendPrizeNotifications(eventId: string): Promise<void> {
  await createPrizeNotifications(eventId);
  await processPrizeNotifications(eventId);
}
