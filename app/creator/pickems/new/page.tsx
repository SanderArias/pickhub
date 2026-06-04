import Link from 'next/link';
import { requireCreator } from '@/lib/auth';
import { createPickem } from '@/app/actions/creator';

export default async function NewPickemPage() {
  await requireCreator();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <Link href="/creator/pickems" className="text-xs text-zinc-500 hover:text-zinc-300">
        &larr; Volver a mis Pick&apos;ems
      </Link>

      <h1 className="text-2xl font-bold">Crear Pick&apos;em</h1>

      <form action={createPickem} className="flex flex-col gap-5">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-300">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Ej. Predicciones ESL Pro League"
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
            placeholder="Describe de qué trata este Pick&apos;em…"
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label
            htmlFor="prediction_close_at"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Fecha de cierre de predicciones
          </label>
          <input
            id="prediction_close_at"
            name="prediction_close_at"
            type="datetime-local"
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Las predicciones se cierran automáticamente en esta fecha.
          </p>
        </div>

        <fieldset className="rounded-lg border border-zinc-700 p-4">
          <legend className="text-sm font-semibold text-zinc-300">Premios</legend>

          <div className="mt-3 flex flex-col gap-4">
            <div>
              <label
                htmlFor="prize_subscriber"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Premio para suscriptores
              </label>
              <input
                id="prize_subscriber"
                name="prize_subscriber"
                type="text"
                placeholder="Ej. Gift card de $10"
                className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label
                htmlFor="prize_non_subscriber"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Premio para no suscriptores
              </label>
              <input
                id="prize_non_subscriber"
                name="prize_non_subscriber"
                type="text"
                placeholder="Ej. Gift card de $5"
                className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          className="rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
        >
          Crear Pick&apos;em
        </button>
      </form>
    </div>
  );
}
