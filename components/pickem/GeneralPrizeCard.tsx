import type { Prize } from '@/app/actions/participant';
import { getPrizeTargetLabel } from '@/activities/pickem/prizes/format';

export function GeneralPrizeCard({
  prize,
}: {
  prize: Prize;
}) {
  const targetLabel = getPrizeTargetLabel(prize.rankPosition, prize.subscriberOrder, prize.prize_category);

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 min-w-[140px]">
      {targetLabel ? (
        <span className="text-[11px] font-semibold tracking-wide text-amber-400">
          {targetLabel}
        </span>
      ) : null}
      <p className="text-xs font-medium text-text-primary">{prize.label}</p>
      {prize.amount !== null && (
        <p className="text-xs font-bold text-text-primary">
          {prize.currency ?? 'USD'} {prize.amount.toLocaleString('es-ES')}
        </p>
      )}
    </div>
  );
}
