import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { createServerClient } from '@/services/supabase';
import { isActivityCapabilityEnabled } from '@/activities/registry.server';
import { DashboardMetricCard } from '@/components/creator/DashboardMetricCard';
import { PendingActionsSection } from '@/components/creator/PendingActionsSection';
import { RecentActivitySection } from '@/components/creator/RecentActivitySection';
import { ACTION_CONFIG } from '@/lib/dashboard-config';
import type { AttentionItem, MetricDef, ActionType } from '@/lib/dashboard-config';
import { perf } from '@/lib/perf';

export default async function CreatorDashboardPage() {
  const result = await perf.measure('[performance:creator-dashboard:total]', async () => {
    /* ── 1. Auth + profile ── */
    const profile = await perf.measure('[performance:creator-dashboard:profile]', async () => {
      const p = await getCurrentProfile();
      if (!p) redirect('/inicio');

      const creatorProfile = p.creator_profile;
      const isApproved = p.role === 'creator' && creatorProfile?.status === 'approved';
      const isAdmin = p.role === 'admin';
      if (!isApproved && !isAdmin) redirect('/inicio');

      return p;
    });

    /* ── 2. Create Supabase client ── */
    const supabase = await perf.measure('[performance:creator-dashboard:client]', () =>
      createServerClient(),
    );
    const creatorId = profile.creator_profile!.id;

    /* ── 3. Fetch all events ── */
    const { data: events } = await perf.measure('[performance:creator-dashboard:events]', async () => {
      const res = await supabase
        .from('events')
        .select('id, title, slug, status, ends_at')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      return { data: res.data ?? [] };
    });

    const safeEvents = events ?? [];
    const eventIds = safeEvents.map((e) => e.id);
    const completedEventIds = safeEvents.filter((e) => e.status === 'completed').map((e) => e.id);
    const openEventIds = safeEvents.filter((e) => e.status === 'open').map((e) => e.id);

    /* ── 4. Parallel: everything that depends on eventIds ── */
    const [
      totalSubmissionsResult,
      activityResult,
      drawsResult,
      scoresResult,
      openSubmissionCountsResult,
    ] = await perf.measure('[performance:creator-dashboard:parallel-batch]', () =>
      Promise.all([
        eventIds.length > 0
          ? supabase.from('submissions').select('*', { count: 'exact', head: true }).in('event_id', eventIds)
          : Promise.resolve({ count: 0, error: null }),

        eventIds.length > 0
          ? supabase
              .from('submissions')
              .select(`
                submitted_at,
                event_id,
                event_participants!inner(profile_id),
                events!inner(title, slug)
              `)
              .in('event_id', eventIds)
              .order('submitted_at', { ascending: false })
              .limit(5)
          : Promise.resolve({ data: [], error: null }),

        completedEventIds.length > 0
          ? supabase
              .from('tiebreaker_draws')
              .select('event_id, profile_id')
              .in('event_id', completedEventIds)
          : Promise.resolve({ data: [], error: null }),

        completedEventIds.length > 0
          ? supabase
              .from('submissions')
              .select('event_id, total_score, participant_id')
              .in('event_id', completedEventIds)
              .eq('status', 'scored')
          : Promise.resolve({ data: [], error: null }),

        openEventIds.length > 0
          ? supabase
              .from('submissions')
              .select('event_id')
              .in('event_id', openEventIds)
          : Promise.resolve({ data: [], error: null }),
      ]),
    );

    /* ── 5. Compute metrics ── */
    const totalSubmissions = (totalSubmissionsResult as { count: number | null }).count ?? 0;
    const activeCount = safeEvents.filter((e) => e.status === 'open').length;
    const draftCount = safeEvents.filter((e) => e.status === 'draft').length;
    const closedCount = safeEvents.filter((e) => e.status === 'predictions_closed').length;

    const scoresRows = (scoresResult as { data: { event_id: string; total_score: number | null; participant_id: string }[] }).data ?? [];

    /* ── 6. Tiebreaker detection (in-memory) ── */
    const scoredCountsByEvent = new Map<string, number>();
    for (const r of scoresRows) {
      scoredCountsByEvent.set(r.event_id, (scoredCountsByEvent.get(r.event_id) ?? 0) + 1);
    }

    const drawProfileIdsByEvent = new Map<string, Set<string>>();
    for (const d of (drawsResult as { data: { event_id: string; profile_id: string }[] }).data ?? []) {
      if (!drawProfileIdsByEvent.has(d.event_id)) drawProfileIdsByEvent.set(d.event_id, new Set());
      drawProfileIdsByEvent.get(d.event_id)!.add(d.profile_id);
    }

    /* Fetch all participant → profile mappings for completed events in one go */
    const allParticipantIds = [...new Set(scoresRows.map((r) => r.participant_id))];
    const { data: partsData } = allParticipantIds.length > 0
      ? await supabase.from('event_participants').select('id, profile_id').in('id', allParticipantIds)
      : { data: [] };
    const participantProfileMap = new Map((partsData ?? []).map((p: { id: string; profile_id: string }) => [p.id, p.profile_id]));

    const eventsWithPendingTies = new Set<string>();
    for (const eventId of completedEventIds) {
      const sc = scoredCountsByEvent.get(eventId) ?? 0;
      if (sc < 2) continue;

      const eventScores = scoresRows.filter((r) => r.event_id === eventId);
      const existingDraws = drawProfileIdsByEvent.get(eventId) ?? new Set();
      const scoreToPids = new Map<number, string[]>();

      for (const s of eventScores) {
        if (s.total_score === null) continue;
        const list = scoreToPids.get(s.total_score) ?? [];
        list.push(s.participant_id);
        scoreToPids.set(s.total_score, list);
      }

      let hasTies = false;
      for (const pids of scoreToPids.values()) {
        if (pids.length > 1) { hasTies = true; break; }
      }
      if (!hasTies) continue;

      let allResolved = true;
      for (const pids of scoreToPids.values()) {
        if (pids.length < 2) continue;
        const profileIds = pids.map((pid) => participantProfileMap.get(pid) ?? '').filter(Boolean);
        if (!profileIds.every((pid) => existingDraws.has(pid))) { allResolved = false; break; }
      }
      if (!allResolved) eventsWithPendingTies.add(eventId);
    }

    const tiebreakerPendingCount = eventsWithPendingTies.size;
    const rawCompletedCount = completedEventIds.length;
    const completedCount = rawCompletedCount - tiebreakerPendingCount;

    /* ── 7. Metrics def ── */
    const metrics: MetricDef[] = [
      {
        label: "Pick'ems activos",
        value: activeCount,
        context: 'Abiertos actualmente',
        tone: 'purple',
        href: activeCount > 0 ? '/creator/pickems?status=open' : undefined,
      },
      {
        label: 'Participaciones totales',
        value: totalSubmissions,
        context: "En todos tus Pick'ems",
        tone: totalSubmissions > 0 ? 'purple' : 'neutral',
      },
      {
        label: 'Requieren acción',
        value: closedCount + draftCount + tiebreakerPendingCount,
        context: `${closedCount} cerrados · ${draftCount} borradores${tiebreakerPendingCount > 0 ? ` · ${tiebreakerPendingCount} desempates` : ''}`,
        tone: (closedCount + tiebreakerPendingCount) > 0 ? 'warning' : 'neutral',
        href: closedCount > 0 ? '/creator/pickems?status=predictions_closed' : draftCount > 0 ? '/creator/pickems?status=draft' : undefined,
      },
      {
        label: 'Completados',
        value: completedCount,
        context: 'Resultados publicados',
        tone: 'success',
        href: completedCount > 0 ? '/creator/pickems?status=completed' : undefined,
      },
    ];

    /* ── 8. Attention items ── */
    const openSubmissionsByEvent = new Map<string, number>();
    for (const s of (openSubmissionCountsResult as { data: { event_id: string }[] }).data ?? []) {
      openSubmissionsByEvent.set(s.event_id, (openSubmissionsByEvent.get(s.event_id) ?? 0) + 1);
    }

    const attentionItems: AttentionItem[] = [];
    for (const event of safeEvents) {
      if (eventsWithPendingTies.has(event.id)) {
        attentionItems.push({
          title: event.title,
          slug: event.slug,
          actionType: 'resolve_tiebreaker' as ActionType,
          href: `/creator/pickems/${event.id}`,
        });
      } else if (event.status === 'predictions_closed') {
        attentionItems.push({
          title: event.title,
          slug: event.slug,
          actionType: 'register_results' as ActionType,
          href: `/creator/pickems/${event.id}/results`,
        });
      } else if (event.status === 'open' && (openSubmissionsByEvent.get(event.id) ?? 0) === 0) {
        attentionItems.push({
          title: event.title,
          slug: event.slug,
          actionType: 'share_pickem' as ActionType,
          href: `/pickems/${event.slug}`,
        });
      } else if (event.status === 'draft') {
        attentionItems.push({
          title: event.title,
          slug: event.slug,
          actionType: 'continue_setup' as ActionType,
          href: `/creator/pickems/${event.id}`,
        });
      }
    }
    attentionItems.sort((a, b) => {
      const pa = ACTION_CONFIG[a.actionType]?.priority ?? 99;
      const pb = ACTION_CONFIG[b.actionType]?.priority ?? 99;
      return pa - pb;
    });
    const visibleItems = attentionItems.slice(0, 5);

    /* ── 9. Enrich activity with profile names ── */
    const activityRaw = (activityResult as {
      data: Array<{
        event_participants?: { profile_id?: string };
        events?: { title?: string; slug?: string };
        submitted_at?: string;
      }>;
    }).data ?? [];

    let creatorActivities: {
      display_name: string | null;
      event_title: string;
      event_slug: string;
      submitted_at: string;
    }[] = [];

    if (activityRaw.length > 0) {
      const profileIds = [...new Set(activityRaw.map((r) => r.event_participants?.profile_id).filter(Boolean))] as string[];
      const { data: profiles } = profileIds.length > 0
        ? await supabase.from('profiles').select('id, display_name').in('id', profileIds)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]));

      creatorActivities = activityRaw.map((r) => ({
        display_name: profileMap.get(r.event_participants?.profile_id ?? '') ?? null,
        event_title: r.events?.title ?? '',
        event_slug: r.events?.slug ?? '',
        submitted_at: r.submitted_at ?? '',
      }));
    }

    return { profile, metrics, visibleItems, creatorActivities };
  });

  const { metrics, visibleItems, creatorActivities } = result;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Panel de control de tus Pick&rsquo;ems.
          </p>
        </div>
        {isActivityCapabilityEnabled('pickem', 'create') && (
          <Link
            href="/creator/pickems/new"
            className="self-start rounded-lg bg-purple-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
          >
            + Nuevo Pick&rsquo;em
          </Link>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <DashboardMetricCard key={m.label} metric={m} />
        ))}
      </div>

      {/* Pending actions */}
      <PendingActionsSection items={visibleItems} />

      {/* Recent activity */}
      <RecentActivitySection activities={creatorActivities} />
    </div>
  );
}
