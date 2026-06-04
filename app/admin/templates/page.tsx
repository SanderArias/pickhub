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
      <h1 className="text-2xl font-bold text-[#e8e8e8]">Plantillas de torneo</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#e8e8e8]">Nueva plantilla</h2>
          <form
            action={createTemplate}
            className="flex flex-col gap-4 rounded-lg border border-[#1f1f1f] bg-[#111] p-4"
          >
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-[#888]">
                Nombre
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-[#888]">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
              />
            </div>

            <div>
              <label htmlFor="logo_url" className="mb-1 block text-sm font-medium text-[#888]">
                Logo URL
              </label>
              <input
                id="logo_url"
                name="logo_url"
                type="url"
                className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="max_participants"
                  className="mb-1 block text-sm font-medium text-[#888]"
                >
                  Máx. participantes
                </label>
                <input
                  id="max_participants"
                  name="max_participants"
                  type="number"
                  min={1}
                  className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
                />
              </div>
              <div>
                <label
                  htmlFor="pickem_close_before"
                  className="mb-1 block text-sm font-medium text-[#888]"
                >
                  Cierre de picks antes del evento
                </label>
                <input
                  id="pickem_close_before"
                  name="pickem_close_before"
                  type="text"
                  placeholder="ej. 2h o 30m"
                  className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-md bg-[#e8e8e8] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white"
            >
              Crear plantilla
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#e8e8e8]">Plantillas existentes</h2>
          {!templates || templates.length === 0 ? (
            <p className="text-sm text-[#555]">No hay plantillas aún.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-[#1f1f1f] bg-[#111] p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[#e8e8e8]">
                        {t.name}
                      </h3>
                      {t.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#888]">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <form action={toggleTemplate.bind(null, t.id, t.is_active)}>
                      <button
                        type="submit"
                        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                          t.is_active
                            ? 'bg-[#111] text-emerald-400 hover:bg-[#1a1a1a]'
                            : 'bg-[#111] text-[#555] hover:bg-[#1a1a1a]'
                        }`}
                      >
                        {t.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </form>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#555]">
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
                        className="rounded-md bg-[#111] px-2 py-1 text-xs text-red-400 transition-colors hover:bg-[#1a1a1a]"
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
