'use client';

import ReactCountryFlag from 'react-country-flag';

export interface EnrichedPick {
  position: number;
  playerName: string;
  countryCode: string | null;
  officialPosition: number | null;
  hasPresence: boolean;
  hasExactPosition: boolean;
  points: number;
}

interface ParticipantMyPicksTabProps {
  picks: EnrichedPick[];
}

export function ParticipantMyPicksTab({ picks }: ParticipantMyPicksTabProps) {
  if (picks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-text-muted">No hay selección registrada.</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Tu selección</h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Cada pick muestra los puntos que aportó a tu puntuación final.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {picks.map((pick) => {
          const badge = pick.hasExactPosition
            ? { label: 'Posición exacta', style: 'bg-green-500/15 text-green-400' }
            : pick.hasPresence
              ? { label: 'Top acertado', style: 'bg-blue-500/15 text-blue-400' }
              : { label: 'Sin acierto', style: 'bg-surface-hover text-text-muted' };

          return (
            <div
              key={pick.position}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
                {pick.position}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {pick.countryCode && (
                    <span className="shrink-0 text-base leading-none">
                      <ReactCountryFlag
                        countryCode={pick.countryCode}
                        svg
                        style={{ width: '1.1em', height: '1.1em' }}
                        title={pick.countryCode}
                      />
                    </span>
                  )}
                  <p className="truncate text-sm font-medium text-text-primary">
                    {pick.playerName}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  {pick.officialPosition !== null
                    ? `Resultado real: ${pick.officialPosition}.º`
                    : 'Resultado real: No clasificó'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 rounded-md border border-purple-primary/30 bg-purple-primary/[0.04] px-2 py-0.5 text-xs font-semibold text-purple-primary">
                  +{pick.points} pt{pick.points !== 1 ? 's' : ''}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.style}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-surface px-4 py-3">
        <p className="text-xs text-text-muted">
          <span className="font-medium text-purple-primary">+1</span> Jugador correcto dentro del Top 8{' · '}
          <span className="font-medium text-purple-primary">+1</span> Posición exacta
        </p>
      </div>
    </section>
  );
}
