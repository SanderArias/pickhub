import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getCreatorProfile } from '@/app/actions/creator';

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const creator = await getCreatorProfile();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="flex flex-col gap-2 text-sm text-zinc-500">
        <p>Usuario: {user.email ?? user.id}</p>
        {creator ? (
          <p>
            Eres creador — <span className="font-mono">{creator.handle}</span>
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p>Aún no tienes perfil de creador</p>
            <Link
              href="/onboarding/creator"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Convertirme en creador
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
