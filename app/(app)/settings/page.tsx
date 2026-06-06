import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCurrentProfile, checkTwitchLinked } from '@/lib/auth';
import { TwitchConnectionCard } from './TwitchConnectionCard';

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { hasLinkedTwitch, twitchUsername, twitchAvatarUrl } = await checkTwitchLinked(user, profile);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Configuración</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Administra tu cuenta y conexiones.
        </p>
      </div>

      <TwitchConnectionCard
        hasTwitch={hasLinkedTwitch}
        twitchUsername={twitchUsername}
        avatarUrl={twitchAvatarUrl}
      />
    </div>
  );
}
