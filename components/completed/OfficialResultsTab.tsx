import type { OfficialResultEntry } from '@/activities/pickem/actions/results-data';
import { CountryDisplay } from '@/components/ui/CountryDisplay';

const POSITION_BADGES = [
  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'bg-slate-400/15 text-slate-300 border-slate-400/30',
  'bg-amber-700/15 text-amber-600 border-amber-700/30',
] as const;

function PositionBadge({ position }: { position: number }) {
  const style = position >= 1 && position <= 3
    ? POSITION_BADGES[position - 1]
    : 'border border-border text-text-muted';

  return (
    <span
      className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${style}`}
    >
      {position}
    </span>
  );
}

export function OfficialResultsTab({ results }: { results: OfficialResultEntry[] }) {
  const hasSeed = results.some((r) => r.seed !== null);

  if (results.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Resultados oficiales</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Clasificación de los jugadores del evento.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">Los resultados oficiales aún no están disponibles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Resultados oficiales</h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Clasificación de los jugadores del evento.
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <colgroup>
            <col className="w-[72px]" />
            <col />
            <col className="w-[180px] lg:w-[200px]" />
            {hasSeed && <col className="w-[64px]" />}
          </colgroup>
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="py-2 pr-2 font-medium">Pos.</th>
              <th className="py-2 px-2 font-medium">Jugador</th>
              <th className="py-2 pl-2 font-medium">Pa&iacute;s</th>
              {hasSeed && <th className="py-2 pl-2 font-medium text-center">Seed</th>}
            </tr>
          </thead>
          <tbody>
            {results.map((player) => (
              <tr
                key={player.position}
                className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-hover/50"
              >
                <td className="py-2 pr-2 align-middle">
                  <PositionBadge position={player.position} />
                </td>
                <td className="py-2 px-2 align-middle">
                  <div className="flex items-center gap-2 min-w-0">
                    {player.image_url && (
                      <img
                        src={player.image_url}
                        alt=""
                        className="size-5 shrink-0 rounded-full object-cover"
                      />
                    )}
                    <span className="truncate text-sm font-medium text-text-primary">
                      {player.player_name}
                    </span>
                  </div>
                </td>
                <td className="py-2 pl-2 align-middle">
                  <CountryDisplay code={player.country_code} showName />
                </td>
                {hasSeed && (
                  <td className="py-2 pl-2 align-middle text-center text-xs text-text-muted">
                    {player.seed ?? <span className="text-text-muted">&mdash;</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden flex flex-col gap-2">
        {results.map((player) => (
          <div
            key={player.position}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
          >
            <PositionBadge position={player.position} />
            <div className="min-w-0 flex-1 flex items-center gap-2">
              {player.image_url && (
                <img
                  src={player.image_url}
                  alt=""
                  className="size-5 shrink-0 rounded-full object-cover"
                />
              )}
              <span className="truncate text-sm font-medium text-text-primary">
                {player.player_name}
              </span>
            </div>
            <CountryDisplay code={player.country_code} showName={false} showCode />
            {hasSeed && player.seed !== null && (
              <span className="shrink-0 text-xs text-text-muted">#{player.seed}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
