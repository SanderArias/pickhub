'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { RankingEntry, PaginatedRanking } from '@/app/actions/results-data';
import { getFinalRanking } from '@/app/actions/results-data';
import { Badge } from './Badge';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'prized', label: 'Con premio' },
  { value: 'subscribers', label: 'Suscriptores' },
] as const;

function formatPrizeLine(label: string, amount: number | null, currency: string | null): string {
  if (amount !== null) {
    return `${label} \u00b7 ${amount.toLocaleString('es-ES')} ${currency ?? 'USD'}`;
  }
  return label;
}

export function FinalRankingTab({ eventId }: { eventId: string }) {
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Clasificaci&oacute;n final</h2>
        {data && (
          <p className="mt-0.5 text-xs text-text-muted">
            {data.totalCount} participante{data.totalCount !== 1 ? 's' : ''}
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
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleFilter(f.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              currentFilter === f.value
                ? 'bg-purple-primary text-white'
                : 'border border-border bg-surface text-text-secondary hover:border-border-hover'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-text-muted">Cargando...</span>
        </div>
      )}

      {/* Table */}
      {!loading && data && data.entries.length > 0 && (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="py-2 pr-3 font-medium w-12">#</th>
                  <th className="py-2 px-3 font-medium">Participante</th>
                  <th className="py-2 px-3 font-medium text-right">Puntos</th>
                  <th className="py-2 px-3 font-medium text-right">Aciertos</th>
                  <th className="py-2 px-3 font-medium">Premios</th>
                  <th className="py-2 pl-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <RankingRow key={entry.profile_id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-2">
            {data.entries.map((entry) => (
              <div key={entry.profile_id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-primary text-xs font-bold text-white">
                      {entry.rank}
                    </span>
                    <span className="truncate text-sm font-medium text-text-primary">
                      {entry.display_name ?? 'Participante'}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-text-primary">
                    {entry.total_score} pts
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-text-muted">
                  <span>{entry.correct_answers}/{entry.total_questions} aciertos</span>
                </div>
                {entry.prizes.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {entry.prizes.map((p, i) => (
                      <span key={i} className="text-xs text-purple-primary">{p}</span>
                    ))}
                  </div>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <RankBadges entry={entry} />
                </div>
              </div>
            ))}
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
              : 'Este Pick\u2019em no recibi\u00f3 participaciones.'}
          </p>
        </div>
      )}
    </div>
  );
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  const isTop3 = entry.rank <= 3;
  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-surface-hover/50">
      <td className="py-2.5 pr-3 align-middle">
        <span
          className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
            isTop3 ? 'bg-purple-primary text-white' : 'border border-border text-text-muted'
          }`}
        >
          {entry.rank}
        </span>
      </td>
      <td className="py-2.5 px-3 align-middle">
        <span className="font-medium text-text-primary">{entry.display_name ?? 'Participante'}</span>
      </td>
      <td className="py-2.5 px-3 align-middle text-right font-semibold text-text-primary">
        {entry.total_score}
      </td>
      <td className="py-2.5 px-3 align-middle text-right text-text-muted">
        {entry.correct_answers}/{entry.total_questions}
      </td>
      <td className="py-2.5 px-3 align-middle">
        {entry.prizes.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {entry.prizes.map((p, i) => (
              <span key={i} className="text-xs text-purple-primary">{p}</span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-text-muted">&mdash;</span>
        )}
      </td>
      <td className="py-2.5 pl-3 align-middle">
        <div className="flex flex-wrap gap-1">
          <RankBadges entry={entry} />
        </div>
      </td>
    </tr>
  );
}

function RankBadges({ entry }: { entry: RankingEntry }) {
  return (
    <>
      {entry.rank === 1 && entry.prizes.length > 0 && <Badge type="winner" />}
      {entry.prizes.length > 0 && entry.rank !== 1 && <Badge type="prized" />}
      {entry.is_tiebreaker_winner && <Badge type="tiebreaker" />}
    </>
  );
}
