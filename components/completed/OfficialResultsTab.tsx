import type { OfficialResultEntry } from '@/app/actions/results-data';

function CountryDisplay({ code }: { code: string | null }) {
  if (!code) return <span className="text-text-muted">&mdash;</span>;
  const flag = code
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
  return (
    <span title={code} className="text-base">
      {flag}
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
            Clasificaci&oacute;n final de los jugadores del evento.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">Los resultados oficiales a&uacute;n no est&aacute;n disponibles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Resultados oficiales</h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Clasificaci&oacute;n final de los jugadores del evento.
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="py-2 pr-3 font-medium w-12">Pos.</th>
              <th className="py-2 px-3 font-medium">Jugador</th>
              <th className="py-2 px-3 font-medium w-16">Pa&iacute;s</th>
              {hasSeed && <th className="py-2 pl-3 font-medium w-16">Seed</th>}
            </tr>
          </thead>
          <tbody>
            {results.map((player) => (
              <tr key={player.position} className="border-b border-border last:border-b-0 hover:bg-surface-hover/50">
                <td className="py-2 pr-3 align-middle">
                  <span className="flex size-7 items-center justify-center rounded-full border border-border text-xs font-bold text-text-muted">
                    {player.position}
                  </span>
                </td>
                <td className="py-2 px-3 align-middle">
                  <div className="flex items-center gap-2">
                    {player.image_url && (
                      <img src={player.image_url} alt="" className="size-5 rounded-full object-cover" />
                    )}
                    <span className="font-medium text-text-primary">{player.player_name}</span>
                  </div>
                </td>
                <td className="py-2 px-3 align-middle">
                  <CountryDisplay code={player.country_code} />
                </td>
                {hasSeed && (
                  <td className="py-2 pl-3 align-middle text-xs text-text-muted">
                    {player.seed ?? <span className="text-text-muted">&mdash;</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden flex flex-col gap-1.5">
        {results.map((player) => (
          <div key={player.position} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-text-muted">
              {player.position}
            </span>
            <div className="min-w-0 flex-1 flex items-center gap-2">
              {player.image_url && (
                <img src={player.image_url} alt="" className="size-5 rounded-full object-cover" />
              )}
              <span className="truncate text-sm font-medium text-text-primary">
                {player.player_name}
              </span>
            </div>
            <CountryDisplay code={player.country_code} />
            {hasSeed && player.seed !== null && (
              <span className="text-xs text-text-muted">#{player.seed}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
