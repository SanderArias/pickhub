const VARIANTS: Record<string, { container: string; dot: string }> = {
  draft: { container: 'border-zinc-700/50 bg-zinc-800/30', dot: 'bg-zinc-500' },
  published: { container: 'border-emerald-800/40 bg-emerald-950/20', dot: 'bg-emerald-500' },
  active: { container: 'border-blue-800/40 bg-blue-950/20', dot: 'bg-blue-500' },
  closed: { container: 'border-zinc-700/50 bg-zinc-800/30', dot: 'bg-zinc-500' },
  archived: { container: 'border-zinc-700/30 bg-zinc-800/20', dot: 'bg-zinc-600' },
  pending: { container: 'border-amber-800/40 bg-amber-950/20', dot: 'bg-amber-500' },
  approved: { container: 'border-emerald-800/40 bg-emerald-950/20', dot: 'bg-emerald-500' },
  rejected: { container: 'border-red-800/40 bg-red-950/20', dot: 'bg-red-500' },
  suspended: { container: 'border-orange-800/40 bg-orange-950/20', dot: 'bg-orange-500' },
  enabled: { container: 'border-emerald-800/40 bg-emerald-950/20', dot: 'bg-emerald-500' },
  disabled: { container: 'border-zinc-700/50 bg-zinc-800/30', dot: 'bg-zinc-500' },
};

const LABELS: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  active: 'Activo',
  closed: 'Cerrado',
  archived: 'Archivado',
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
  enabled: 'Activo',
  disabled: 'Inactivo',
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const variant = VARIANTS[status] ?? VARIANTS.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${variant.container}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${variant.dot}`} />
      {label ?? LABELS[status] ?? status}
    </span>
  );
}
