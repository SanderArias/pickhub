export default function ExplorePage() {
  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-center px-4 py-16">
      <div className="flex w-full flex-col items-center gap-6 rounded-xl border border-border bg-surface/50 px-6 py-12 text-center sm:px-12">
        <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-purple-primary/10">
          <svg
            className="size-7 text-purple-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </span>

        <span className="inline-flex items-center rounded-full bg-purple-primary/15 px-3 py-1 text-xs font-semibold text-purple-primary">
          Próximamente
        </span>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
            Explorar actividades
          </h1>
          <p className="text-sm text-text-secondary">
            Próximamente podrás descubrir y participar en nuevas actividades creadas por la comunidad.
          </p>
          <p className="text-xs text-text-muted">
            Estamos preparando nuevas formas de participar, competir y conectar dentro de PickHub.
          </p>
        </div>
      </div>
    </div>
  );
}
