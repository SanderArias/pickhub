import type { Prize } from '@/app/actions/participant';

const POSITION_LABELS: Record<number, string> = {
  1: 'Top 1',
  2: 'Top 2',
  3: 'Top 3',
  4: 'Top 4',
  5: 'Top 5',
};

const SUB_LABELS: Record<number, string> = {
  1: 'Mejor sub',
  2: '2.\u00ba mejor sub',
  3: '3.\u00ba mejor sub',
  4: '4.\u00ba mejor sub',
  5: '5.\u00ba mejor sub',
};

export function CompactPrizeCard({
  prize,
  position,
  isSub,
}: {
  prize: Prize;
  position: number;
  isSub: boolean;
}) {
  const label = isSub
    ? (SUB_LABELS[position] ?? `${prize.label} #${position}`)
    : (POSITION_LABELS[position] ?? `Top ${position}`);

  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border px-3.5 py-2.5 min-w-[130px] snap-start ${
        isSub
          ? 'border-purple-primary/20 bg-purple-primary/[0.02]'
          : 'border-border bg-surface'
      }`}
    >
      <span
        className={`text-[11px] font-semibold tracking-wide ${
          isSub ? 'text-purple-primary' : position === 1 ? 'text-amber-400' : 'text-text-muted'
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
        {label}
      </span>
      <p className="text-xs font-medium text-text-primary">{prize.label}</p>
      {prize.amount !== null && (
        <p className="text-xs font-semibold text-text-primary">
          {prize.currency ?? 'USD'} {prize.amount.toLocaleString('es-ES')}
        </p>
      )}
    </div>
  );
}
