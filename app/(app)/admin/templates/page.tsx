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
  const { data: templates } = await (supabase as any)
    .from('tournament_templates')
    .select('*')
    .order('created_at', { ascending: false }) as { data: any[] | null };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Plantillas de torneo</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Administra las plantillas predefinidas para torneos.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Nueva plantilla</h2>
          <form
            action={createTemplate}
            className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
          >
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Nombre
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Ej. ESL Pro League S20"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rounds" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Rondas
                </label>
                <input
                  id="rounds"
                  name="rounds"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary"
                />
              </div>
              <div>
                <label htmlFor="teams" className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Equipos
                </label>
                <input
                  id="teams"
                  name="teams"
                  type="number"
                  min={2}
                  defaultValue={8}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-lg border border-purple-primary px-4 py-2.5 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
            >
              Crear plantilla
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Plantillas existentes</h2>
          {!templates || templates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-text-muted">
              No hay plantillas todavía.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-hover"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-text-primary">{t.name}</h3>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {t.rounds} rondas, {t.teams} equipos
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={toggleTemplate.bind(null, t.id, t.is_active)}>
                        <button
                          type="submit"
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            t.is_active
                              ? 'bg-surface text-orange-400 hover:bg-surface-hover'
                              : 'bg-surface text-success hover:bg-surface-hover'
                          }`}
                        >
                          {t.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </form>
                      <form action={deleteTemplate.bind(null, t.id)}>
                        <button
                          type="submit"
                          className="rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-surface-hover"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
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
