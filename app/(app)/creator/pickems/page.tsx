import Link from 'next/link';
import { getCreatorPickems } from '@/app/actions/creator';
import { StatusBadge, EmptyState } from '@/components/ui';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  predictions_closed: 'Predicciones cerradas',
  completed: 'Completado',
  archived: 'Archivado',
};

export default async function PickemsPage() {
  const pickems = await getCreatorPickems();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Mis Pick&apos;ems</h1>
        <Link
          href="/creator/pickems/new"
          className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
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
              className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
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
              className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-hover"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-text-primary">
                    {p.title}
                  </h3>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
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
