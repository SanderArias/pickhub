import type { PrizeAwardEntry } from '@/activities/pickem/actions/results-data';

export function PrizeAwardCard({ award }: { award: PrizeAwardEntry }) {
  const isSubBonus = award.prize_category === 'subscriber_bonus';

  if (award.award_status === 'assigned' && award.profile_id && award.display_name) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="shrink-0">
            <p className="text-xs font-medium text-text-muted">{award.prize_label}</p>
          </div>
          <p className="truncate text-sm font-medium text-text-primary">
            {award.display_name}
          </p>
        </div>
        {award.prize_amount !== null && (
          <p className="shrink-0 text-xs font-medium text-text-secondary">
            {award.prize_amount.toLocaleString('es-ES')} {award.prize_currency ?? 'USD'}
          </p>
        )}
        {isSubBonus && (
          <span className="shrink-0 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            Sub
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-muted">{award.prize_label}</p>
      </div>
      {award.award_status === 'unassigned' && (
        <span className="shrink-0 text-xs text-text-muted">Sin asignar</span>
      )}
      {award.award_status === 'blocked_by_tiebreaker' && (
        <span className="shrink-0 text-xs text-warning italic">Pendiente de desempate</span>
      )}
      {award.award_status === 'review_required' && (
        <span className="shrink-0 text-xs text-danger">Requiere revisi&oacute;n</span>
      )}
    </div>
  );
}
