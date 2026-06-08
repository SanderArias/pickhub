'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { PaginatedRanking } from '@/activities/pickem/actions/results-data';
import { getFinalRanking } from '@/activities/pickem/actions/results-data';
import { RankingTable, RankingTableSkeleton } from './RankingTable';

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
  const currentQuery = searchParams.get('q') ?? '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await getFinalRanking(eventId, currentPage, 50, currentQuery);
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId, currentPage, currentQuery]);

  function updateUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(params)) {
      if (val === undefined || val === '' || val === '1' || (key === 'q' && val === '')) {
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

  function goToPage(p: number) {
    updateUrl({ page: String(p) });
  }

  const isProvisional = !!hasPendingTiebreakers;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary">
          Clasificación
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

      {/* Loading skeleton */}
      {loading && <RankingTableSkeleton />}

      {/* Table */}
      {!loading && data && data.entries.length > 0 && (
        <>
          <RankingTable
            entries={data.entries}
            isProvisional={isProvisional}
            hasPrizes={!!hasEventPrizes}
          />

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
            {currentQuery
              ? 'No se encontraron participantes con ese nombre.'
              : "Este Pick'em no recibió participaciones."}
          </p>
        </div>
      )}
    </div>
  );
}


