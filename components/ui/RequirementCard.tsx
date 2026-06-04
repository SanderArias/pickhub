const STATE_STYLES = {
  configured: {
    border: 'border-emerald-800/40',
    label: 'Completo',
    labelClass: 'text-emerald-400',
  },
  missing: {
    border: 'border-red-800/40',
    label: 'Pendiente',
    labelClass: 'text-red-400',
  },
  optional: {
    border: 'border-amber-800/40',
    label: 'Opcional',
    labelClass: 'text-amber-400',
  },
} as const;

export function RequirementCard({
  title,
  state,
  description,
  requirement,
  current,
}: {
  title: string;
  state: 'configured' | 'missing' | 'optional';
  description: string;
  requirement: string;
  current: string;
}) {
  const styles = STATE_STYLES[state];

  return (
    <div className={`rounded-lg border bg-[#111] p-4 text-sm ${styles.border}`}>
      <div className="flex items-center justify-between gap-4">
        <h4 className="font-medium text-[#e8e8e8]">{title}</h4>
        <span className={`shrink-0 text-xs font-medium ${styles.labelClass}`}>
          {styles.label}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-[#888]">{description}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
        <span className="text-[#555]">
          Requerido: <span className="text-[#888]">{requirement}</span>
        </span>
        <span className="text-[#555]">
          Actual: <span className="text-[#888]">{current}</span>
        </span>
      </div>
    </div>
  );
}
