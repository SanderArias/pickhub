'use client';

import type { LeaderboardEntry } from '@/app/actions/leaderboard';
import type { Prize } from '@/app/actions/participant';
import { getPrizeTargetLabel } from '@/activities/pickem/prizes/format';

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
  prizeStatuses?: Array<{ definitionId: string; status: string; label: string; amount: number | null; currency: string | null; category: string; winnerName?: string | null }>;
  resultStatus?: string | null;
  sharedRank?: number | null;
  prizeAwards?: Array<{
    prize_id: string;
    prize_label: string;
    prize_amount: number | null;
    prize_currency: string | null;
    prize_category: string | null;
    profile_id: string | null;
    display_name: string | null;
    award_status: string;
    rank_achieved: number | null;
  }>;
}

function PrizeCard({
  label,
  amount,
  currency,
  statusLabel,
  statusStyle,
  category,
  rankPosition,
  subscriberOrder,
}: {
  label: string;
  amount: number | null;
  currency: string | null;
  statusLabel: string | null;
  statusStyle: string;
  category: string | null;
  rankPosition: number | null;
  subscriberOrder: number | null;
}) {
  const isSubBonus = category === 'subscriber_bonus';
  const targetLabel = getPrizeTargetLabel(rankPosition, subscriberOrder, category);
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
          {targetLabel && (
            <span className={`text-[11px] font-semibold tracking-wide ${isSubBonus ? 'text-purple-primary' : 'text-amber-400'}`}>
              {isSubBonus && '★ '}{targetLabel}
            </span>
          )}
          <p className={`text-xs font-semibold ${isSubBonus ? 'text-purple-primary' : statusStyle === 'won' ? 'text-green-400' : 'text-text-primary'}`}>
            {label}
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
            statusStyle === 'unassigned' ? 'bg-surface-hover text-text-muted' :
            'bg-surface-hover text-text-muted'
          }`}>
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function getAwardStatusMeta(
  award_status: string,
  profile_id: string | null,
  display_name: string | null,
  currentProfileId: string | undefined,
): { label: string | null; style: string } {
  switch (award_status) {
    case 'assigned':
      if (profile_id === currentProfileId) return { label: 'Ganado por ti', style: 'won' };
      return { label: display_name ? `Ganado por ${display_name}` : 'Ganado', style: 'not_won' };
    case 'unassigned_no_eligible_winner':
      return { label: 'Sin ganador elegible', style: 'unassigned' };
    case 'blocked_by_tiebreaker':
      return { label: 'En espera de desempate', style: 'hold' };
    case 'unassigned':
      return { label: null, style: 'default' };
    case 'review_required':
      return { label: null, style: 'default' };
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
  myProfileId,
  prizeAwards,
}: ParticipantSummaryTabProps) {
  const generalPrizes = prizes.filter((p) => p.prize_category !== 'subscriber_bonus');
  const subscriberPrizes = prizes.filter((p) => p.prize_category === 'subscriber_bonus');
  const isFinalized = resultStatus === 'finalized';
  const inPendingTie = isTiebreakerPending && sharedRank !== null;

  // Compute current user's assigned awards from prizeAwards
  const currentUserAwards = (prizeAwards ?? []).filter(
    (a) => a.award_status === 'assigned' && a.profile_id === myProfileId,
  );
  const hasWonPrize = currentUserAwards.length > 0;

  console.info('[pickem:participant-prizes]', {
    currentProfileId: myProfileId,
    prizeAwards,
    currentUserAwards,
  });

  // Build lookup by prize_id
  const awardByDefId = new Map((prizeAwards ?? []).map((a) => [a.prize_id, a]));

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
                    Tu posición final se determinará cuando se resuelva el desempate.
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
                    {sharedRank !== null ? 'posici\u00f3n pendiente' : 'lugar'}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xl font-bold text-text-primary">
                    {myScore.total_score ?? 0}
                  </p>
                  <p className="text-xs text-text-muted">pts</p>
                </div>
              </div>

              {sharedRank !== null && (
                <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5">
                  <p className="text-xs font-medium text-amber-400">Empate pendiente</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    El resultado final se decidirá mediante el desempate.
                  </p>
                </div>
              )}

              {isFinalized && !isTiebreakerPending && !sharedRank && myEntry.rank === 1 && !isTiebreakerWinner && !isTiebreakerLoser && (
                <p className="mt-3 text-xs font-medium text-amber-400">Ganador del Pick&apos;em</p>
              )}

              {isFinalized && !isTiebreakerPending && isTiebreakerWinner && (
                <p className="mt-3 text-xs text-text-muted">Posición definida por desempate</p>
              )}
              {isFinalized && !isTiebreakerPending && isTiebreakerLoser && (
                <p className="mt-3 text-xs text-text-muted">Posición definida tras desempate</p>
              )}
              {isFinalized && !isTiebreakerPending && !isTiebreakerWinner && !isTiebreakerLoser && !sharedRank && (
                <p className="mt-3 text-xs text-text-muted">Posición definida tras desempate</p>
              )}
            </>
          )}
        </section>
      )}

      {isFinalized && hasWonPrize && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {currentUserAwards.length === 1 ? 'Premio ganado' : 'Premios ganados'}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentUserAwards.map((a) => (
              <PrizeCard
                key={a.prize_id}
                label={a.prize_label}
                amount={a.prize_amount}
                currency={a.prize_currency}
                category={a.prize_category}
                rankPosition={a.rank_achieved}
                subscriberOrder={null}
                statusLabel="Ganaste"
                statusStyle="won"
              />
            ))}
          </div>
        </section>
      )}

      {isFinalized && !isTiebreakerPending && !hasWonPrize && myEntry && prizes.length > 0 && (
        <p className="text-sm text-text-muted">No obtuviste premio en este Pick&apos;em.</p>
      )}

      {inPendingTie && prizes.length > 0 && (
        <p className="text-xs text-text-muted">
          La asignación de premios está pendiente del desempate.
        </p>
      )}

      {prizes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Premios del evento
          </h3>

          {generalPrizes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-text-muted">Premios de clasificación</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {generalPrizes.map((p) => {
                    const award = awardByDefId.get(p.id);
                    const statusMeta = award
                      ? getAwardStatusMeta(award.award_status, award.profile_id, award.display_name, myProfileId)
                      : { label: null, style: 'default' as const };
                    return (
                      <PrizeCard
                        key={p.id}
                        label={p.label}
                        amount={p.amount}
                        currency={p.currency}
                        category={p.prize_category}
                        rankPosition={p.rankPosition}
                        subscriberOrder={p.subscriberOrder}
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
                  const award = awardByDefId.get(p.id);
                  const statusMeta = award
                    ? getAwardStatusMeta(award.award_status, award.profile_id, award.display_name, myProfileId)
                    : { label: null, style: 'default' as const };
                  return (
                    <PrizeCard
                      key={p.id}
                      label={p.label}
                      amount={p.amount}
                      currency={p.currency}
                      category={p.prize_category}
                      rankPosition={p.rankPosition}
                      subscriberOrder={p.subscriberOrder}
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
