import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { createServerClient } from '@/services/supabase';
import { getActivityLastSeenAt, updateActivityLastSeenAt } from '@/app/actions/activity';
import { ActivityFeed } from '@/components/activity/ActivityFeed';

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const creatorProfile = profile.creator_profile;
  const isApproved = profile.role === 'creator' && creatorProfile?.status === 'approved';
  const isAdmin = profile.role === 'admin';

  if (!isApproved && !isAdmin) redirect('/inicio');

  const { filter } = await searchParams;
  const activeFilter = filter === 'participaciones' ? 'participaciones' : 'todo';

  const supabase = await createServerClient();
  const creatorId = creatorProfile!.id;

  const { data: events } = await supabase
    .from('events')
    .select('id, title, slug')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  const safeEvents = events ?? [];
  const eventIds = safeEvents.map((e) => e.id);

  // Get previous last_seen_at before updating it
  const previousLastSeenAt = await getActivityLastSeenAt();

  let activities: Array<{
    type: 'submission';
    actorName: string | null;
    eventTitle: string;
    eventSlug: string;
    timestamp: string;
    isNew: boolean;
  }> = [];

  if (eventIds.length > 0) {
    if (activeFilter === 'todo' || activeFilter === 'participaciones') {
      const { data: submissions } = await supabase
        .from('submissions')
        .select(`
          submitted_at,
          event_id,
          event_participants!inner(profile_id),
          events!inner(title, slug)
        `)
        .in('event_id', eventIds)
        .order('submitted_at', { ascending: false })
        .limit(50);

      type SubmissionRow = { event_participants?: { profile_id?: string }; events?: { title?: string; slug?: string }; submitted_at?: string };
      const rows = (submissions ?? []) as SubmissionRow[];

      const profileIds: string[] = [];
      for (const r of rows) {
        const pid = r.event_participants?.profile_id;
        if (pid) profileIds.push(pid);
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', profileIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

      activities = rows.map((r) => ({
        type: 'submission' as const,
        actorName: profileMap.get(r.event_participants?.profile_id ?? '') ?? null,
        eventTitle: r.events?.title ?? '',
        eventSlug: r.events?.slug ?? '',
        timestamp: r.submitted_at ?? '',
        isNew: previousLastSeenAt && r.submitted_at ? r.submitted_at > previousLastSeenAt : true,
      }));
    }
  }

  // Mark as seen server-side so sidebar badge updates on next render
  await updateActivityLastSeenAt();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Actividad</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Movimientos recientes de tu comunidad en tus Pick'ems.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        {[
          { key: 'todo', label: 'Todo' },
          { key: 'participaciones', label: 'Participaciones' },
        ].map((tab) => {
          const isActive = activeFilter === tab.key;
          const href = tab.key === 'todo' ? '/creator/activity' : '/creator/activity?filter=participaciones';
          return (
            <a
              key={tab.key}
              href={href}
              className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-purple-primary font-medium text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      {/* Feed */}
      <ActivityFeed activities={activities} />
    </div>
  );
}
