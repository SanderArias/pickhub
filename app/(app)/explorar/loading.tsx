export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-center px-4 py-16">
      <div className="flex w-full flex-col items-center gap-6 rounded-xl border border-border bg-surface/50 px-6 py-12 sm:px-12 motion-safe:animate-pulse">
        <div className="size-14 rounded-full bg-surface-hover" />
        <div className="h-5 w-24 rounded-full bg-surface-hover" />
        <div className="space-y-3">
          <div className="mx-auto h-7 w-48 rounded bg-surface-hover" />
          <div className="mx-auto h-4 w-72 rounded bg-surface-hover" />
          <div className="mx-auto h-3 w-64 rounded bg-surface-hover" />
        </div>
      </div>
    </div>
  );
}
