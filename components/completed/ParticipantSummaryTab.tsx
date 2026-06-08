'use client';

import type { LeaderboardEntry } from '@/app/actions/leaderboard';
import type { Prize } from '@/app/actions/participant';

function ordinalLabel(n: number): string {
  if (n === 1) return '1.er';
  return `${n}.º`;
}

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
  isTiebreakerPending?: boolean;
  prizeStatuses?: Array<{ definitionId: string; status: string; label: string; amount: number | null; currency: string | null; category: string }>;
  resultStatus?: string | null;
  sharedRank?: number | null;
}

function PrizeCard({
  label,
  amount,
  currency,
  statusLabel,
  statusStyle,
  category,
}: {
  label: string;
  amount: number | null;
  currency: string | null;
  statusLabel: string | null;
  statusStyle: string;
  category: string | null;
}) {
  const isSubBonus = category === 'subscriber_bonus';
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 ${
      isSubBonus
        ? 'border-purple-primary/25 bg-purple-primary/[0.03]'
        : statusStyle === 'won'
          ? 'border-green-500/30 bg-green-500/[0.03]'
          : 'border-border bg-surface'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold ${isSubBonus ? 'text-purple-primary' : statusStyle === 'won' ? 'text-green-400' : 'text-text-primary'}`}>
            {isSubBonus && '★ '}{label}
          </p>
          {amount !== null && (
            <p className="mt-0.5 text-xs text-text-muted">
              {amount.toLocaleString('es-ES')} {currency ?? 'USD'}
            </p>
          )}
        </div>
        {statusLabel && (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-tight whitespace-nowrap ${
            statusStyle === 'won' ? 'bg-green-500/15 text-green-400' :
            statusStyle === 'pending' ? 'bg-amber-500/15 text-amber-400' :
            statusStyle === 'hold' ? 'bg-amber-500/15 text-amber-400' :
            statusStyle === 'available' ? 'bg-blue-500/15 text-blue-400' :
            'bg-surface-hover text-text-muted'
          }`}>
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function getPrizeStatusMeta(status: string, isSubBonus: boolean): { label: string | null; style: string } {
  switch (status) {
    case 'won':
      return { label: isSubBonus ? 'Ganado por ti' : 'Ganaste', style: 'won' };
    case 'pending_assignment':
    case 'on_hold_tiebreaker':
      return { label: 'En espera de desempate', style: 'hold' };
    case 'available':
      return { label: 'Disponible', style: 'available' };
    case 'not_won':
      return { label: null, style: 'not_won' };
    default:
      return { label: null, style: 'default' };
  }
}

export function ParticipantSummaryTab({
  myEntry,
  myScore,
  isTiebreakerWinner,
  isTiebreakerLoser,
  hasResolvedTies,
  wonPrizeIds,
  prizes,
  isTiebreakerPending,
  prizeStatuses,
  resultStatus,
  sharedRank,
}: ParticipantSummaryTabProps) {
  const generalPrizes = prizes.filter((p) => p.prize_category !== 'subscriber_bonus');
  const subscriberPrizes = prizes.filter((p) => p.prize_category === 'subscriber_bonus');
  const isFinalized = resultStatus === 'finalized';

  const inPendingTie = isTiebreakerPending && sharedRank !== null;

  return (
    <div className="flex flex-col gap-5">
      {myEntry && myScore && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Tu resultado
          </h3>

          {inPendingTie ? (
            <div className="flex items-start gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-sm font-semibold text-amber-400"
                aria-label="Posición pendiente de desempate"
              >
                ?
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold text-text-primary">
                  Empatado por el {ordinalLabel(sharedRank!)} lugar
                </p>
                <p className="mt-1 text-lg font-semibold text-text-primary">
                  {myScore.total_score ?? 0} pts
                </p>
                <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5">
                  <p className="text-xs font-medium text-amber-400">Desempate pendiente</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Tu posici&oacute;n final se determinar&aacute; cuando se resuelva el desempate.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-3xl font-bold text-text-primary">
                    {sharedRank !== null
                      ? `Emp. ${sharedRank}.°`
                      : `${myEntry.rank}.°`}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {isTiebreakerPending ? 'posici\u00f3n provisional' : 'lugar'}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xl font-bold text-text-primary">
                    {myScore.total_score ?? 0}
                  </p>
                  <p className="text-xs text-text-muted">pts</p>
                </div>
              </div>

              {isTiebreakerPending && (
                <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5">
                  <p className="text-xs font-medium text-amber-400">Empate pendiente</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    El resultado final se decidir&aacute; mediante el desempate.
                  </p>
                </div>
              )}

              {isFinalized && myEntry.rank === 1 && !isTiebreakerPending && (
                <p className="mt-3 text-xs font-medium text-amber-400">Ganador del Pick&apos;em</p>
              )}

              {isTiebreakerWinner && (
                <p className="mt-3 text-xs text-text-muted">Posici&oacute;n definida por desempate</p>
              )}
              {isTiebreakerLoser && (
                <p className="mt-3 text-xs text-text-muted">Posici&oacute;n definida tras desempate</p>
              )}
            </>
          )}
        </section>
      )}

      {isFinalized && wonPrizeIds.size > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {wonPrizeIds.size === 1 ? 'Premio ganado' : 'Premios ganados'}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {prizes.filter((p) => wonPrizeIds.has(p.id)).map((p) => (
              <PrizeCard
                key={p.id}
                label={p.label}
                amount={p.amount}
                currency={p.currency}
                category={p.prize_category}
                statusLabel="Ganaste"
                statusStyle="won"
              />
            ))}
          </div>
        </section>
      )}

      {isFinalized && !isTiebreakerPending && wonPrizeIds.size === 0 && myEntry && prizes.length > 0 && (
        <p className="text-sm text-text-muted">No obtuviste premio en este Pick&apos;em.</p>
      )}

      {inPendingTie && prizes.length > 0 && (
        <p className="text-xs text-text-muted">
          La asignaci&oacute;n de premios est&aacute; pendiente del desempate.
        </p>
      )}

      {prizes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Premios del evento
          </h3>

          {generalPrizes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-text-muted">Premios de clasificaci&oacute;n</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {generalPrizes.map((p) => {
                  const ps = prizeStatuses?.find((ps) => ps.definitionId === p.id);
                  const statusMeta = getPrizeStatusMeta(ps?.status ?? 'available', false);
                  return (
                    <PrizeCard
                      key={p.id}
                      label={p.label}
                      amount={p.amount}
                      currency={p.currency}
                      category={p.prize_category}
                      statusLabel={statusMeta.label}
                      statusStyle={statusMeta.style}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {subscriberPrizes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-text-muted">Beneficios exclusivos para subs</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {subscriberPrizes.map((p) => {
                  const ps = prizeStatuses?.find((ps) => ps.definitionId === p.id);
                  const statusMeta = getPrizeStatusMeta(ps?.status ?? 'available', true);
                  return (
                    <PrizeCard
                      key={p.id}
                      label={p.label}
                      amount={p.amount}
                      currency={p.currency}
                      category={p.prize_category}
                      statusLabel={statusMeta.label}
                      statusStyle={statusMeta.style}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {prizes.length === 0 && (
        <p className="text-sm text-text-muted">Este Pick&apos;em no tiene premios configurados.</p>
      )}
    </div>
  );
}
