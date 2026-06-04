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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#e8e8e8]">Actividades</h1>
      <p className="text-sm text-[#555]">
        Activa o desactiva las actividades disponibles para los creadores.
      </p>

      {!activities || activities.length === 0 ? (
        <p className="text-sm text-[#555]">No hay actividades registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#1f1f1f]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#0a0a0a] text-xs font-semibold uppercase tracking-wider text-[#555]">
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
                <tr key={a.id} className="border-b border-[#1f1f1f] text-sm">
                  <td className="px-4 py-3 font-medium text-[#e8e8e8]">{a.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#555]">{a.slug}</td>
                  <td className="px-4 py-3 text-[#888]">
                    {a.description ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={a.is_enabled ? 'enabled' : 'disabled'}
                      label={a.is_enabled ? 'Activa' : 'Inactiva'}
                    />
                  </td>
                  <td className="px-4 py-3 text-[#555]">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleActivity.bind(null, a.id, a.is_enabled)}>
                      <button
                        type="submit"
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          a.is_enabled
                            ? 'bg-[#111] text-orange-400 hover:bg-[#1a1a1a]'
                            : 'bg-[#111] text-emerald-400 hover:bg-[#1a1a1a]'
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
