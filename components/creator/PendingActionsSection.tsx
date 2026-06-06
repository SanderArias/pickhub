import Link from 'next/link';
import { ACTION_CONFIG, type AttentionItem, type ActionTone } from '@/lib/dashboard-config';

const TONE_CLASSES: Record<ActionTone, {
  border: string;
  iconBg: string;
  iconText: string;
  desc: string;
  ctaBorder: string;
  ctaText: string;
  ctaHoverBg: string;
  ctaHoverText: string;
}> = {
  neutral: {
    border: 'border-white/10',
    iconBg: 'bg-white/10',
    iconText: 'text-text-muted',
    desc: 'text-text-muted',
    ctaBorder: 'border-white/20',
    ctaText: 'text-text-secondary',
    ctaHoverBg: 'hover:bg-white/10',
    ctaHoverText: 'hover:text-text-primary',
  },
  warning: {
    border: 'border-warning-border',
    iconBg: 'bg-warning-bg',
    iconText: 'text-warning',
    desc: 'text-warning',
    ctaBorder: 'border-warning-border',
    ctaText: 'text-warning',
    ctaHoverBg: 'hover:bg-warning/20',
    ctaHoverText: 'hover:text-warning',
  },
  success: {
    border: 'border-success/30',
    iconBg: 'bg-success/10',
    iconText: 'text-success',
    desc: 'text-success',
    ctaBorder: 'border-success/30',
    ctaText: 'text-success',
    ctaHoverBg: 'hover:bg-success/20',
    ctaHoverText: 'hover:text-success',
  },
  purple: {
    border: 'border-purple-border',
    iconBg: 'bg-purple-bg',
    iconText: 'text-purple-primary',
    desc: 'text-purple-primary',
    ctaBorder: 'border-purple-border',
    ctaText: 'text-purple-primary',
    ctaHoverBg: 'hover:bg-purple-primary/20',
    ctaHoverText: 'hover:text-purple-primary',
  },
};

function ActionIcon({ tone }: { tone: ActionTone }) {
  if (tone === 'neutral') {
    return (
      <svg className="size-4" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (tone === 'warning') {
    return (
      <svg className="size-4" viewBox="0 0 16 16" fill="none">
        <path d="M8 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 11.5C8.41421 11.5 8.75 11.1642 8.75 10.75C8.75 10.3358 8.41421 10 8 10C7.58579 10 7.25 10.3358 7.25 10.75C7.25 11.1642 7.58579 11.5 8 11.5Z" fill="currentColor" />
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (tone === 'success') {
    return (
      <svg className="size-4" viewBox="0 0 16 16" fill="none">
        <path d="M4 8L6.5 10.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg className="size-4" viewBox="0 0 16 16" fill="none">
      <path d="M8 4V12M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function PendingActionsSection({
  items,
}: {
  items: AttentionItem[];
}) {
  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-primary">Requieren atenci&oacute;n</h2>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <svg className="size-4" viewBox="0 0 16 16" fill="none">
              <path d="M4 8L6.5 10.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-text-primary">Todo est&aacute; al d&iacute;a</p>
            <p className="text-xs text-text-muted">No tienes acciones pendientes en este momento.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-text-primary">Requieren atenci&oacute;n</h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const config = ACTION_CONFIG[item.actionType];
          const tone = config.tone;
          const styles = TONE_CLASSES[tone];

          return (
            <div
              key={item.href}
              className={`flex items-center gap-4 rounded-xl border ${styles.border} bg-surface px-5 py-4 transition-colors hover:bg-surface-hover`}
            >
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}>
                <ActionIcon tone={tone} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{item.title}</p>
                <p className={`text-xs ${styles.desc}`}>{config.description}</p>
              </div>
              <Link
                href={item.href}
                className={`shrink-0 rounded-lg border ${styles.ctaBorder} ${styles.ctaText} ${styles.ctaHoverBg} ${styles.ctaHoverText} px-4 py-2 text-xs font-medium transition-colors`}
              >
                {config.label}
              </Link>
            </div>
          );
        })}
      </div>
      <Link
        href="/creator/pickems"
        className="self-start text-xs text-text-muted transition-colors hover:text-text-secondary"
      >
        Ver todas las acciones &rarr;
      </Link>
    </section>
  );
}
