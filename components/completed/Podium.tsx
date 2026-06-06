import type { PodiumEntry } from '@/app/actions/results-data';

function accent(index: number) {
  if (index === 0) return 'border-amber-500/25';
  if (index === 1) return 'border-slate-400/15';
  return 'border-orange-600/15';
}

function positionDot(index: number) {
  if (index === 0) return 'bg-amber-500 text-white';
  if (index === 1) return 'bg-slate-400 text-white';
  return 'bg-orange-600 text-white';
}

function positionLabel(index: number) {
  return `${index + 1}.º`;
}

export function Podium({ entries }: { entries: PodiumEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-primary">Podio</h3>
      <div className="flex flex-col gap-1.5">
        {entries.map((entry, i) => (
          <div
            key={entry.profile_id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${accent(i)}`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${positionDot(i)}`}
            >
              {positionLabel(i)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {entry.display_name ?? 'Participante'}
              </p>
              {entry.tiebreaker_winner && (
                <p className="text-[11px] leading-tight text-green-400 mt-0.5">
                  Ganador definido por desempate
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold text-text-primary">
                {entry.total_score} pts
              </span>
              {i === 0 && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/30">
                  Ganador del Pick&rsquo;em
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
