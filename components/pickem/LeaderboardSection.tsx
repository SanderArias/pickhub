'use client';

import type { LeaderboardEntry } from '@/app/actions/leaderboard';

interface LeaderboardSectionProps {
  entries: LeaderboardEntry[];
  myProfileId?: string | null;
  tiebreakerWinners?: Set<string> | string[];
}

export function LeaderboardSection({ entries, myProfileId, tiebreakerWinners }: LeaderboardSectionProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-text-muted">
          No hay puntuaciones calculadas aun.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {entries.map((entry, index) => {
        const isMe = entry.profile_id === myProfileId;
        const isTop3 = index < 3;
        const isTieWinner = tiebreakerWinners
          ? tiebreakerWinners instanceof Set
            ? tiebreakerWinners.has(entry.profile_id)
            : tiebreakerWinners.includes(entry.profile_id)
          : false;

        return (
          <div
            key={entry.profile_id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
              isMe
                ? 'border-purple-primary bg-purple-surface'
                : isTieWinner
                  ? 'border-green-500/30 bg-green-500/[0.03]'
                  : 'border-border bg-surface'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isTop3
                  ? 'bg-purple-primary text-white'
                  : 'border border-border text-text-muted'
              }`}
            >
              {entry.rank}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {entry.display_name ?? 'Participante'}
                {isMe && (
                  <span className="ml-1.5 text-xs text-purple-primary">(tu)</span>
                )}
              </p>
              <p className="text-xs text-text-muted">
                {entry.correct_answers} de {entry.total_questions} aciertos
              </p>
            </div>

            <span className="shrink-0 text-sm font-semibold text-text-primary">
              {entry.total_score} pts
            </span>
            {isTieWinner && (
              <span className="shrink-0 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[11px] font-medium text-green-400">
                Ganador desempate
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
