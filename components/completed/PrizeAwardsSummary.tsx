import type { PrizeAwardEntry } from '@/activities/pickem/actions/results-data';
import { formatPrizeAmount } from '@/activities/pickem/prizes/format';

function PrizeMiniCard({ award }: { award: PrizeAwardEntry }) {
  const isSubBonus = award.prize_category === 'subscriber_bonus';
  const formattedAmount = formatPrizeAmount(award.prize_amount, award.prize_currency);
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 ${
      isSubBonus
        ? 'border-purple-primary/25 bg-purple-primary/[0.03]'
        : 'border-border bg-surface'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${isSubBonus ? 'text-purple-primary' : 'text-text-primary'}`}>
            {isSubBonus && '★ '}{award.prize_label}
          </p>
          {formattedAmount && (
            <p className="mt-0.5 text-xs text-text-muted">{formattedAmount}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {award.award_status === 'assigned' && award.display_name ? (
            <p className="text-xs font-medium text-text-primary truncate max-w-[140px]">
              Asignado a {award.display_name}
            </p>
          ) : award.award_status === 'assigned' ? (
            <p className="text-xs font-medium text-text-primary italic">Asignado</p>
          ) : award.award_status === 'unassigned_no_eligible_winner' ? (
            <p className="text-xs font-medium text-text-muted italic">Sin ganador elegible</p>
          ) : award.award_status === 'blocked_by_tiebreaker' ? (
            <p className="text-xs font-medium text-warning italic">En espera de desempate</p>
          ) : award.award_status === 'unassigned' ? (
            <p className="text-xs font-medium text-text-muted italic">Sin asignar</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PrizeAwardsSummary({
  awards,
  totalPrizeDefinitions,
}: {
  awards: PrizeAwardEntry[];
  totalPrizeDefinitions?: number;
}) {
  const hasConfigurations = (totalPrizeDefinitions ?? awards.length) > 0;
  if (!hasConfigurations) {
    return (
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-text-primary">Premios</h3>
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-sm text-text-muted">Este Pick&apos;em no tiene premios configurados.</p>
        </div>
      </section>
    );
  }

  const generalPrizes = awards.filter((a) => a.prize_category !== 'subscriber_bonus');
  const subscriberPrizes = awards.filter((a) => a.prize_category === 'subscriber_bonus');
  const hasGeneral = generalPrizes.length > 0;
  const hasSubscriber = subscriberPrizes.length > 0;

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">Premios</h3>

      {hasGeneral && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Premios de clasificación
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {generalPrizes.map((a) => (
              <PrizeMiniCard key={a.prize_id} award={a} />
            ))}
          </div>
        </div>
      )}

      {hasSubscriber && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Beneficios exclusivos para subs
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {subscriberPrizes.map((a) => (
              <PrizeMiniCard key={a.prize_id} award={a} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
