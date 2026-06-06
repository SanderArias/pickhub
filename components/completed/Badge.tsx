const BADGE_STYLES = {
  winner: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  prized: 'bg-purple-primary/15 text-purple-primary border-purple-primary/30',
  subscriber: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  tiebreaker: 'bg-green-500/15 text-green-400 border-green-500/30',
};

const BADGE_LABELS = {
  winner: 'Ganador del Pick\u2019em',
  prized: 'Premiado',
  subscriber: 'Beneficio de sub',
  tiebreaker: 'Ganador de desempate',
};

export function Badge({ type }: { type: keyof typeof BADGE_STYLES }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight ${BADGE_STYLES[type] || BADGE_STYLES.prized}`}
    >
      {BADGE_LABELS[type] || type}
    </span>
  );
}
