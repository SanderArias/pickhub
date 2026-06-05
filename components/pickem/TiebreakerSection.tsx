'use client';

import { useState, useCallback } from 'react';
import { performTiebreaker } from '@/app/actions/tiebreaker';
import type { TieGroup, TiebreakerDraw } from '@/app/actions/tiebreaker';

interface TiebreakerSectionProps {
  eventId: string;
  tieGroups: TieGroup[];
  onTiebreakerDone: () => void;
}

export function TiebreakerSection({ eventId, tieGroups, onTiebreakerDone }: TiebreakerSectionProps) {
  const [spinningGroup, setSpinningGroup] = useState<number | null>(null);
  const [results, setResults] = useState<Map<number, TiebreakerDraw[]>>(new Map());

  const handleDraw = useCallback(
    async (score: number) => {
      setSpinningGroup(score);
      const res = await performTiebreaker(eventId, score);
      setSpinningGroup(null);

      if (res.error || !res.draws) {
        return;
      }

      setResults((prev) => {
        const next = new Map(prev);
        next.set(score, res.draws!);
        return next;
      });
      onTiebreakerDone();
    },
    [eventId, onTiebreakerDone],
  );

  if (tieGroups.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-primary">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <h2 className="text-sm font-semibold text-text-primary">Desempates pendientes</h2>
      </div>

      <div className="flex flex-col gap-3">
        {tieGroups.map((group) => {
          const drawResult = results.get(group.score);
          const sorted: Array<{ profile_id: string; display_name: string | null; order: number }> = drawResult
            ? group.participants
                .map((p) => ({
                  profile_id: p.profile_id,
                  display_name: p.display_name,
                  order: drawResult.find((d) => d.profile_id === p.profile_id)?.draw_order ?? 0,
                }))
                .sort((a, b) => a.order - b.order)
            : group.participants.map((p) => ({ profile_id: p.profile_id, display_name: p.display_name, order: 0 }));

          return (
            <div key={group.score} className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">
                  Empate por <span className="text-purple-primary">{group.score} pts</span>
                </p>
                <span className="text-xs text-text-muted">{group.participants.length} participantes</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {sorted.map((p, i) => (
                  <div
                    key={p.profile_id}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
                      {drawResult ? i + 1 : '?'}
                    </span>
                    <span className="flex-1 text-sm text-text-primary">
                      {p.display_name ?? 'Participante'}
                    </span>
                    {drawResult && (
                      <span className="text-xs text-text-muted">#{p.order}</span>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleDraw(group.score)}
                disabled={spinningGroup === group.score}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-purple-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
              >
                {spinningGroup === group.score ? (
                  <>
                    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Sorteando...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                    Sortear desempate
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
