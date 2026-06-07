'use client';

import type { PodiumEntry } from '@/activities/pickem/actions/results-data';
import { UserAvatar } from '@/components/ui/UserAvatar';

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
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${accent(i)}`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${positionDot(i)}`}
            >
              {positionLabel(i)}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <UserAvatar name={entry.display_name} url={entry.avatar_url} size={28} />
                <span className="truncate text-sm font-medium text-text-primary">
                  {entry.display_name ?? 'Participante'}
                </span>
                {entry.is_verified_subscriber && (
                  <span className="shrink-0 rounded-md border border-purple-primary/30 bg-purple-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-purple-primary leading-tight">
                    ★ Sub
                  </span>
                )}
              </div>

              {entry.tiebreaker_winner && (
                <p className="mt-0.5 text-[11px] leading-tight text-green-400">
                  Posición definida por desempate
                </p>
              )}

              {entry.awards.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {entry.awards.map((a) => (
                    <span
                      key={a.prize_id}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-tight ${
                        a.category === 'subscriber_bonus'
                          ? 'border-purple-primary/30 bg-purple-primary/10 text-purple-primary'
                          : 'border-border bg-surface-hover text-text-secondary'
                      }`}
                    >
                      {a.label}{a.value_label ? ` · ${a.value_label}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center self-start">
              <span className="text-sm font-semibold text-text-primary">
                {entry.total_score} pts
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
