'use client';

import type { LeaderboardEntry } from '@/app/actions/leaderboard';
import type { Prize } from '@/app/actions/participant';

interface ParticipantSummaryTabProps {
  myEntry: { rank: number; display_name: string | null } | null;
  myScore: { total_score: number | null; correct_answers: number; total_questions: number } | null;
  isTiebreakerWinner: boolean;
  isTiebreakerLoser: boolean;
  hasResolvedTies: boolean;
  wonPrizeIds: Set<string>;
  prizes: Prize[];
  leaderboard: LeaderboardEntry[];
  myProfileId?: string;
}

function PrizeCard({
  label,
  amount,
  currency,
  category,
  isWon,
}: {
  label: string;
  amount: number | null;
  currency: string | null;
  category: string | null;
  isWon: boolean;
}) {
  const isSubBonus = category === 'subscriber_bonus';
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 ${
      isSubBonus
        ? 'border-purple-primary/25 bg-purple-primary/[0.03]'
        : isWon
          ? 'border-green-500/30 bg-green-500/[0.03]'
          : 'border-border bg-surface'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold ${isSubBonus ? 'text-purple-primary' : isWon ? 'text-green-400' : 'text-text-primary'}`}>
            {isSubBonus && '★ '}{label}
          </p>
          {amount !== null && (
            <p className="mt-0.5 text-xs text-text-muted">
              {amount.toLocaleString('es-ES')} {currency ?? 'USD'}
            </p>
          )}
        </div>
        {isWon && (
          <span className="shrink-0 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[11px] font-medium text-green-400">
            Ganaste
          </span>
        )}
      </div>
    </div>
  );
}

export function ParticipantSummaryTab({
  myEntry,
  myScore,
  isTiebreakerWinner,
  isTiebreakerLoser,
  hasResolvedTies,
  wonPrizeIds,
  prizes,
}: ParticipantSummaryTabProps) {
  const wonPrizes = prizes.filter((p) => wonPrizeIds.has(p.id));
  const generalPrizes = prizes.filter((p) => p.prize_category !== 'subscriber_bonus');
  const subscriberPrizes = prizes.filter((p) => p.prize_category === 'subscriber_bonus');

  return (
    <div className="flex flex-col gap-5">
      {/* Personal result */}
      {myEntry && myScore && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Tu resultado
          </h3>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold text-text-primary">
                {myEntry.rank}.&deg;
              </p>
              <p className="text-xs text-text-muted mt-0.5">lugar</p>
            </div>
              <div className="ml-auto text-right">
                <p className="text-xl font-bold text-text-primary">
                  {myScore.total_score ?? 0}
                </p>
                <p className="text-xs text-text-muted">pts</p>
              </div>
          </div>

          {/* Tiebreaker status */}
          {myEntry.rank === 1 && !hasResolvedTies && (
            <p className="mt-3 text-xs font-medium text-amber-400">Ganador del Pick&apos;em</p>
          )}
          {isTiebreakerWinner && (
            <p className="mt-3 text-xs text-text-muted">Posición definida por desempate</p>
          )}
          {isTiebreakerLoser && (
            <p className="mt-3 text-xs text-text-muted">Posición definida tras desempate</p>
          )}
        </section>
      )}

      {/* Won prizes */}
      {wonPrizes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {wonPrizes.length === 1 ? 'Premio ganado' : 'Premios ganados'}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {wonPrizes.map((p) => (
              <PrizeCard
                key={p.id}
                label={p.label}
                amount={p.amount}
                currency={p.currency}
                category={p.prize_category}
                isWon
              />
            ))}
          </div>
        </section>
      )}

      {wonPrizes.length === 0 && myEntry && (
        <p className="text-sm text-text-muted">No ganaste premio en este Pick&apos;em.</p>
      )}

      {/* All event prizes */}
      {prizes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Premios del evento
          </h3>

          {generalPrizes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-text-muted">Premios de clasificación</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {generalPrizes.map((p) => (
                  <PrizeCard
                    key={p.id}
                    label={p.label}
                    amount={p.amount}
                    currency={p.currency}
                    category={p.prize_category}
                    isWon={wonPrizeIds.has(p.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {subscriberPrizes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-text-muted">Beneficios exclusivos para subs</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {subscriberPrizes.map((p) => (
                  <PrizeCard
                    key={p.id}
                    label={p.label}
                    amount={p.amount}
                    currency={p.currency}
                    category={p.prize_category}
                    isWon={wonPrizeIds.has(p.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
