import { Card } from './Card';

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
  accent?: 'success' | 'warning' | 'error' | 'none';
}) {
  return (
    <Card variant={accent === 'error' ? 'error' : accent === 'warning' ? 'warning' : accent === 'success' ? 'success' : 'none'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </Card>
  );
}
