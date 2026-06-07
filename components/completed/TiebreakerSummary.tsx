'use client';

import { useState } from 'react';
import type { CompletedSummary } from '@/app/actions/results-data';
import { UserAvatar } from '@/components/ui/UserAvatar';

export function TiebreakerSummary({ summary }: { summary: CompletedSummary }) {
  const [showDetail, setShowDetail] = useState(false);

  if (!summary.hasTiebreakers) return null;

  return (
    <section className="flex flex-col gap-3">
      {summary.tiebreakerGroups.map((group) => {
        const sorted = group.participants
          .map((p) => ({
            ...p,
            order: group.draws.find((d) => d.profile_id === p.profile_id)?.draw_order ?? 999,
          }))
          .sort((a, b) => a.order - b.order);

        const winner = sorted[0];
        const runnerUp = sorted[1];
        const affectedRank = Math.min(
          ...sorted.map((p) =>
            summary.podium.find((po) => po.profile_id === p.profile_id)?.rank ?? 0,
          ),
        );

        return (
          <div
            key={group.score}
            className="rounded-lg border border-border bg-surface px-4 py-3"
          >
            <h3 className="text-sm font-semibold text-text-primary">
              Desempate por el {affectedRank}.º lugar
            </h3>

            <p className="mt-1 text-xs text-text-muted">
              {sorted.map((p) => p.display_name ?? 'Participante').join(' y ')} finalizaron con{' '}
              {group.score} puntos.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex -space-x-2">
                {sorted.slice(0, 2).map((p) => (
                  <UserAvatar
                    key={p.profile_id}
                    name={p.display_name}
                    url={null}
                    size={28}
                  />
                ))}
              </div>
              <span className="text-xs text-text-muted">
                {sorted.length} participantes
              </span>
            </div>

            {winner && (
              <p className="mt-2 text-xs text-text-primary">
                <span className="font-medium text-green-400">
                  {winner.display_name ?? 'Participante'}
                </span>{' '}
                ganó el sorteo y obtuvo el {affectedRank}.º lugar.
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowDetail(!showDetail)}
              className="mt-2 text-xs font-medium text-purple-primary hover:text-purple-400"
            >
              {showDetail ? 'Ocultar' : 'Ver resultado del sorteo'}
            </button>

            {showDetail && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <div className="grid gap-x-4 gap-y-0.5 text-xs text-text-muted sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-text-secondary">Puntuación:</span>{' '}
                    {group.score} pts
                  </div>
                  <div>
                    <span className="font-medium text-text-secondary">Método:</span>{' '}
                    Sorteo aleatorio
                  </div>
                  <div>
                    <span className="font-medium text-text-secondary">Participantes:</span>{' '}
                    {group.participants.length}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {sorted.map((p, i) => (
                    <div
                      key={p.profile_id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
                        i === 0 ? 'border-green-500/30 bg-green-500/[0.03]' : 'border-border'
                      }`}
                    >
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          i === 0 ? 'bg-green-500 text-white' : 'bg-surface-hover text-text-muted'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className={`flex-1 text-xs ${i === 0 ? 'font-medium text-green-400' : 'text-text-primary'}`}>
                        {p.display_name ?? 'Participante'}
                      </span>
                      {i === 0 && (
                        <span className="shrink-0 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                          Ganador
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
