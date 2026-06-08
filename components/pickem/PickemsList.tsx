'use client';

import { useState, useMemo, useCallback, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';

type PickemItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  ends_at: string | null;
  event_config: unknown;
  created_at: string;
  updated_at: string;
  prizeCount: number;
  submissionCount: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; activeBg: string; activeBorder: string }> = {
  draft: {
    label: 'Borrador',
    color: 'text-text-muted',
    activeBg: 'bg-white/10',
    activeBorder: 'border-white/20',
  },
  open: {
    label: 'Abierto',
    color: 'text-purple-primary',
    activeBg: 'bg-purple-bg',
    activeBorder: 'border-purple-border',
  },
  predictions_closed: {
    label: 'Predicciones cerradas',
    color: 'text-warning',
    activeBg: 'bg-warning-bg',
    activeBorder: 'border-warning-border',
  },
  completed: {
    label: 'Completado',
    color: 'text-success',
    activeBg: 'bg-success/10',
    activeBorder: 'border-success/30',
  },
  archived: {
    label: 'Archivado',
    color: 'text-text-muted',
    activeBg: 'bg-white/10',
    activeBorder: 'border-white/20',
  },
};

type FilterKey = 'all' | 'draft' | 'open' | 'predictions_closed' | 'completed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Abiertos' },
  { key: 'predictions_closed', label: 'Cerrados' },
  { key: 'completed', label: 'Completados' },
  { key: 'draft', label: 'Borradores' },
];

function getFilterColor(key: FilterKey): string {
  if (key === 'all' || key === 'open') return 'purple';
  if (key === 'predictions_closed') return 'warning';
  if (key === 'completed') return 'success';
  return 'muted';
}

function ChevronRight() {
  return (
    <svg className="size-4 text-text-muted shrink-0" viewBox="0 0 16 16" fill="none">
      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="size-4 text-text-muted" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PickemsListInner({
  pickems,
  canCreate = true,
  notice,
}: {
  pickems: PickemItem[];
  canCreate?: boolean;
  notice?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlStatus = searchParams.get('status') as FilterKey | null;
  const urlQ = searchParams.get('q') ?? '';

  useEffect(() => {
    if (searchParams.has('notice')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('notice');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, []);

  const [search, setSearch] = useState(urlQ);
  const [activeFilter, setActiveFilter] = useState<FilterKey>(urlStatus ?? 'all');

  const updateUrl = useCallback(
    (filter: FilterKey, q: string) => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (q.trim()) params.set('q', q.trim());
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, pathname],
  );

  const handleFilterChange = useCallback(
    (key: FilterKey) => {
      setActiveFilter(key);
      updateUrl(key, search);
    },
    [search, updateUrl],
  );

  const handleSearchChange = useCallback(
    (q: string) => {
      setSearch(q);
      updateUrl(activeFilter, q);
    },
    [activeFilter, updateUrl],
  );

  const counts = useMemo(() => {
    const total = pickems.length;
    const draft = pickems.filter((p) => p.status === 'draft').length;
    const open = pickems.filter((p) => p.status === 'open').length;
    const closed = pickems.filter((p) => p.status === 'predictions_closed').length;
    const completed = pickems.filter((p) => p.status === 'completed' || p.status === 'tiebreaker_pending').length;
    return { total, draft, open, closed, completed };
  }, [pickems]);

  const filterCounts: Record<FilterKey, number> = useMemo(
    () => ({
      all: counts.total,
      draft: counts.draft,
      open: counts.open,
      predictions_closed: counts.closed,
      completed: counts.completed,
    }),
    [counts],
  );

  const filtered = useMemo(() => {
    let items = pickems;
    if (activeFilter !== 'all') {
      items = items.filter((p) =>
        activeFilter === 'completed'
          ? p.status === 'completed' || p.status === 'tiebreaker_pending'
          : p.status === activeFilter,
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((p) => p.title.toLowerCase().includes(q));
    }
    return items;
  }, [pickems, activeFilter, search]);

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning">
          La creación de nuevos Pick&rsquo;ems está temporalmente deshabilitada.
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">Mis Pick&rsquo;ems</h1>
        {canCreate && (
          <Link
            href="/creator/pickems/new"
            className="shrink-0 rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
          >
            Nuevo Pick&rsquo;em
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar Pick&rsquo;em..."
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-purple-primary focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pickhub-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => {
          const count = filterCounts[f.key];
          const isActive = activeFilter === f.key;
          const color = getFilterColor(f.key);

          const activeClasses =
            color === 'purple'
              ? 'bg-purple-bg text-purple-primary border-purple-border'
              : color === 'warning'
                ? 'bg-warning-bg text-warning border-warning-border'
                : color === 'success'
                  ? 'bg-success/10 text-success border-success/30'
                  : 'bg-white/10 text-text-muted border-white/20';

          return (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`shrink-0 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? activeClasses
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isActive ? 'opacity-80' : 'text-text-muted'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty states */}
      {pickems.length === 0 ? (
        <EmptyState
          icon="empty"
          message="Aún no has creado ningún Pick'em."
          description="Crea el primero para comenzar a recibir participaciones."
          action={
            canCreate && (
              <Link
                href="/creator/pickems/new"
                className="rounded-lg bg-purple-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
              >
                Crear Pick&rsquo;em
              </Link>
            )
          }
        />
      ) : filtered.length === 0 && search.trim() ? (
        <EmptyState
          icon="search"
          message="No encontramos Pick'ems que coincidan con tu búsqueda."
          action={
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Limpiar búsqueda
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="filter"
          message="No tienes Pick'ems con este estado."
          description={
            activeFilter === 'open'
              ? 'Cuando actives un Pick\'em, aparecerá aquí.'
              : activeFilter === 'predictions_closed'
                ? 'Cuando cierres las predicciones, aparecerá aquí.'
                : activeFilter === 'completed'
                  ? 'Cuando publiques resultados, aparecerá aquí.'
                  : undefined
          }
        />
      ) : (
        /* List */
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <PickemListItem key={p.id} pickem={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PickemListItem({ pickem }: { pickem: PickemItem }) {
  const config = STATUS_CONFIG[pickem.status] ?? STATUS_CONFIG.draft;

  return (
    <Link
      href={`/creator/pickems/${pickem.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-surface px-5 py-4 transition-all hover:border-border-hover hover:bg-surface-hover"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="truncate text-sm font-semibold text-text-primary">{pickem.title}</h3>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.activeBg} ${config.color} ${config.activeBorder}`}
          >
            <span className={`size-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`} />
            {config.label}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
          <span>
            {pickem.submissionCount} participaci&oacute;n{pickem.submissionCount !== 1 ? 'es' : ''}
          </span>
          {pickem.description && (
            <>
              <span className="text-border">·</span>
              <span className="line-clamp-1">{pickem.description}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-text-muted sm:block">
          {new Date(pickem.created_at).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <ChevronRight />
      </div>
    </Link>
  );
}

export function PickemsList({
  pickems,
  canCreate,
  notice,
}: {
  pickems: PickemItem[];
  canCreate?: boolean;
  notice?: string | null;
}) {
  return (
      <Suspense fallback={<div />}>
      <PickemsListInner pickems={pickems} canCreate={canCreate} notice={notice} />
    </Suspense>
  );
}

function EmptyState({
  icon,
  message,
  description,
  action,
}: {
  icon: 'empty' | 'search' | 'filter';
  message: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const iconContent = {
    empty: (
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
    ),
    search: (
      <>
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 4V10M4 7H10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </>
    ),
    filter: (
      <path d="M3 5H21M6 10H18M10 15H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    ),
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-surface">
        <svg className="size-6 text-text-muted" viewBox="0 0 24 24" fill="none">
          {iconContent[icon]}
        </svg>
      </div>
      <p className="mt-4 text-sm font-medium text-text-primary">{message}</p>
      {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
