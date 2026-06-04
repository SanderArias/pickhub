import { requireCreator } from '@/lib/auth';
import { createPickem } from '@/app/actions/creator';
import { PageHeader, ActionButton } from '@/components/ui';

export default async function NewPickemPage() {
  await requireCreator();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <PageHeader
        title="Crear Pick'em"
        backHref="/creator/pickems"
        backLabel="Mis Pick'ems"
      />

      <form action={createPickem} className="flex flex-col gap-5">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-[#888]">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Ej. Predicciones ESL Pro League"
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
            placeholder="Describe de qué trata este Pick'em…"
            className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
          />
        </div>

        <ActionButton type="submit" variant="primary">
          Crear Pick&apos;em
        </ActionButton>
      </form>
    </div>
  );
}
