import Link from 'next/link';
import { getCreatorPickems } from '@/app/actions/creator';
import { StatusBadge, EmptyState } from '@/components/ui';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  active: 'Activo',
  closed: 'Cerrado',
  archived: 'Archivado',
};

export default async function PickemsPage() {
  const pickems = await getCreatorPickems();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8e8e8]">Mis Pick&apos;ems</h1>
        <Link
          href="/creator/pickems/new"
          className="rounded-md bg-[#e8e8e8] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white"
        >
          Nuevo Pick&apos;em
        </Link>
      </div>

      {pickems.length === 0 ? (
        <EmptyState
          title="No has creado ningún Pick'em todavía."
          description="Crea tu primer Pick'em para empezar."
          action={
            <Link
              href="/creator/pickems/new"
              className="rounded-md bg-[#181818] px-4 py-2 text-sm font-medium text-[#e8e8e8] transition-colors hover:bg-[#1f1f1f]"
            >
              Crear Pick&apos;em
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {pickems.map((p) => (
            <Link
              key={p.id}
              href={`/creator/pickems/${p.id}`}
              className="rounded-lg border border-[#1f1f1f] bg-[#111] p-4 transition-colors hover:border-[#2a2a2a]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-[#e8e8e8]">
                    {p.title}
                  </h3>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-[#888]">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[#555]">
                    Creado: {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge
                  status={p.status}
                  label={STATUS_LABELS[p.status] ?? p.status}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
