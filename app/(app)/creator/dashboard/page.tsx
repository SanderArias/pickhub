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

  // Metrics
  const activeCount = safeEvents.filter((e) => e.status === 'open').length;
  const draftCount = safeEvents.filter((e) => e.status === 'draft').length;
  const closedCount = safeEvents.filter((e) => e.status === 'predictions_closed').length;
  const completedCount = safeEvents.filter((e) => e.status === 'completed').length;

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
      value: closedCount + draftCount,
      context: `${closedCount} cerrados · ${draftCount} borradores`,
      tone: closedCount > 0 ? 'warning' : 'neutral',
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
    if (event.status === 'predictions_closed') {
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
      const profileIds = (raw as { event_participants?: { profile_id?: string }[] }[])
        .map((r) => r.event_participants?.[0]?.profile_id)
        .filter((id): id is string => !!id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', profileIds);
      const profileMap = new Map((profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]));

      creatorActivities = (raw as { event_participants?: { profile_id?: string }[]; events?: { title?: string; slug?: string }[]; submitted_at?: string }[]).map((r) => ({
        display_name: profileMap.get(r.event_participants?.[0]?.profile_id ?? '') ?? null,
        event_title: r.events?.[0]?.title ?? '',
        event_slug: r.events?.[0]?.slug ?? '',
        submitted_at: r.submitted_at ?? '',
      }));
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
