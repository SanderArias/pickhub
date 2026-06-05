import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCurrentProfile } from '@/lib/auth';
import { createServerClient } from '@/services/supabase';

interface ActivityItem {
  display_name: string | null;
  event_title: string;
  event_slug: string;
  submitted_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

export default async function CreatorDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login');

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

  const { data: events } = await supabase
    .from('events')
    .select('id, title, slug, status')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  const safeEvents = events ?? [];
  const activeCount = safeEvents.filter((e) => e.status === 'open').length;
  const draftCount = safeEvents.filter((e) => e.status === 'draft').length;
  let submissionCount = 0;
  let creatorActivities: ActivityItem[] = [];
  const attentionItems: { title: string; description: string; href: string; label: string }[] = [];

  if (safeEvents.length > 0) {
    const eventIds = safeEvents.map((e) => e.id);

    const { count: sc } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds);
    submissionCount = sc ?? 0;

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

    const profileIds = [...new Set((raw ?? []).map((r: any) => r.event_participants?.profile_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    creatorActivities = (raw ?? []).map((r: any) => ({
      display_name: profileMap.get(r.event_participants?.profile_id) ?? null,
      event_title: r.events?.title ?? '',
      event_slug: r.events?.slug ?? '',
      submitted_at: r.submitted_at ?? '',
    }));

    for (const event of safeEvents) {
      if (attentionItems.length >= 3) break;

      if (event.status === 'draft') {
        attentionItems.push({
          title: event.title,
          description: 'Borrador incompleto',
          href: `/creator/pickems/${event.id}`,
          label: 'Continuar configuración',
        });
      } else if (event.status === 'predictions_closed') {
        attentionItems.push({
          title: event.title,
          description: 'Resultados pendientes',
          href: `/creator/pickems/${event.id}/results`,
          label: 'Publicar resultados',
        });
      } else if (event.status === 'open') {
        const { count } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        if (count === 0) {
          const slug = safeEvents.find((e) => e.id === event.id)?.slug;
          attentionItems.push({
            title: event.title,
            description: 'Sin participaciones todavía',
            href: slug ? `/pickems/${slug}` : `/creator/pickems/${event.id}`,
            label: "Compartir Pick'em",
          });
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Panel de control de tus Pick'ems.
          </p>
        </div>
        <Link
          href="/creator/pickems/new"
          className="shrink-0 rounded-lg bg-purple-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
        >
          + Nuevo Pick'em
        </Link>
      </div>

      {/* Creator metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs text-text-muted">Pick'ems activos</p>
          <p className="mt-1 text-3xl font-bold text-text-primary">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs text-text-muted">Participaciones</p>
          <p className="mt-1 text-3xl font-bold text-purple-primary">{submissionCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs text-text-muted">Borradores</p>
          <p className="mt-1 text-3xl font-bold text-text-primary">{draftCount}</p>
        </div>
      </div>

      {/* Attention items */}
      {attentionItems.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-text-primary">Requieren atención</h2>
          <div className="flex flex-col gap-3">
            {attentionItems.map((item) => (
              <div
                key={item.href}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{item.title}</p>
                  <p className="text-xs text-text-muted">{item.description}</p>
                </div>
                <Link
                  href={item.href}
                  className="shrink-0 rounded-lg border border-purple-primary px-4 py-2 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
                >
                  {item.label}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Community activity */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Actividad reciente</h2>
          <Link
            href="/creator/activity"
            className="text-xs text-purple-primary transition-colors hover:text-purple-hover"
          >
            Ver todo
          </Link>
        </div>
        {creatorActivities.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center">
            <p className="text-sm text-text-muted">
              Aún no hay participaciones recientes.
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Invita a tu comunidad a participar en tus Pick'ems.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {creatorActivities.map((a, i) => (
              <Link
                key={i}
                href={`/pickems/${a.event_slug}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-hover"
              >
                <p className="text-sm text-text-primary truncate">
                  <span className="font-medium">{a.display_name ?? 'Alguien'}</span>
                  <span className="text-text-muted"> participó en </span>
                  <span className="font-medium">{a.event_title}</span>
                </p>
                <span className="shrink-0 text-xs text-text-muted">{timeAgo(a.submitted_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
