function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-hover ${className ?? 'h-4 w-full'}`} />;
}

function Card() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Bar className="h-4 w-48" />
          <Bar className="mt-2 h-3 w-32" />
        </div>
        <div className="shrink-0 text-right">
          <Bar className="h-3 w-16" />
          <Bar className="mt-2 h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function ParticipationsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Bar className="h-6 w-52" />
        <Bar className="mt-1 h-4 w-40" />
      </div>

      <div className="flex gap-1">
        <Bar className="h-7 w-20 rounded-lg" />
        <Bar className="h-7 w-20 rounded-lg" />
      </div>

      <div className="flex flex-col gap-2">
        <Card />
        <Card />
        <Card />
      </div>
    </div>
  );
}
