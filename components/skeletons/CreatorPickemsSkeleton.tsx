function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-hover ${className ?? 'h-4 w-full'}`} />;
}

function ListItem() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <Bar className="h-4 w-44" />
          <Bar className="h-5 w-20 rounded-full" />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Bar className="h-3 w-24" />
          <Bar className="h-3 w-3 rounded-full" />
          <Bar className="h-3 w-36" />
        </div>
      </div>
      <Bar className="h-3 w-16" />
      <Bar className="size-4 shrink-0" />
    </div>
  );
}

export function CreatorPickemsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Bar className="h-7 w-40" />
        <Bar className="h-9 w-36 rounded-lg" />
      </div>

      <Bar className="h-10 w-full rounded-lg" />

      <div className="flex gap-1.5">
        <Bar className="h-7 w-16 rounded-lg" />
        <Bar className="h-7 w-20 rounded-lg" />
        <Bar className="h-7 w-20 rounded-lg" />
        <Bar className="h-7 w-24 rounded-lg" />
        <Bar className="h-7 w-24 rounded-lg" />
      </div>

      <div className="flex flex-col gap-2">
        <ListItem />
        <ListItem />
        <ListItem />
        <ListItem />
      </div>
    </div>
  );
}
