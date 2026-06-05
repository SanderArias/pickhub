import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCurrentProfile } from '@/lib/auth';
import { createServerClient } from '@/services/supabase';

interface ActivityEntry {
  type: 'submission';
  actorName: string | null;
  eventTitle: string;
  eventSlug: string;
  timestamp: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login');

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

  let activities: ActivityEntry[] = [];

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

      const profileIds = [
        ...new Set((submissions ?? []).map((r: any) => r.event_participants?.profile_id).filter(Boolean)),
      ];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', profileIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

      activities = (submissions ?? []).map((r: any) => ({
        type: 'submission' as const,
        actorName: profileMap.get(r.event_participants?.profile_id) ?? null,
        eventTitle: r.events?.title ?? '',
        eventSlug: r.events?.slug ?? '',
        timestamp: r.submitted_at ?? '',
      }));
    }
  }

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
      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-text-muted">No hay actividad registrada todavía.</p>
          <p className="mt-1 text-xs text-text-secondary">
            Cuando tu comunidad participe en tus Pick'ems, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {activities.map((entry, i) => (
            <a
              key={`${entry.eventSlug}-${entry.timestamp}-${i}`}
              href={`/pickems/${entry.eventSlug}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-hover"
            >
              <div className="min-w-0">
                <p className="text-sm text-text-primary truncate">
                  <span className="font-medium">{entry.actorName ?? 'Alguien'}</span>
                  <span className="text-text-muted"> participó en </span>
                  <span className="font-medium">{entry.eventTitle}</span>
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-[11px] text-text-muted">
                  Participación
                </span>
                <span className="text-xs text-text-muted">{timeAgo(entry.timestamp)}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
