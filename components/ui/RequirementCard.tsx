const STATE_STYLES = {
  configured: {
    variant: 'success' as const,
    label: 'Completo',
  },
  missing: {
    variant: 'error' as const,
    label: 'Pendiente',
  },
  optional: {
    variant: 'warning' as const,
    label: 'Opcional',
  },
};

const LABEL_COLORS: Record<string, string> = {
  success: 'text-purple-primary',
  error: 'text-danger',
  warning: 'text-warning',
};

import { Card } from './Card';

export function RequirementCard({
  title,
  state,
  description,
  current,
  requirement,
}: {
  title: string;
  state: 'configured' | 'missing' | 'optional';
  description: string;
  requirement: string;
  current: string;
}) {
  void requirement;
  const styles = STATE_STYLES[state];

  return (
    <Card variant={styles.variant} className="flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-medium text-text-primary">{title}</h4>
          <span className={`shrink-0 text-xs font-medium ${LABEL_COLORS[styles.variant]}`}>
            {styles.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-secondary">{description}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
        <span className="text-text-muted">
          <span className="text-text-secondary">{current}</span>
        </span>
      </div>
    </Card>
  );
}
