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
  if (!profile) redirect('/inicio');

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
          {sp.reason?.startsWith('twitch_error: access_denied')
            ? 'No autorizaste la conexión con Twitch. La verificación sigue inactiva.'
            : sp.reason?.startsWith('twitch_error')
              ? 'Twitch rechazó la solicitud. Vuelve a intentarlo.'
              : sp.reason?.startsWith('missing_scope')
                ? 'Twitch no concedió el permiso necesario para consultar suscriptores.'
                : sp.reason?.startsWith('token_exchange_failed')
                  ? 'No pudimos completar la conexión con Twitch. Vuelve a intentarlo.'
                  : sp.reason?.startsWith('encryption_failed')
                    ? 'Error interno al guardar la conexión. Contacta al soporte.'
                    : sp.reason?.startsWith('missing_config')
                      ? 'La conexión con Twitch no pudo completarse. Revisa la configuración del entorno.'
                      : sp.reason?.startsWith('state_failed') || sp.reason?.startsWith('invalid_state')
                        ? 'La sesión expiró o es inválida. Vuelve a intentarlo.'
                        : sp.reason?.startsWith('auth_failed')
                          ? 'Tu sesión expiró. Inicia sesión nuevamente.'
                          : `Error al activar la verificación: ${sp.reason ?? 'Error desconocido'}`}
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
