import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCurrentProfile } from '@/lib/auth';
import { createServerClient } from '@/services/supabase';
import { getUserParticipations } from '@/app/actions/participant';
import { StatusBadge } from '@/components/ui';
import { RequestCreatorAccessForm } from './RequestCreatorAccessForm';

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

export default async function InicioPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const displayName = profile.display_name || user.email?.split('@')[0] || 'Usuario';
  const creatorProfile = profile.creator_profile;

  const hasCreatorProfile = creatorProfile !== null;
  const creatorStatus = creatorProfile?.status ?? null;
  const isApproved = profile.role === 'creator' && creatorStatus === 'approved';
  const isAdmin = profile.role === 'admin';
  const isPending = creatorStatus === 'pending';
  const isRejected = creatorStatus === 'rejected';
  const isSuspended = creatorStatus === 'suspended';
  const isReopened = creatorStatus === 'reopened';

  // Data for all users
  const participations = await getUserParticipations('all');

  // Data for creators
  let activeCount = 0;
  let draftCount = 0;
  let submissionCount = 0;
  let creatorActivities: ActivityItem[] = [];
  let attentionItems: { title: string; description: string; href: string; label: string }[] = [];

  if (isApproved || isAdmin) {
    const supabase = await createServerClient();
    const creatorId = creatorProfile!.id;

    const { data: events } = await supabase
      .from('events')
      .select('id, title, slug, status')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    const safeEvents = events ?? [];
    activeCount = safeEvents.filter((e) => e.status === 'open').length;
    draftCount = safeEvents.filter((e) => e.status === 'draft').length;

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

      // Build attention items (max 3)
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
              label: 'Compartir Pick\'em',
            });
          }
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-text-primary">Bienvenido de nuevo, {displayName}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isApproved || isAdmin
              ? `Tienes ${activeCount} Pick'em${activeCount !== 1 ? 'es' : ''} activo${activeCount !== 1 ? 's' : ''} y ${submissionCount} participación${submissionCount !== 1 ? 'es' : ''} en total.`
              : 'Consulta tus Pick\'ems, revisa tus predicciones y sigue tus resultados.'}
          </p>
        </div>
        {(isApproved || isAdmin) && (
          <Link
            href="/creator/pickems/new"
            className="shrink-0 rounded-lg border border-purple-primary px-4 py-2 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
          >
            Crear nuevo Pick'em
          </Link>
        )}
      </div>

      {/* Creator metrics */}
      {(isApproved || isAdmin) && (
        <>
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
        </>
      )}

      {/* Non-creator status messages */}
      {!isApproved && !isAdmin && (
        <div className="flex flex-col gap-4">
          {(isReopened || !hasCreatorProfile) && (
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-text-primary">
                    Solicita acceso anticipado al modo creador
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    {isReopened
                      ? 'Tu solicitud anterior fue reabierta. Puedes enviar una nueva solicitud cuando quieras.'
                      : 'Crea Pick\'ems, configura predicciones y comparte dinámicas con tu comunidad.'}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <RequestCreatorAccessForm />
              </div>
            </div>
          )}

          {isPending && (
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-text-primary">
                      Solicitud en revisión
                    </h2>
                    <StatusBadge status="pending" label="En revisión" />
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Tu solicitud para acceder al modo creador de PickHub fue recibida. Revisaremos tu perfil y te notificaremos cuando esté disponible.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-text-primary">
                      Solicitud no aprobada
                    </h2>
                    <StatusBadge status="rejected" label="No aprobada" />
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Tu solicitud no fue aprobada por ahora.
                  </p>
                  {creatorProfile?.reason && (
                    <p className="mt-2 rounded-md bg-surface-elevated px-3 py-2 text-xs text-text-muted">
                      {creatorProfile.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isSuspended && (
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-text-primary">
                      Acceso pausado
                    </h2>
                    <StatusBadge status="suspended" label="Pausado" />
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Tu acceso al modo creador está pausado.
                  </p>
                  {creatorProfile?.reason && (
                    <p className="mt-2 rounded-md bg-surface-elevated px-3 py-2 text-xs text-text-muted">
                      {creatorProfile.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mis participaciones — for all users */}
      {participations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-secondary">
            No has participado en ningún Pick'em todavía.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-primary">Mis participaciones</h2>
            <Link
              href="/participaciones"
              className="text-xs text-purple-primary transition-colors hover:text-purple-hover"
            >
              Ver todas &rarr;
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {participations.slice(0, 5).map((p) => (
              <Link
                key={p.submissionId}
                href={`/pickems/${p.eventSlug}`}
                className="rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-hover"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">{p.eventTitle}</span>
                  <span className="shrink-0 text-xs text-text-muted">
                    {p.eventEndsAt && p.eventEndsAt <= new Date().toISOString() ? 'Cerrado' : 'Abierto'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  {p.creatorDisplayName ?? p.creatorHandle ?? '—'} · {p.answersCount} predicción{p.answersCount !== 1 ? 'es' : ''}
                  {p.submittedAt ? ` · ${new Date(p.submittedAt).toLocaleDateString()}` : ''}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Creator community activity */}
      {(isApproved || isAdmin) && (
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
      )}
    </div>
  );
}
