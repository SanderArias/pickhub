import Link from 'next/link';

export function PageHeaderBack({ href, label = 'Volver' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="group mb-3 inline-flex items-center gap-1.5 -ml-1.5 px-1.5 py-1 text-sm font-medium text-text-secondary transition-colors hover:text-purple-primary"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        className="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
      >
        <path d="M11 13L6 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}

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
      {backHref && <PageHeaderBack href={backHref} label={backLabel} />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
