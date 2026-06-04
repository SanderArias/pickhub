import Link from 'next/link';
import { createServerClient } from '@/services/supabase';
import { requireAdmin } from '@/lib/auth';
import {
  createTemplate,
  deleteTemplate,
  toggleTemplate,
} from '@/app/actions/admin';

export default async function TemplatesPage() {
  await requireAdmin();

  const supabase = await createServerClient();
  const { data: templates } = await supabase
    .from('tournament_templates')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300">
        &larr; Volver al admin
      </Link>

      <h1 className="text-2xl font-bold">Plantillas de torneo</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold">Nueva plantilla</h2>
          <form
            action={createTemplate}
            className="flex flex-col gap-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4"
          >
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-300">
                Nombre
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-300">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label htmlFor="logo_url" className="mb-1 block text-sm font-medium text-zinc-300">
                Logo URL
              </label>
              <input
                id="logo_url"
                name="logo_url"
                type="url"
                className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="max_participants"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Máx. participantes
                </label>
                <input
                  id="max_participants"
                  name="max_participants"
                  type="number"
                  min={1}
                  className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label
                  htmlFor="pickem_close_before"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Cierre de picks antes del evento
                </label>
                <input
                  id="pickem_close_before"
                  name="pickem_close_before"
                  type="text"
                  placeholder="ej. 2h o 30m"
                  className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
            >
              Crear plantilla
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Plantillas existentes</h2>
          {!templates || templates.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay plantillas aún.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-zinc-100">
                        {t.name}
                      </h3>
                      {t.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <form action={toggleTemplate.bind(null, t.id, t.is_active)}>
                      <button
                        type="submit"
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                          t.is_active
                            ? 'bg-green-800 text-green-300 hover:bg-green-700'
                            : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                        }`}
                      >
                        {t.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </form>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {t.max_participants && <span>Máx: {t.max_participants}</span>}
                    {t.pickem_close_before && (
                      <span>Cierre: {t.pickem_close_before} antes</span>
                    )}
                    <span>
                      Creada: {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <form action={deleteTemplate.bind(null, t.id)}>
                      <button
                        type="submit"
                        className="rounded bg-red-800 px-2 py-1 text-xs text-red-200 hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
