function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-hover ${className ?? 'h-4 w-full'}`} />;
}

function FeedItem() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
      <Bar className="mt-0.5 size-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Bar className="h-4 w-52" />
        <Bar className="mt-1 h-3 w-36" />
        <Bar className="mt-1 h-3 w-24" />
      </div>
    </div>
  );
}

export function ActivityPageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Bar className="h-6 w-32" />
        <Bar className="mt-1 h-4 w-64" />
      </div>

      <div className="flex h-9 w-fit items-center gap-1 rounded-lg border border-border bg-surface p-1">
        <Bar className="h-7 w-14 rounded-md" />
        <Bar className="h-7 w-28 rounded-md" />
      </div>

      <div className="flex flex-col gap-2">
        <FeedItem />
        <FeedItem />
        <FeedItem />
        <FeedItem />
        <FeedItem />
        <FeedItem />
      </div>
    </div>
  );
}
