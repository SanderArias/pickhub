'use client';

import { useState } from 'react';
import type { CompletedSummary } from '@/app/actions/results-data';

export function TiebreakerSummary({ summary }: { summary: CompletedSummary }) {
  const [expanded, setExpanded] = useState(false);

  if (!summary.hasTiebreakers) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-text-primary">Desempate resuelto</h3>

      {summary.tiebreakerGroups.map((group) => {
        const sorted = group.participants
          .map((p) => ({
            ...p,
            order: group.draws.find((d) => d.profile_id === p.profile_id)?.draw_order ?? 999,
          }))
          .sort((a, b) => a.order - b.order);

        const winner = sorted[0];
        const runnerUp = sorted[1];

        return (
          <div key={group.score} className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
            <p className="text-sm text-text-primary">
              <span className="font-medium">{winner.display_name ?? 'Participante'}</span>
              {runnerUp
                ? ` obtuvo el primer lugar tras empatar con ${runnerUp.display_name ?? 'Participante'}.`
                : ' obtuvo el primer lugar.'}
            </p>

            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-medium text-purple-primary hover:text-purple-400"
            >
              {expanded ? 'Ocultar detalles' : 'Ver detalles'}
            </button>

            {expanded && (
              <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                <div className="grid gap-x-4 gap-y-0.5 text-xs text-text-muted sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-text-secondary">Puntuaci&oacute;n:</span>{' '}
                    {group.score} pts
                  </div>
                  <div>
                    <span className="font-medium text-text-secondary">M&eacute;todo:</span>{' '}
                    Sorteo aleatorio
                  </div>
                  <div>
                    <span className="font-medium text-text-secondary">Participantes:</span>{' '}
                    {group.participants.length}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium text-text-secondary">Orden:</span>{' '}
                    {sorted.map((p) => p.display_name ?? 'Participante').join(', ')}
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
