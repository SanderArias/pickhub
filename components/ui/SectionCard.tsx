export function SectionCard({
  title,
  subtitle,
  action,
  children,
  accent,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  accent?: 'green' | 'red' | 'yellow' | 'none';
}) {
  const borderColor = {
    green: 'border-emerald-800/40',
    red: 'border-red-800/40',
    yellow: 'border-amber-800/40',
    none: 'border-[#1f1f1f]',
  };

  return (
    <div
      className={`rounded-lg border bg-[#111] p-5 text-sm ${borderColor[accent ?? 'none']}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[#e8e8e8]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[#888]">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
