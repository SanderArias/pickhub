import { createServerClient } from '@/services/supabase';
import { requireAdmin } from '@/lib/auth';
import { AdminCreatorRow } from './AdminCreatorRow';

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
          <p className="text-xs font-medium tracking-wider text-text-muted">Usuarios</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{totalUsers ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium tracking-wider text-text-muted">Creadores</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{totalCreators ?? 0}</p>
        </div>
        <div className="rounded-lg border border-warning-border bg-surface p-4">
          <p className="text-xs font-medium tracking-wider text-text-muted">Pendientes</p>
          <p className="mt-1 text-2xl font-bold text-warning">{pendingCreators ?? 0}</p>
        </div>
        <div className="rounded-lg border border-purple-border bg-surface p-4">
          <p className="text-xs font-medium tracking-wider text-text-muted">Aprobados</p>
          <p className="mt-1 text-2xl font-bold text-purple-primary">{approvedCreators ?? 0}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
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
            {!creators || creators.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                  No hay creadores registrados.
                </td>
              </tr>
            ) : (
              creators.map((c) => {
                const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
                return (
                  <AdminCreatorRow
                    key={c.id}
                    creator={{
                      id: c.id,
                      profile_id: c.profile_id,
                      handle: c.handle,
                      status: c.status,
                      created_at: c.created_at,
                      display_name: profile?.display_name ?? null,
                    }}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
