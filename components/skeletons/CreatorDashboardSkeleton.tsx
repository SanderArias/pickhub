function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-hover ${className ?? 'h-4 w-full'}`} />;
}

function MetricCard() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Bar className="h-3 w-24" />
      <Bar className="mt-2 h-8 w-12" />
      <Bar className="mt-1 h-3 w-32" />
    </div>
  );
}

function ActionCard() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
      <Bar className="size-4 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Bar className="h-4 w-44" />
        <Bar className="mt-1 h-3 w-28" />
      </div>
      <Bar className="h-3 w-12 shrink-0" />
    </div>
  );
}

export function CreatorDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Bar className="h-6 w-36" />
          <Bar className="mt-1 h-4 w-56" />
        </div>
        <Bar className="h-10 w-44 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard />
        <MetricCard />
        <MetricCard />
        <MetricCard />
      </div>

      <div className="flex flex-col gap-3">
        <Bar className="h-5 w-36" />
        <ActionCard />
        <ActionCard />
      </div>

      <div className="flex flex-col gap-3">
        <Bar className="h-5 w-32" />
        <div className="rounded-lg border border-border bg-surface p-4">
          <Bar className="h-4 w-48" />
          <Bar className="mt-1 h-3 w-56" />
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <Bar className="h-4 w-44" />
          <Bar className="mt-1 h-3 w-52" />
        </div>
      </div>
    </div>
  );
}
