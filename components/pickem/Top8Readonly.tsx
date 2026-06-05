'use client';

import ReactCountryFlag from 'react-country-flag';

interface RankedPlayer {
  position: number;
  optionId: string;
  label: string;
  playerId: string | null;
}

interface Top8ReadonlyProps {
  rankedPlayers: RankedPlayer[];
  activePlayers: Array<{ id: string; country_code: string | null }>;
}

export function Top8Readonly({ rankedPlayers, activePlayers }: Top8ReadonlyProps) {
  const playerLookup = new Map(activePlayers.map((p) => [p.id, p.country_code]));

  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: 8 }, (_, i) => {
        const slot = rankedPlayers.find((r) => r.position === i + 1);

        if (slot) {
          const countryCode = slot.playerId ? playerLookup.get(slot.playerId) ?? null : null;

          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
                {i + 1}
              </span>
              <span className="flex-1 truncate text-sm text-text-primary">{slot.label}</span>
              {countryCode && (
                <span className="shrink-0">
                  <ReactCountryFlag
                    countryCode={countryCode}
                    svg
                    style={{ width: '1.1em', height: '1.1em' }}
                    title={countryCode}
                  />
                </span>
              )}
            </div>
          );
        }

        return (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-transparent px-3 py-2.5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
              {i + 1}
            </span>
            <span className="text-xs text-text-muted">—</span>
          </div>
        );
      })}
    </div>
  );
}
