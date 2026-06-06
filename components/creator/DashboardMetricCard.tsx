import Link from 'next/link';
import type { MetricDef } from '@/lib/dashboard-config';

const TONE_STYLES: Record<string, { value: string; dot: string }> = {
  neutral: { value: 'text-text-primary', dot: 'bg-text-muted' },
  purple: { value: 'text-purple-primary', dot: 'bg-purple-primary' },
  warning: { value: 'text-warning', dot: 'bg-warning' },
  success: { value: 'text-success', dot: 'bg-success' },
};

export function DashboardMetricCard({ metric }: { metric: MetricDef }) {
  const style = TONE_STYLES[metric.tone] ?? TONE_STYLES.neutral;

  const inner = (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-hover">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className={`size-1.5 rounded-full ${style.dot}`} />
        {metric.label}
      </div>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${style.value}`}>
        {metric.value}
      </p>
      <p className="mt-auto pt-2 text-xs text-text-muted line-clamp-2">
        {metric.context}
      </p>
    </div>
  );

  if (metric.href) {
    return (
      <Link href={metric.href} className="block h-full cursor-pointer">
        {inner}
      </Link>
    );
  }

  return inner;
}
