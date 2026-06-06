import type { Prize } from '@/app/actions/participant';

const POSITION_LABELS: Record<number, string> = {
  1: 'Top 1',
  2: 'Top 2',
  3: 'Top 3',
  4: 'Top 4',
  5: 'Top 5',
};

export function GeneralPrizeCard({
  prize,
  position,
}: {
  prize: Prize;
  position: number;
}) {
  const label = POSITION_LABELS[position] ?? `Top ${position}`;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 min-w-[140px]">
      <span
        className={`text-[11px] font-semibold tracking-wide ${
          position === 1 ? 'text-amber-400' : 'text-text-muted'
        }`}
      >
        {label}
      </span>
      <p className="text-xs font-medium text-text-primary">{prize.label}</p>
      {prize.amount !== null && (
        <p className="text-xs font-bold text-text-primary">
          {prize.currency ?? 'USD'} {prize.amount.toLocaleString('es-ES')}
        </p>
      )}
    </div>
  );
}
