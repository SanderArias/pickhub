import { createServerClient } from '@/services/supabase';
import { requireAdmin } from '@/lib/auth';
import { approveCreator, rejectCreator, suspendCreator } from '@/app/actions/admin';

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400',
  approved: 'text-green-400',
  rejected: 'text-red-400',
  suspended: 'text-orange-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
};

function CreatorRow({
  creator,
}: {
  creator: {
    id: string;
    profile_id: string;
    handle: string;
    status: string;
    created_at: string;
    display_name: string | null;
  };
}) {
  return (
    <tr className="border-b border-zinc-700 text-sm">
      <td className="px-4 py-3 font-mono text-zinc-200">{creator.handle}</td>
      <td className="px-4 py-3 text-zinc-400">{creator.display_name ?? '—'}</td>
      <td className={`px-4 py-3 font-medium ${STATUS_COLORS[creator.status] ?? ''}`}>
        {STATUS_LABELS[creator.status] ?? creator.status}
      </td>
      <td className="px-4 py-3 text-zinc-500">
        {new Date(creator.created_at).toLocaleDateString()}
      </td>
      <td className="flex gap-2 px-4 py-3">
        {creator.status !== 'approved' && (
          <form action={approveCreator.bind(null, creator.profile_id)}>
            <button
              type="submit"
              className="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-600"
            >
              Aprobar
            </button>
          </form>
        )}
        {creator.status !== 'rejected' && (
          <form action={rejectCreator.bind(null, creator.profile_id)}>
            <button
              type="submit"
              className="rounded bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
            >
              Rechazar
            </button>
          </form>
        )}
        {creator.status !== 'suspended' && (
          <form action={suspendCreator.bind(null, creator.profile_id)}>
            <button
              type="submit"
              className="rounded bg-orange-700 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600"
            >
              Suspender
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}

export default async function AdminPage() {
  await requireAdmin();

  const supabase = await createServerClient();

  const [
    { count: totalUsers },
    { count: totalCreators },
    { count: pendingCreators },
    { count: approvedCreators },
    { data: creators },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'creator'),
    supabase
      .from('creator_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('creator_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved'),
    supabase
      .from('creator_profiles')
      .select('id, profile_id, handle, status, created_at, profile:profiles(display_name)')
      .order('created_at', { ascending: false }),
  ]);

  const rows = (creators ?? []).map((c) => {
    const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
    return {
      ...c,
      display_name: (profile as { display_name: string | null } | null)?.display_name ?? null,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-bold">Admin</h1>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Total usuarios
          </p>
          <p className="mt-1 text-3xl font-bold text-zinc-100">{totalUsers}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Total creadores
          </p>
          <p className="mt-1 text-3xl font-bold text-zinc-100">{totalCreators}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Pendientes
          </p>
          <p className="mt-1 text-3xl font-bold text-yellow-400">{pendingCreators}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Aprobados
          </p>
          <p className="mt-1 text-3xl font-bold text-green-400">{approvedCreators}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Creadores</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay creadores registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-700">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-900 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Handle</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((creator) => (
                  <CreatorRow key={creator.id} creator={creator} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
