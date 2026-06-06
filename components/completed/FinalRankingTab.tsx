'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { RankingEntry, PaginatedRanking } from '@/app/actions/results-data';
import { getFinalRanking } from '@/app/actions/results-data';
import { Badge } from './Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'prized', label: 'Con premio' },
  { value: 'subscribers', label: 'Suscriptores' },
] as const;

export function FinalRankingTab({
  eventId,
  hasPendingTiebreakers,
  hasPrizes: hasEventPrizes,
}: {
  eventId: string;
  hasPendingTiebreakers?: boolean;
  hasPrizes?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PaginatedRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const currentPage = parseInt(searchParams.get('page') ?? '1', 10);
  const currentFilter = (searchParams.get('filter') ?? 'all') as (typeof FILTERS)[number]['value'];
  const currentQuery = searchParams.get('q') ?? '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await getFinalRanking(eventId, currentPage, 50, currentQuery, currentFilter);
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId, currentPage, currentFilter, currentQuery]);

  function updateUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(params)) {
      if (val === undefined || val === '' || val === '1' || (key === 'filter' && val === 'all') || (key === 'q' && val === '')) {
        sp.delete(key);
      } else {
        sp.set(key, val);
      }
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  function handleSearch(val: string) {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      updateUrl({ q: val || undefined, page: '1' });
    }, 300);
  }

  function handleFilter(val: string) {
    updateUrl({ filter: val === 'all' ? undefined : val, page: '1' });
  }

  function goToPage(p: number) {
    updateUrl({ page: String(p) });
  }

  const isProvisional = !!hasPendingTiebreakers;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary">
          {isProvisional ? 'Clasificación provisional' : 'Clasificación final'}
        </h2>
        {data && (
          <p className="mt-0.5 text-xs text-text-muted">
            {data.totalCount} participante{data.totalCount !== 1 ? 's' : ''}
          </p>
        )}
        {isProvisional && (
          <p className="mt-0.5 text-xs text-text-muted">
            El orden final se actualizará después de resolver los desempates.
          </p>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          defaultValue={currentQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar participante..."
          className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const isDisabled = isProvisional && f.value === 'prized';
          return (
            <button
              key={f.value}
              type="button"
              disabled={isDisabled}
              title={isDisabled ? 'Disponible después de resolver el desempate.' : undefined}
              onClick={() => handleFilter(f.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                currentFilter === f.value
                  ? 'bg-purple-primary text-white'
                  : isDisabled
                    ? 'border border-border bg-surface text-text-muted opacity-40 cursor-not-allowed'
                    : 'border border-border bg-surface text-text-secondary hover:border-border-hover'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {loading && <RankingSkeleton />}

      {/* Table */}
      {!loading && data && data.entries.length > 0 && (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[90px]" />
                <col />
                <col className="w-[100px]" />
                <col className="w-[180px]" />
                <col className="w-[150px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="py-2 pr-2 font-medium">Posición</th>
                  <th className="py-2 px-2 font-medium">Participante</th>
                  <th className="py-2 px-2 font-medium text-right">Puntos</th>
                  <th className="py-2 px-2 font-medium">Premio</th>
                  <th className="py-2 pr-3 pl-2 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {buildDisplayRows(data.entries, isProvisional, !!hasEventPrizes)}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-2">
            {buildMobileCards(data.entries, isProvisional, !!hasEventPrizes)}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <p className="text-xs text-text-muted">
                Mostrando {(data.page - 1) * data.pageSize + 1}&ndash;{Math.min(data.page * data.pageSize, data.totalCount)} de {data.totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => goToPage(data.page - 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border-hover disabled:opacity-40 disabled:pointer-events-none"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.totalPages}
                  onClick={() => goToPage(data.page + 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border-hover disabled:opacity-40 disabled:pointer-events-none"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && data && data.entries.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">
            {currentQuery || currentFilter !== 'all'
              ? 'No se encontraron participantes con los filtros actuales.'
              : "Este Pick'em no recibió participaciones."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildTieScores(entries: RankingEntry[]): Set<number> {
  const tied = new Set<number>();
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].total_score === entries[i - 1].total_score) tied.add(entries[i].total_score);
    if (i < entries.length - 1 && entries[i].total_score === entries[i + 1].total_score) tied.add(entries[i].total_score);
  }
  return tied;
}

function getDisplayRank(entry: RankingEntry, entries: RankingEntry[], tieScores: Set<number>): number {
  if (!tieScores.has(entry.total_score)) return entry.rank;
  let minRank = entry.rank;
  for (const e of entries) {
    if (e.total_score === entry.total_score && e.rank < minRank) minRank = e.rank;
  }
  return minRank;
}

/* ------------------------------------------------------------------ */
/*  Desktop rows builder                                               */
/* ------------------------------------------------------------------ */

function buildDisplayRows(entries: RankingEntry[], isProvisional: boolean, hasEventPrizes: boolean) {
  const tieScores = buildTieScores(entries);
  const rows: React.ReactNode[] = [];
  let lastScore: number | null = null;

  entries.forEach((entry) => {
    const displayRank = getDisplayRank(entry, entries, tieScores);
    const isTied = tieScores.has(entry.total_score);

    if (isProvisional && isTied && entry.total_score !== lastScore) {
      rows.push(
        <tr key={`header-${entry.total_score}`} className="border-0">
          <td colSpan={5} className="pb-1 pt-3">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="h-px flex-1 bg-border" />
              <span className="shrink-0 font-medium">
                Empatados por el {displayRank}.º lugar &middot; {entry.total_score} pts
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </td>
        </tr>,
      );
    }

    rows.push(
      <RankingRow
        key={entry.profile_id}
        entry={entry}
        displayRank={displayRank}
        isTied={isTied}
        isProvisional={isProvisional}
        hasEventPrizes={hasEventPrizes}
      />,
    );

    lastScore = entry.total_score;
  });

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Desktop row                                                        */
/* ------------------------------------------------------------------ */

function RankingRow({
  entry,
  displayRank,
  isTied,
  isProvisional,
  hasEventPrizes,
}: {
  entry: RankingEntry;
  displayRank: number;
  isTied: boolean;
  isProvisional: boolean;
  hasEventPrizes: boolean;
}) {
  const isTop3 = displayRank <= 3;
  const isTiedProvisional = isTied && isProvisional;

  return (
    <tr
      className={`border-b border-border last:border-b-0 transition-colors ${
        isTiedProvisional ? 'bg-yellow-500/[0.02]' : 'hover:bg-surface-hover/50'
      }`}
    >
      {/* Position */}
      <td className="py-2 pr-2 align-middle">
        {isTiedProvisional ? (
          <span
            className="flex size-8 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-sm font-semibold text-amber-400"
            aria-label="Posición pendiente de desempate"
          >
            ?
          </span>
        ) : (
          <span
            className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold ${
              isTop3 ? 'bg-purple-primary text-white' : 'border border-border text-text-muted'
            }`}
          >
            {displayRank}
          </span>
        )}
      </td>

      {/* Participant */}
      <td className="py-2 px-2 align-middle">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={entry.display_name} url={entry.avatar_url} />
          <span className="truncate text-sm font-medium text-text-primary">
            {entry.display_name ?? 'Participante'}
          </span>
        </div>
      </td>

      {/* Puntos */}
      <td className="py-2 px-2 align-middle text-right text-sm font-semibold text-text-primary">
        {entry.total_score}
      </td>

      {/* Premios */}
      <td className="py-2 px-2 align-middle">
        {entry.prizes.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {entry.prizes.map((p, i) => (
              <span key={i} className="text-xs text-purple-primary truncate">{p}</span>
            ))}
          </div>
        ) : isProvisional && hasEventPrizes ? (
          <span
            className="text-xs text-yellow-400 cursor-default"
            title="La asignación se definirá después del desempate."
          >
            Pendiente
          </span>
        ) : (
          <span className="text-xs text-text-muted">&mdash;</span>
        )}
      </td>

      {/* Estado */}
      <td className="py-2 pr-3 pl-2 align-middle text-right whitespace-nowrap">
        <div className="inline-flex flex-wrap gap-1">
          {isTiedProvisional && <Badge type="tie_pending" />}
          {!isProvisional && <RankBadges entry={entry} />}
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile cards builder                                               */
/* ------------------------------------------------------------------ */

function buildMobileCards(entries: RankingEntry[], isProvisional: boolean, hasEventPrizes: boolean) {
  const tieScores = buildTieScores(entries);
  const cards: React.ReactNode[] = [];
  let lastScore: number | null = null;

  entries.forEach((entry) => {
    const displayRank = getDisplayRank(entry, entries, tieScores);
    const isTied = tieScores.has(entry.total_score);
    const isTiedProvisional = isTied && isProvisional;

    if (isProvisional && isTied && entry.total_score !== lastScore) {
      cards.push(
        <div key={`header-${entry.total_score}`} className="text-xs text-text-muted font-medium text-center py-1">
          Empatados por el {displayRank}.º lugar &middot; {entry.total_score} pts
        </div>,
      );
    }

    cards.push(
      <MobileCard
        key={entry.profile_id}
        entry={entry}
        displayRank={displayRank}
        isTiedProvisional={isTiedProvisional}
        isProvisional={isProvisional}
        hasEventPrizes={hasEventPrizes}
      />,
    );

    lastScore = entry.total_score;
  });

  return cards;
}

/* ------------------------------------------------------------------ */
/*  Mobile card                                                        */
/* ------------------------------------------------------------------ */

function MobileCard({
  entry,
  displayRank,
  isTiedProvisional,
  isProvisional,
  hasEventPrizes,
}: {
  entry: RankingEntry;
  displayRank: number;
  isTiedProvisional: boolean;
  isProvisional: boolean;
  hasEventPrizes: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-surface p-3 ${
        isTiedProvisional ? 'border-yellow-500/20' : 'border-border'
      }`}
    >
      {/* Row 1: position + avatar + name + points + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isTiedProvisional ? (
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-sm font-semibold text-amber-400"
              aria-label="Posición pendiente de desempate"
            >
              ?
            </span>
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-primary text-xs font-bold text-white">
              {displayRank}
            </span>
          )}
          <UserAvatar name={entry.display_name} url={entry.avatar_url} />
          <span className="truncate text-sm font-medium text-text-primary">
            {entry.display_name ?? 'Participante'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isProvisional && <RankBadges entry={entry} />}
          <span className="text-sm font-semibold text-text-primary">
            {entry.total_score} pts
          </span>
        </div>
      </div>

      {/* Row 2: prizes */}
      {entry.prizes.length > 0 ? (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {entry.prizes.map((p, i) => (
            <span key={i} className="text-xs text-purple-primary">{p}</span>
          ))}
        </div>
      ) : isProvisional && hasEventPrizes ? (
        <div className="mt-1.5 text-xs text-yellow-400">Premio pendiente de desempate</div>
      ) : null}

      {/* Badges (provisional) */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {isTiedProvisional && <Badge type="tie_pending" />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function RankingSkeleton() {
  return (
    <div className="flex flex-col gap-3 motion-safe:animate-pulse" aria-label="Cargando clasificación">
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[90px]" />
            <col />
            <col className="w-[100px]" />
            <col className="w-[180px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="py-2 pr-2 font-medium">Posición</th>
              <th className="py-2 px-2 font-medium">Participante</th>
              <th className="py-2 px-2 font-medium text-right">Puntos</th>
              <th className="py-2 px-2 font-medium">Premio</th>
              <th className="py-2 pr-3 pl-2 font-medium text-right">Estado</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2.5 pr-2"><div className="size-7 rounded-full bg-surface-hover" /></td>
                <td className="py-2.5 px-2"><div className="h-4 w-32 rounded bg-surface-hover" /></td>
                <td className="py-2.5 px-2 text-right"><div className="ml-auto h-4 w-10 rounded bg-surface-hover" /></td>
                <td className="py-2.5 px-2"><div className="h-4 w-16 rounded bg-surface-hover" /></td>
                <td className="py-2.5 pr-3 pl-2 text-right"><div className="ml-auto h-4 w-14 rounded bg-surface-hover" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="size-7 rounded-full bg-surface-hover" />
            <div className="flex-1">
              <div className="h-4 w-28 rounded bg-surface-hover" />
            </div>
            <div className="h-4 w-10 rounded bg-surface-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rank badges (post-tiebreaker)                                      */
/* ------------------------------------------------------------------ */

function RankBadges({ entry }: { entry: RankingEntry }) {
  if (entry.is_tiebreaker_winner) {
    return <Badge type="winner" />;
  }
  if (entry.rank === 1 && entry.prizes.length > 0) {
    return <Badge type="winner" />;
  }
  if (entry.prizes.length > 0) {
    return <Badge type="prized" />;
  }
  return null;
}
