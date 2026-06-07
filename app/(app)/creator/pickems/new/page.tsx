import { requireCreator } from '@/lib/auth';
import { createPickem } from '@/app/actions/creator';
import { PageHeader, ActionButton } from '@/components/ui';
import { ClosureSection } from './ClosureSection';

export default async function NewPickemPage() {
  await requireCreator();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Crear Pick'em"
        backHref="/creator/pickems"
        backLabel="Mis Pick'ems"
      />

      <form action={createPickem} className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Ej. Predicciones ESL Pro League"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Describe de qué trata este Pick'em…"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>

        <ClosureSection />

        <ActionButton type="submit" variant="primary">
          Crear Pick’em
        </ActionButton>
      </form>
    </div>
  );
}
