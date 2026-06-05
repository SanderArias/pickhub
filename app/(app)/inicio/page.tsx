import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCurrentProfile } from '@/lib/auth';
import { createServerClient } from '@/services/supabase';
import { getUserParticipations } from '@/app/actions/participant';
import { StatusBadge } from '@/components/ui';
import { RequestCreatorAccessForm } from './RequestCreatorAccessForm';

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

  if (isApproved || isAdmin) {
    const supabase = await createServerClient();

    if (isAdmin && !isApproved) {
      return (
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Bienvenido de nuevo, {displayName}</h1>
            <p className="mt-1 text-sm text-text-secondary">Panel de administración de PickHub.</p>
          </div>
          <Link
            href="/admin"
            className="self-start rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
          >
            Ir al panel admin
          </Link>
        </div>
      );
    }

    const creatorId = creatorProfile!.id;

    const { count: total } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId);

    const pickemCount = total ?? 0;

    const { data: recent } = await supabase
      .from('events')
      .select('id, title, status, created_at')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(5);

    const activePickems = recent ?? [];

    const { count: drafts } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('status', 'draft');

    const draftCount = drafts ?? 0;

    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Bienvenido de nuevo, {displayName}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Crea dinámicas para tu comunidad, gestiona torneos y premia a tus seguidores.
            </p>
          </div>
          <StatusBadge status="approved" label="Acceso activo" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-text-muted">Pick&apos;ems creados</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{pickemCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-text-muted">Borradores</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{draftCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-text-muted">Estado</p>
            <p className="mt-1 text-2xl font-bold text-purple-primary">Activo</p>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Acciones rápidas</h2>
          <div className="grid gap-2 sm:grid-cols-3">
              <Link
                  href="/creator"
                  className="rounded-lg border border-purple-border bg-surface p-4 transition-colors hover:border-purple-primary"
                >
                  <p className="text-sm font-medium text-purple-primary">Ir al panel de creador</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Ya tienes acceso al modo creador de PickHub.
                  </p>
                </Link>
                <Link
                  href="/creator/pickems/new"
                  className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-hover"
                >
                  <p className="text-sm font-medium text-text-primary">Nuevo Pick&apos;em</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Crea una nueva dinámica de predicciones
                  </p>
                </Link>
                <Link
                  href="/creator/pickems"
                  className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-hover"
                >
                  <p className="text-sm font-medium text-text-primary">Mis Pick&apos;ems</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Gestiona tus dinámicas existentes
                  </p>
                </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-hover"
              >
                <p className="text-sm font-medium text-text-primary">Panel admin</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Administra creadores y configura la plataforma
                </p>
              </Link>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Actividad reciente</h2>
          {activePickems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
              <p className="text-sm text-text-muted">
                Todavía no has creado ningún Pick&apos;em.
              </p>
              <Link
                href="/creator/pickems/new"
                className="mt-3 inline-block rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
              >
                Crear mi primer Pick&apos;em
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {activePickems.map((p) => (
                <Link
                  key={p.id}
                  href={`/creator/pickems/${p.id}`}
                  className="rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-hover"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-text-primary">{p.title}</span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {p.status === 'draft' ? 'Borrador' : p.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const participations = await getUserParticipations('all');

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Bienvenido de nuevo, {displayName}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Consulta tus Pick&apos;ems, revisa tus predicciones y sigue tus resultados.
        </p>
      </div>

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
                    : 'Crea Pick&apos;ems, configura predicciones y comparte din&aacute;micas con tu comunidad.'}
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
                  Tu acceso al modo creador est&aacute; pausado.
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

      {participations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-secondary">
            No has participado en ningún Pick&apos;em todavía.
          </p>
          <span className="mt-3 inline-block cursor-not-allowed rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted opacity-30">
            Explorar Pick&apos;ems
          </span>
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
    </div>
  );
}
