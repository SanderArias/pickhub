import Link from 'next/link';
import { getCreatorPickems } from '@/app/actions/creator';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  active: 'Activo',
  closed: 'Cerrado',
  archived: 'Archivado',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-yellow-400',
  published: 'text-green-400',
  active: 'text-blue-400',
  closed: 'text-zinc-500',
  archived: 'text-zinc-600',
};

export default async function PickemsPage() {
  const pickems = await getCreatorPickems();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <Link href="/creator" className="text-xs text-zinc-500 hover:text-zinc-300">
        &larr; Volver al panel de creador
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Pick&apos;ems</h1>
        <Link
          href="/creator/pickems/new"
          className="rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
        >
          Nuevo Pick&apos;em
        </Link>
      </div>

      {pickems.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No has creado ningún Pick&apos;em todavía.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pickems.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-zinc-700 bg-zinc-900 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-zinc-100">
                    {p.title}
                  </h3>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-600">
                    Creado: {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[p.status] ?? ''
                  } bg-zinc-800`}
                >
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
