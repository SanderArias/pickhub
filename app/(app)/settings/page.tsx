import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCurrentProfile, checkTwitchLinked } from '@/lib/auth';
import { getSubVerificationStatus } from '@/app/actions/twitch-sub-verification';
import { TwitchConnectionCard } from './TwitchConnectionCard';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sub_verification?: string; reason?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile(user);
  if (!profile) redirect('/login');

  const { hasLinkedTwitch, twitchUsername, twitchAvatarUrl } = await checkTwitchLinked(user, profile);
  const subStatus = await getSubVerificationStatus();
  const sp = await searchParams;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Configuración</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Administra tu cuenta y conexiones.
        </p>
      </div>

      {(sp.sub_verification === 'activated') && (
        <div className="rounded-lg border border-success-border bg-success/5 p-3 text-sm text-success">
          Verificación de suscriptores activada correctamente.
        </div>
      )}

      {sp.sub_verification === 'error' && (
        <div className="rounded-lg border border-danger-border bg-danger/5 p-3 text-sm text-danger">
          Error al activar la verificación: {sp.reason ?? 'Error desconocido'}
        </div>
      )}

      <TwitchConnectionCard
        hasTwitch={hasLinkedTwitch}
        twitchUsername={twitchUsername}
        avatarUrl={twitchAvatarUrl}
        subVerificationStatus={subStatus}
      />
    </div>
  );
}
