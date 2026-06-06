import type { CompletedSummary } from '@/app/actions/results-data';
import { Podium } from './Podium';
import { PrizeAwardsSummary } from './PrizeAwardsSummary';
import { TiebreakerSummary } from './TiebreakerSummary';

export function EventSummaryTab({ summary }: { summary: CompletedSummary }) {
  return (
    <div className="flex flex-col gap-6">
      <Podium entries={summary.podium} />

      <PrizeAwardsSummary
        awards={summary.prizeAwards}
        eventId={summary.eventId}
        hasLegacyPrizes={summary.hasLegacyPrizes}
        legacyMigrationStatus={summary.legacyMigrationStatus}
      />

      <TiebreakerSummary summary={summary} />
    </div>
  );
}
