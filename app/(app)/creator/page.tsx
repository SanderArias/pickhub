import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCurrentProfile } from '@/lib/auth';
import { StatusBadge } from '@/components/ui';

export default async function CreatorProfilePage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const creatorProfile = profile.creator_profile;
  if (!creatorProfile) redirect('/inicio');

  const statusLabels: Record<string, string> = {
    pending: 'En revisión',
    approved: 'Aprobado',
    rejected: 'No aprobada',
    suspended: 'Pausado',
    reopened: 'Reabierto',
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Mi perfil de creador</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Información de tu cuenta de creador en PickHub.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-xs text-text-muted">Handle</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">
              @{creatorProfile.handle}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs text-text-muted">Estado</p>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={creatorProfile.status} label={statusLabels[creatorProfile.status] ?? creatorProfile.status} />
          </div>
        </div>

        {creatorProfile.bio && (
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-xs text-text-muted">Bio</p>
            <p className="mt-1 text-sm text-text-primary">{creatorProfile.bio}</p>
          </div>
        )}

        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs text-text-muted">Creado el</p>
          <p className="mt-1 text-sm text-text-primary">
            {new Date(creatorProfile.created_at).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {creatorProfile.reason && (
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-xs text-text-muted">Motivo</p>
            <p className="mt-1 text-sm text-text-primary">{creatorProfile.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
