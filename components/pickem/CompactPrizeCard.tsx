import type { Prize } from '@/app/actions/participant';
import { formatPrizeAmount, getPrizeTargetLabel } from '@/activities/pickem/prizes/format';

export function CompactPrizeCard({
  prize,
}: {
  prize: Prize;
}) {
  const isSub = prize.prize_category === 'subscriber_bonus';
  const targetLabel = getPrizeTargetLabel(prize.rankPosition, prize.subscriberOrder, prize.prize_category);
  const formattedAmount = formatPrizeAmount(prize.amount, prize.currency);

  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border px-3.5 py-2.5 min-w-[130px] snap-start ${
        isSub
          ? 'border-purple-primary/20 bg-purple-primary/[0.02]'
          : 'border-border bg-surface'
      }`}
    >
      {targetLabel ? (
        <span
          className={`text-[11px] font-semibold tracking-wide ${
            isSub ? 'text-purple-primary' : 'text-amber-400'
          }`}
        >
          {isSub && (
            <svg
              className="inline-block size-3 mr-1 -mt-0.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11.571 4.714s0 2.286 0 2.286c0 0 3.722 0 3.722 0 0 0 0-2.286 0-2.286 0 0-3.722 0-3.722 0zm-3.286 11.432c-1.143 1.714-4.286 6.143-4.286 6.143 0 0 7.143-3.429 7.143-3.429 0 0-2.857-2.714-2.857-2.714zm12.286-11.432c0 0 0 2.286 0 2.286 0 0 3.722 0 3.722 0 0 0 0-2.286 0-2.286 0 0-3.722 0-3.722 0zm-4.286 0c0 0 0 2.286 0 2.286 0 0 3.722 0 3.722 0 0 0 0-2.286 0-2.286 0 0-3.722 0-3.722 0zm-8.571 4.286c0 0 0 2.286 0 2.286 0 0 3.722 0 3.722 0 0 0 0-2.286 0-2.286 0 0-3.722 0-3.722 0zm11.715 1.143c0 3.314-2.686 6-6 6-3.313 0-6-2.686-6-6 0-3.314 2.687-6 6-6 3.314 0 6 2.686 6 6z" />
          </svg>
        )}
        {targetLabel}
      </span>
      ) : null}
      <p className="text-xs font-medium text-text-primary">{prize.label}</p>
      {formattedAmount && (
        <p className="text-xs font-semibold text-text-primary">{formattedAmount}</p>
      )}
    </div>
  );
}
