function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={`rounded bg-surface-hover ${className ?? 'h-4 w-full'}`} />
  );
}

function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
      {children}
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      {/* PageHeader skeleton */}
      <div className="flex flex-col gap-2">
        <SkeletonLine className="h-3 w-28" />
        <SkeletonLine className="mt-2 h-6 w-64" />
        <SkeletonLine className="h-3 w-48" />
      </div>

      {/* Status card skeleton */}
      <SkeletonCard>
        <div className="flex items-start gap-3">
          <SkeletonLine className="mt-0.5 size-3 shrink-0 rounded-full" />
          <div className="flex-1">
            <SkeletonLine className="h-5 w-44" />
            <SkeletonLine className="mt-2 h-3 w-72" />
            <SkeletonLine className="mt-3 h-3 w-32" />
          </div>
        </div>
        <div className="my-4 border-t border-border" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="mt-1 h-4 w-36" />
          </div>
          <SkeletonLine className="h-10 w-44 rounded-lg" />
        </div>
      </SkeletonCard>

      {/* Share section skeleton */}
      <SkeletonCard>
        <div className="flex items-center justify-between">
          <div>
            <SkeletonLine className="h-4 w-36" />
            <SkeletonLine className="mt-1 h-3 w-52" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <SkeletonLine className="h-9 flex-1 rounded-lg" />
          <SkeletonLine className="h-9 w-28 shrink-0 rounded-lg" />
          <SkeletonLine className="h-9 w-20 shrink-0 rounded-lg" />
        </div>
      </SkeletonCard>
    </div>
  );
}
