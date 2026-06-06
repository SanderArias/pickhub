import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCurrentProfile, checkTwitchLinked } from '@/lib/auth';
import { getDisplayUser } from '@/lib/getDisplayUser';
import { getUserParticipations } from '@/app/actions/participant';
import { StatusBadge } from '@/components/ui';
import { RequestCreatorAccessForm } from './RequestCreatorAccessForm';

export default async function InicioPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile(user);
  if (!profile) redirect('/login');

  const displayName = getDisplayUser(profile, user);
  const creatorProfile = profile.creator_profile;

  const hasCreatorProfile = creatorProfile !== null;
  const creatorStatus = creatorProfile?.status ?? null;
  const isAdmin = profile.role === 'admin';
  const isApproved = profile.role === 'creator' && creatorStatus === 'approved';
  const isPending = creatorStatus === 'pending';
  const isRejected = creatorStatus === 'rejected';
  const isSuspended = creatorStatus === 'suspended';
  const isReopened = creatorStatus === 'reopened';
  const { hasLinkedTwitch } = await checkTwitchLinked(user, profile);

  const participations = await getUserParticipations('all');

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-text-primary">Bienvenido de nuevo, {displayName}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Consulta tus Pick'ems, revisa tus predicciones y sigue tus resultados.
          </p>
        </div>
      </div>

      {/* Creator access status */}
      {!isApproved && !isAdmin && (
        <div className="flex flex-col gap-4">
          {(isReopened || !hasCreatorProfile) && (
            <>
              {!hasLinkedTwitch ? (
                <div className="rounded-lg border border-border bg-surface p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-text-primary">
                        Conecta tu cuenta de Twitch
                      </h2>
                      <p className="mt-1 text-xs text-text-secondary">
                        Para solicitar acceso de creador debes enlazar una cuenta de Twitch.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/settings"
                      className="inline-block rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
                    >
                      Ir a configuración
                    </Link>
                  </div>
                </div>
              ) : (
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
            </>
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

      {/* Mis participaciones */}
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
    </div>
  );
}
