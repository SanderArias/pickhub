import Link from 'next/link';

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div>
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-block text-xs text-[#555] hover:text-[#e8e8e8]"
        >
          &larr; {backLabel ?? 'Volver'}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e8e8e8]">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-[#888]">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
