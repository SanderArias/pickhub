'use client';

import type { TieGroup } from '@/app/actions/tiebreaker';

interface PendingTiebreakerCardProps {
  group: TieGroup;
  onResolve: () => void;
}

export function PendingTiebreakerCard({ group, onResolve }: PendingTiebreakerCardProps) {
  const names = group.participants.map((p) => p.display_name ?? 'Participante');

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.03] px-5 py-5">
        <div className="mb-3">
          <h3 className="text-base font-bold text-text-primary">
            Empate por el {ordinalLabel(group.score)} lugar
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {names.join(' y ')} terminaron con {group.score} puntos.
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-1.5">
          {group.participants.map((p) => (
            <div
              key={p.profile_id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
                {p.display_name ? p.display_name.charAt(0).toUpperCase() : '?'}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {p.display_name ?? 'Participante'}
              </span>
            </div>
          ))}
        </div>

        <p className="mb-4 text-xs text-text-muted">
          La posici&oacute;n final se decidir&aacute; mediante un sorteo.
        </p>

        <button
          type="button"
          onClick={onResolve}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          Resolver desempate
        </button>
      </div>
    </section>
  );
}

function ordinalLabel(_score: number): string {
  return '1.er';
}
