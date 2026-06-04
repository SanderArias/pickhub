import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/services/supabase';
import { getUser, signOut } from '@/app/actions/auth';
import { getCurrentProfile } from '@/lib/auth';

const ROLE_LABELS: Record<string, string> = {
  user: 'Usuario',
  creator: 'Creador',
  admin: 'Administrador',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-500',
  approved: 'text-green-500',
  rejected: 'text-red-500',
  suspended: 'text-orange-500',
};

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();

  if (!profile) {
    const supabase = await createServerClient();

    const profileQuery = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const allProfiles = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <div className="rounded-lg border border-red-700 bg-red-950 p-4 text-sm">
          <h2 className="mb-2 font-semibold text-red-300">Debug — Perfil no encontrado</h2>
          <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs text-red-200">
{`── getUser() ──────────────────────────────────────
user.id:           ${user.id}
user.email:        ${user.email ?? 'null'}
user.app_metadata: ${JSON.stringify(user.app_metadata, null, 2)}

── services/supabase/server.ts (createServerClient) ──
supabaseUrl: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ presentes' : '✗ FALTANTE'}
anonKey:     ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ presente' : '✗ FALTANTE'}

── profiles query (.eq('id', '${user.id}').maybeSingle()) ──
data:  ${JSON.stringify(profileQuery.data)}
error: ${JSON.stringify(profileQuery.error, null, 2)}
  .code:    ${profileQuery.error?.code ?? 'null'}
  .message: ${profileQuery.error?.message ?? 'null'}
  .details: ${profileQuery.error?.details ?? 'null'}
  .hint:    ${profileQuery.error?.hint ?? 'null'}

── profiles query (limit 5) ──
count: ${allProfiles.count ?? 'null'}
data:  ${JSON.stringify(allProfiles.data)}
error: ${JSON.stringify(allProfiles.error)}
`}
          </pre>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    );
  }

  const creator = profile.creator_profile;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="flex flex-col gap-3 text-sm">
        <p>
          <span className="text-zinc-400">Nombre:</span>{' '}
          <span className="text-zinc-200">{profile.display_name ?? '—'}</span>
        </p>
        <p>
          <span className="text-zinc-400">Rol:</span>{' '}
          <span className="font-medium text-zinc-200">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </span>
        </p>
        <p>
          <span className="text-zinc-400">Activo:</span>{' '}
          <span className={profile.is_active ? 'text-green-500' : 'text-red-500'}>
            {profile.is_active ? 'Sí' : 'No'}
          </span>
        </p>

        {creator ? (
          <div className="mt-4 flex flex-col gap-2 border-t border-zinc-700 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Perfil de creador
            </p>
            <p>
              <span className="text-zinc-400">Handle:</span>{' '}
              <span className="font-mono text-zinc-200">{creator.handle}</span>
            </p>
            <p>
              <span className="text-zinc-400">Estado:</span>{' '}
              <span className={`font-medium ${STATUS_COLORS[creator.status] ?? ''}`}>
                {STATUS_LABELS[creator.status] ?? creator.status}
              </span>
            </p>
            {creator.bio && (
              <p>
                <span className="text-zinc-400">Bio:</span>{' '}
                <span className="text-zinc-200">{creator.bio}</span>
              </p>
            )}
            {creator.status === 'approved' && (
              <div className="mt-2">
                <Link
                  href="/creator"
                  className="rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
                >
                  Panel de creador
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-4 border-t border-zinc-700 pt-4">
            <p className="text-zinc-500">Aún no tienes perfil de creador</p>
            <Link
              href="/onboarding/creator"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Convertirme en creador
            </Link>
          </div>
        )}

        {profile.role === 'admin' && (
          <div className="mt-4 border-t border-zinc-700 pt-4">
            <Link
              href="/admin"
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              Panel admin
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
