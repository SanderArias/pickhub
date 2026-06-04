export function Card({
  children,
  className,
  hover,
  variant,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  variant?: 'success' | 'warning' | 'error' | 'none';
  as?: 'div' | 'a';
}) {
  const variantStyles = {
    success: 'border-purple-border bg-surface',
    warning: 'border-warning-border bg-surface',
    error: 'border-danger-border bg-surface',
    none: 'border-border bg-surface',
  };

  return (
    <Tag
      className={`rounded-lg border p-4 text-sm transition-colors ${variantStyles[variant ?? 'none']} ${hover ? 'hover:border-border-hover' : ''} ${className ?? ''}`}
    >
      {children}
    </Tag>
  );
}
