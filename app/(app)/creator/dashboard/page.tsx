import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { createServerClient } from '@/services/supabase';
import { DashboardMetricCard } from '@/components/creator/DashboardMetricCard';
import { PendingActionsSection } from '@/components/creator/PendingActionsSection';
import { RecentActivitySection } from '@/components/creator/RecentActivitySection';
import { ACTION_CONFIG } from '@/lib/dashboard-config';
import type { AttentionItem, MetricDef, ActionType } from '@/lib/dashboard-config';

export default async function CreatorDashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const creatorProfile = profile.creator_profile;
  const isApproved = profile.role === 'creator' && creatorProfile?.status === 'approved';
  const isAdmin = profile.role === 'admin';

  if (!isApproved && !isAdmin) {
    redirect('/inicio');
  }

  const supabase = await createServerClient();
  const creatorId = creatorProfile!.id;

  // Fetch all events with their submission counts in one go
  const { data: events } = await supabase
    .from('events')
    .select('id, title, slug, status, ends_at')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  const safeEvents = events ?? [];

  // Count submissions across all events
  let totalSubmissions = 0;
  if (safeEvents.length > 0) {
    const eventIds = safeEvents.map((e) => e.id);
    const { count: sc } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds);
    totalSubmissions = sc ?? 0;
  }

  // Pre-fetch tiebreaker data for completed events
  const eventsWithPendingTies = new Set<string>();
  for (const e of safeEvents) {
    if (e.status !== 'completed') continue;
    const { count } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', e.id)
      .eq('status', 'scored');
    if ((count ?? 0) < 2) continue;
    const { data: draws } = await supabase
      .from('tiebreaker_draws')
      .select('profile_id')
      .eq('event_id', e.id);
    const drawProfileIds = new Set((draws ?? []).map((d) => d.profile_id));
    const { data: subs } = await supabase
      .from('submissions')
      .select('total_score')
      .eq('event_id', e.id)
      .eq('status', 'scored');
    const scoreMap = new Map<number, number>();
    for (const s of subs ?? []) {
      if (s.total_score === null) continue;
      scoreMap.set(s.total_score, (scoreMap.get(s.total_score) ?? 0) + 1);
    }
    let hasTies = false;
    for (const c of scoreMap.values()) { if (c > 1) { hasTies = true; break; } }
    if (!hasTies) continue;
    const { data: tsubs } = await supabase
      .from('submissions')
      .select('total_score, participant_id')
      .eq('event_id', e.id)
      .eq('status', 'scored');
    const scoreToPartic = new Map<number, string[]>();
    for (const s of tsubs ?? []) {
      if (s.total_score === null) continue;
      const list = scoreToPartic.get(s.total_score) ?? [];
      list.push(s.participant_id);
      scoreToPartic.set(s.total_score, list);
    }
    const { data: parts } = await supabase
      .from('event_participants')
      .select('id, profile_id')
      .in('id', [...scoreToPartic.values()].flat());
    const pidMap = new Map((parts ?? []).map((p) => [p.id, p.profile_id]));
    let allResolved = true;
    for (const [, pids] of scoreToPartic) {
      if (pids.length < 2) continue;
      const profileIds = pids.map((pid) => pidMap.get(pid) ?? '').filter(Boolean);
      if (!profileIds.every((pid) => drawProfileIds.has(pid))) { allResolved = false; break; }
    }
    if (!allResolved) eventsWithPendingTies.add(e.id);
  }

  // Metrics
  const activeCount = safeEvents.filter((e) => e.status === 'open').length;
  const draftCount = safeEvents.filter((e) => e.status === 'draft').length;
  const closedCount = safeEvents.filter((e) => e.status === 'predictions_closed').length;
  const rawCompletedCount = safeEvents.filter((e) => e.status === 'completed').length;
  const tiebreakerPendingCount = eventsWithPendingTies.size;
  const completedCount = rawCompletedCount - tiebreakerPendingCount;

  const metrics: MetricDef[] = [
    {
      label: 'Pick\'ems activos',
      value: activeCount,
      context: `Abiertos actualmente`,
      tone: 'purple',
      href: activeCount > 0 ? '/creator/pickems?status=open' : undefined,
    },
    {
      label: 'Participaciones totales',
      value: totalSubmissions,
      context: 'En todos tus Pick\'ems',
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

  // Attention items with priority ordering
  const attentionItems: AttentionItem[] = [];
  const pendingIds = new Set<string>();

  for (const event of safeEvents) {
    if (eventsWithPendingTies.has(event.id)) {
      pendingIds.add(event.id);
      attentionItems.push({
        title: event.title,
        slug: event.slug,
        actionType: 'resolve_tiebreaker' as ActionType,
        href: `/creator/pickems/${event.id}`,
      });
    } else if (event.status === 'predictions_closed') {
      pendingIds.add(event.id);
      attentionItems.push({
        title: event.title,
        slug: event.slug,
        actionType: 'register_results' as ActionType,
        href: `/creator/pickems/${event.id}/results`,
      });
    } else if (event.status === 'open') {
      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id);
      if (count === 0) {
        pendingIds.add(event.id);
        attentionItems.push({
          title: event.title,
          slug: event.slug,
          actionType: 'share_pickem' as ActionType,
          href: `/pickems/${event.slug}`,
        });
      }
    } else if (event.status === 'draft') {
      pendingIds.add(event.id);
      attentionItems.push({
        title: event.title,
        slug: event.slug,
        actionType: 'continue_setup' as ActionType,
        href: `/creator/pickems/${event.id}`,
      });
    }
  }

  // Sort by priority (lower = more urgent), then by ends_at proximity
  attentionItems.sort((a, b) => {
    const pa = ACTION_CONFIG[a.actionType]?.priority ?? 99;
    const pb = ACTION_CONFIG[b.actionType]?.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return 0;
  });

  // Limit to 5
  const visibleItems = attentionItems.slice(0, 5);

  // Recent activity (last 5 submissions)
  let creatorActivities: { display_name: string | null; event_title: string; event_slug: string; submitted_at: string }[] = [];
  if (safeEvents.length > 0) {
    const eventIds = safeEvents.map((e) => e.id);
    const { data: raw } = await supabase
      .from('submissions')
      .select(`
        submitted_at,
        event_id,
        event_participants!inner(profile_id),
        events!inner(title, slug)
      `)
      .in('event_id', eventIds)
      .order('submitted_at', { ascending: false })
      .limit(5);

    if (raw && raw.length > 0) {
      type RawRow = { event_participants?: { profile_id?: string }; events?: { title?: string; slug?: string }; submitted_at?: string };
      const rows = raw as RawRow[];

      const profileIds: string[] = [];
      for (const r of rows) {
        const pid = r.event_participants?.profile_id;
        if (pid) profileIds.push(pid);
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', profileIds);
      const profileMap = new Map((profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]));

      creatorActivities = rows.map((r) => {
        const name = profileMap.get(r.event_participants?.profile_id ?? '') ?? null;
        const title = r.events?.title ?? '';
        return {
          display_name: name,
          event_title: title,
          event_slug: r.events?.slug ?? '',
          submitted_at: r.submitted_at ?? '',
        };
      });

      if (process.env.NODE_ENV === 'development') {
        const diagnostics = creatorActivities.map((a) => ({
          hasActor: a.display_name !== null,
          hasEvent: a.event_title !== '',
          profileId: rows.map((r) => r.event_participants?.profile_id),
        }));
        console.info('[dashboard/activity] Mapped activities', { count: creatorActivities.length, diagnostics });
      }
    }
  }

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
        <Link
          href="/creator/pickems/new"
          className="self-start rounded-lg bg-purple-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
        >
          + Nuevo Pick&rsquo;em
        </Link>
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
