'use client';

import { useState } from 'react';
import { TiebreakerModal } from './TiebreakerModal';
import type { TieGroup } from '@/app/actions/tiebreaker';

interface TiebreakerSectionProps {
  eventId: string;
  tieGroups: TieGroup[];
  drawsMap: Record<string, number>;
  onTiebreakerDone: () => void;
}

export function TiebreakerSection({ eventId, tieGroups, drawsMap, onTiebreakerDone }: TiebreakerSectionProps) {
  const [modalGroup, setModalGroup] = useState<TieGroup | null>(null);

  if (tieGroups.length === 0) return null;

  const pendingGroups = tieGroups.filter(
    (g) => !g.participants.every((p) => p.profile_id in drawsMap),
  );
  const resolvedGroups = tieGroups.filter((g) =>
    g.participants.every((p) => p.profile_id in drawsMap),
  );

  return (
    <>
      {resolvedGroups.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h2 className="text-sm font-semibold text-text-primary">Desempate resuelto</h2>
          </div>

          <div className="flex flex-col gap-3">
            {resolvedGroups.map((group) => {
              const sorted = group.participants
                .map((p) => ({
                  ...p,
                  order: drawsMap[p.profile_id] ?? 0,
                }))
                .sort((a, b) => a.order - b.order);

              return (
                <div key={group.score} className="rounded-xl border border-border bg-surface p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">
                      Empate por <span className="text-purple-primary">{group.score} pts</span>
                    </p>
                    <span className="text-xs text-text-muted">{group.participants.length} participantes</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {sorted.map((p, i) => {
                      const isWinner = i === 0;
                      return (
                        <div
                          key={p.profile_id}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                            isWinner
                              ? 'border-green-500/40 bg-green-500/5'
                              : 'border-border'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isWinner
                                ? 'bg-green-500 text-white'
                                : 'bg-surface-hover text-text-muted'
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span
                            className={`flex-1 text-sm ${
                              isWinner ? 'font-medium text-green-400' : 'text-text-primary'
                            }`}
                          >
                            {p.display_name ?? 'Participante'}
                          </span>
                          {isWinner && (
                            <span className="shrink-0 rounded-full bg-green-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">
                              Ganador
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs text-text-muted">
                    El desempate fue resuelto mediante sorteo aleatorio.
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pendingGroups.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-primary">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <h2 className="text-sm font-semibold text-text-primary">Desempates pendientes</h2>
          </div>

          <div className="flex flex-col gap-3">
            {pendingGroups.map((group) => (
              <div key={group.score} className="rounded-xl border border-border bg-surface p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary">
                    Empate por <span className="text-purple-primary">{group.score} pts</span>
                  </p>
                  <span className="text-xs text-text-muted">{group.participants.length} participantes</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {group.participants.map((p) => (
                    <div
                      key={p.profile_id}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
                        ?
                      </span>
                      <span className="flex-1 text-sm text-text-primary">
                        {p.display_name ?? 'Participante'}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setModalGroup(group)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-purple-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                  Sortear desempate
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {modalGroup && (
        <TiebreakerModal
          group={modalGroup}
          eventId={eventId}
          onClose={() => setModalGroup(null)}
          onDone={onTiebreakerDone}
        />
      )}
    </>
  );
}
