function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-hover ${className ?? 'h-4 w-full'}`} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">{children}</div>;
}

function ListCard() {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <Bar className="h-4 w-48" />
        <Bar className="h-3 w-14" />
      </div>
      <Bar className="mt-2 h-3 w-36" />
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="min-w-0">
        <Bar className="h-6 w-64" />
        <Bar className="mt-2 h-4 w-80" />
      </div>

      <Card>
        <Bar className="h-4 w-44" />
        <Bar className="mt-2 h-3 w-72" />
        <Bar className="mt-4 h-9 w-36 rounded-lg" />
      </Card>

      <div className="flex items-center justify-between">
        <Bar className="h-4 w-36" />
        <Bar className="h-3 w-16" />
      </div>

      <div className="flex flex-col gap-2">
        <ListCard />
        <ListCard />
        <ListCard />
      </div>
    </div>
  );
}
