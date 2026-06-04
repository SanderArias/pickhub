import { createServerClient } from '@/services/supabase';
import { requireAdmin } from '@/lib/auth';
import { approveCreator, rejectCreator, suspendCreator } from '@/app/actions/admin';

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-warning',
  approved: 'text-success',
  rejected: 'text-danger',
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
    <tr className="border-b border-border text-sm">
      <td className="px-4 py-3 font-mono text-text-primary">{creator.handle}</td>
      <td className="px-4 py-3 text-text-secondary">{creator.display_name ?? '—'}</td>
      <td className={`px-4 py-3 font-medium ${STATUS_COLORS[creator.status] ?? ''}`}>
        {STATUS_LABELS[creator.status] ?? creator.status}
      </td>
      <td className="px-4 py-3 text-text-muted">
        {new Date(creator.created_at).toLocaleDateString()}
      </td>
      <td className="flex gap-2 px-4 py-3">
        {creator.status !== 'approved' && (
          <form action={approveCreator.bind(null, creator.profile_id)}>
            <button
              type="submit"
              className="rounded-lg bg-surface px-3 py-1 text-xs font-medium text-success transition-colors hover:bg-surface-hover"
            >
              Aprobar
            </button>
          </form>
        )}
        {creator.status !== 'rejected' && (
          <form action={rejectCreator.bind(null, creator.profile_id)}>
            <button
              type="submit"
              className="rounded-lg bg-surface px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-surface-hover"
            >
              Rechazar
            </button>
          </form>
        )}
        {creator.status !== 'suspended' && (
          <form action={suspendCreator.bind(null, creator.profile_id)}>
            <button
              type="submit"
              className="rounded-lg bg-surface px-3 py-1 text-xs font-medium text-warning transition-colors hover:bg-surface-hover"
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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Panel admin</h1>
        <p className="mt-1 text-sm text-text-secondary">Administra creadores y configura la plataforma.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium tracking-wider text-text-muted">
            Usuarios
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{totalUsers ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium tracking-wider text-text-muted">
            Creadores
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{totalCreators ?? 0}</p>
        </div>
        <div className="rounded-lg border border-warning-border bg-surface p-4">
          <p className="text-xs font-medium tracking-wider text-text-muted">
            Pendientes
          </p>
          <p className="mt-1 text-2xl font-bold text-warning">{pendingCreators ?? 0}</p>
        </div>
        <div className="rounded-lg border border-purple-border bg-surface p-4">
          <p className="text-xs font-medium tracking-wider text-text-muted">
            Aprobados
          </p>
          <p className="mt-1 text-2xl font-bold text-purple-primary">{approvedCreators ?? 0}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-surface-elevated text-xs font-semibold uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Handle</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Creado</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {creators?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                  No hay creadores registrados.
                </td>
              </tr>
            )}
            {creators?.map((c) => <CreatorRow key={c.id} creator={c as unknown as { id: string; profile_id: string; handle: string; status: string; created_at: string; display_name: string | null }} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
