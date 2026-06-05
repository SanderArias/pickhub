const VARIANTS: Record<string, { container: string; dot: string }> = {
  draft: { container: 'border-border text-text-muted', dot: 'bg-text-muted' },
  open: { container: 'border-purple-border text-purple-primary', dot: 'bg-purple-primary' },
  predictions_closed: { container: 'border-warning-border text-warning', dot: 'bg-warning' },
  completed: { container: 'border-success-border text-success', dot: 'bg-success' },
  archived: { container: 'border-border text-text-muted', dot: 'bg-text-muted' },
  published: { container: 'border-purple-border text-purple-primary', dot: 'bg-purple-primary' },
  active: { container: 'border-purple-border text-purple-primary', dot: 'bg-purple-primary' },
  closed: { container: 'border-warning-border text-warning', dot: 'bg-warning' },
  pending: { container: 'border-warning-border text-warning', dot: 'bg-warning' },
  approved: { container: 'border-purple-border text-purple-primary', dot: 'bg-purple-primary' },
  rejected: { container: 'border-danger-border text-danger', dot: 'bg-danger' },
  suspended: { container: 'border-danger-border text-danger', dot: 'bg-danger' },
  reopened: { container: 'border-border text-text-muted', dot: 'bg-text-muted' },
  enabled: { container: 'border-purple-border text-purple-primary', dot: 'bg-purple-primary' },
  disabled: { container: 'border-border text-text-muted', dot: 'bg-text-muted' },
};

const LABELS: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  predictions_closed: 'Predicciones cerradas',
  completed: 'Completado',
  archived: 'Archivado',
  published: 'Publicado',
  active: 'Activo',
  closed: 'Cerrado',
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
  reopened: 'Reabierta',
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
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${variant.container}`}
    >
      <span className={`h-1 w-1 rounded-full ${variant.dot}`} />
      {label ?? LABELS[status] ?? status}
    </span>
  );
}
