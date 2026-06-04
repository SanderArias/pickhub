import Link from 'next/link';
import { createServerClient } from '@/services/supabase';
import { requireAdmin } from '@/lib/auth';
import { toggleActivity } from '@/app/actions/admin';

export default async function ActivitiesPage() {
  await requireAdmin();

  const supabase = await createServerClient();
  const { data: activities } = await supabase
    .from('dynamic_types')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300">
        &larr; Volver al admin
      </Link>

      <h1 className="text-2xl font-bold">Actividades</h1>
      <p className="text-sm text-zinc-500">
        Activa o desactiva las actividades disponibles para los creadores.
      </p>

      {!activities || activities.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay actividades registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-700">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-900 text-xs font-semibold uppercase tracking-wider text-zinc-500">
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
                <tr key={a.id} className="border-b border-zinc-700 text-sm">
                  <td className="px-4 py-3 font-medium text-zinc-200">{a.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{a.slug}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {a.description ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        a.is_enabled
                          ? 'bg-green-800 text-green-300'
                          : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {a.is_enabled ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleActivity.bind(null, a.id, a.is_enabled)}>
                      <button
                        type="submit"
                        className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                          a.is_enabled
                            ? 'bg-orange-700 text-orange-200 hover:bg-orange-600'
                            : 'bg-green-700 text-green-200 hover:bg-green-600'
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
