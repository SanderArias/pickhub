'use client';

import { useState, useCallback, useEffect } from 'react';
import type { CompletedSummary } from '@/activities/pickem/actions/results-data';
import { diagnosePrizeAssignment } from '@/activities/pickem/actions/results-data';
import { Podium } from './Podium';
import { PrizeAwardsSummary } from './PrizeAwardsSummary';
import { TiebreakerSummary } from './TiebreakerSummary';
import { PendingTiebreakerCard } from './PendingTiebreakerCard';
import { TiebreakerModal } from '@/components/pickem/TiebreakerModal';

interface EventSummaryTabProps {
  summary: CompletedSummary;
  eventId: string;
  onRefresh: () => Promise<void>;
}

export function EventSummaryTab({
  summary,
  eventId,
  onRefresh,
}: EventSummaryTabProps) {
  const [modalGroup, setModalGroup] = useState<(typeof summary.pendingManualTiebreakers)[number] | null>(null);

  const pendingGroups = summary.pendingManualTiebreakers;
  const hasPending = pendingGroups.length > 0;
  const hasResolvedTies = summary.eventStatus === 'completed' && summary.tiebreakerGroups.length > 0 && !hasPending;

  const remainingAfterThis = modalGroup
    ? pendingGroups.filter((g) => g !== modalGroup).length
    : 0;

  const handleTiebreakerDone = useCallback(async () => {
    // Modal stays visible with "finalizing" state — refresh first, then close
    await onRefresh();
    setModalGroup(null);
  }, [onRefresh]);

  const handleModalClose = useCallback(() => {
    setModalGroup(null);
  }, []);

  // Diagnostic log: only when all prizes are unassigned with no pending ties
  useEffect(() => {
    if (!hasPending && summary.prizeAwards.length > 0 && !summary.prizeAwards.some((a) => a.award_status === 'assigned')) {
      diagnosePrizeAssignment(eventId).then((data) => {
        console.log('[diag/assignment]', JSON.parse(JSON.stringify(data)));
      });
    }
  }, [eventId, summary.prizeAwards, hasPending]);

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
        </>
      )}

      <Podium entries={summary.podium} />

      <PrizeAwardsSummary awards={summary.prizeAwards} totalPrizeDefinitions={summary.totalPrizeDefinitions} />

      {hasResolvedTies && (
        <TiebreakerSummary summary={summary} />
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
