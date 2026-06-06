'use client';

import { useState, useCallback } from 'react';
import type { CompletedSummary } from '@/app/actions/results-data';
import type { TieGroup } from '@/app/actions/tiebreaker';
import { Podium } from './Podium';
import { PrizeAwardsSummary } from './PrizeAwardsSummary';
import { TiebreakerSummary } from './TiebreakerSummary';
import { PendingTiebreakerCard } from './PendingTiebreakerCard';
import { TiebreakerModal } from '@/components/pickem/TiebreakerModal';

interface EventSummaryTabProps {
  summary: CompletedSummary;
  eventId: string;
  tieGroups: TieGroup[];
  drawsMap: Record<string, number>;
  onRefresh: () => Promise<void>;
}

export function EventSummaryTab({
  summary,
  eventId,
  tieGroups,
  drawsMap,
  onRefresh,
}: EventSummaryTabProps) {
  const [modalGroup, setModalGroup] = useState<TieGroup | null>(null);

  const pendingGroups = tieGroups.filter(
    (g) => !g.participants.every((p) => p.profile_id in drawsMap),
  );
  const hasPending = pendingGroups.length > 0;
  const hasResolvedTies = tieGroups.length > 0 && !hasPending;

  const remainingAfterThis = modalGroup
    ? pendingGroups.filter((g) => g !== modalGroup).length
    : 0;

  const handleTiebreakerDone = useCallback(async () => {
    setModalGroup(null);
    await onRefresh();
  }, [onRefresh]);

  const handleModalClose = useCallback(() => {
    setModalGroup(null);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {hasPending && (
        <>
          {pendingGroups.map((group) => (
            <PendingTiebreakerCard
              key={group.score}
              group={group}
              onResolve={() => setModalGroup(group)}
            />
          ))}

          {/* Pending prizes placeholder */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-text-primary">Premios pendientes</h3>
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-sm text-text-muted">
                La asignaci&oacute;n se completar&aacute; despu&eacute;s de resolver el desempate.
              </p>
            </div>
          </section>
        </>
      )}

      {!hasPending && (
        <>
          <Podium entries={summary.podium} />

          <PrizeAwardsSummary
            awards={summary.prizeAwards}
            eventId={summary.eventId}
            hasLegacyPrizes={summary.hasLegacyPrizes}
            legacyMigrationStatus={summary.legacyMigrationStatus}
          />

          {hasResolvedTies && (
            <TiebreakerSummary summary={summary} />
          )}
        </>
      )}

      {modalGroup && (
        <TiebreakerModal
          group={modalGroup}
          eventId={eventId}
          onClose={handleModalClose}
          onDone={handleTiebreakerDone}
          remainingTiebreakerCount={remainingAfterThis}
        />
      )}
    </div>
  );
}
