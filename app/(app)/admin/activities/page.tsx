import { createServerClient } from '@/services/supabase';
import { requireAdmin } from '@/lib/auth';
import { toggleActivity } from '@/app/actions/admin';
import { StatusBadge } from '@/components/ui';

export default async function ActivitiesPage() {
  await requireAdmin();

  const supabase = await createServerClient();
  const { data: activities } = await supabase
    .from('dynamic_types')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Actividades</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Activa o desactiva las actividades disponibles para los creadores.
        </p>
      </div>

      {!activities || activities.length === 0 ? (
        <p className="text-sm text-text-muted">No hay actividades registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-elevated text-xs font-semibold tracking-wider text-text-muted">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Creada</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b border-border text-sm">
                  <td className="px-4 py-3 font-medium text-text-primary">{a.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{a.slug}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {a.description ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={a.is_enabled ? 'enabled' : 'disabled'}
                      label={a.is_enabled ? 'Activa' : 'Inactiva'}
                    />
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleActivity.bind(null, a.id, a.is_enabled)}>
                      <button
                        type="submit"
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          a.is_enabled
                            ? 'bg-surface text-orange-400 hover:bg-surface-hover'
                            : 'bg-surface text-success hover:bg-surface-hover'
                        }`}
                      >
                        {a.is_enabled ? 'Desactivar' : 'Activar'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
