import { Card } from './Card';

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  accent,
  id,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  accent?: 'success' | 'warning' | 'error' | 'none';
  id?: string;
}) {
  return (
    <Card variant={accent === 'error' ? 'error' : accent === 'warning' ? 'warning' : accent === 'success' ? 'success' : 'none'} className={id ? 'scroll-mt-20' : ''}>
      {id && <a id={id} className="block -mt-1" />}
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
