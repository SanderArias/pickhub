import Link from 'next/link';
import { Card } from './Card';

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

export function RequirementCard({
  title,
  state,
  description,
  current,
  href,
}: {
  title: string;
  state: 'configured' | 'missing' | 'optional';
  description: string;
  current: string;
  href?: string;
}) {
  const styles = STATE_STYLES[state];

  const content = (
    <Card
      variant={styles.variant}
      hover={!!href}
      className="flex h-full flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="min-h-[40px] text-sm font-medium leading-tight text-text-primary">
          {title}
        </h4>
        <span className={`shrink-0 whitespace-nowrap text-xs font-medium ${LABEL_COLORS[styles.variant]}`}>
          {styles.label}
        </span>
      </div>
      <p className="mt-1 min-h-[40px] text-xs leading-tight text-text-secondary line-clamp-2">
        {description}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-xs text-text-muted truncate">{current}</span>
        {href && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-text-muted"
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block h-[136px]">{content}</Link>;
  }

  return <div className="h-[136px]">{content}</div>;
}
