'use client';

import { useState, useCallback, useEffect } from 'react';
import type { CompletedSummary } from '@/activities/pickem/actions/results-data';
import { diagnosePrizeAssignment } from '@/activities/pickem/actions/results-data';
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

  useEffect(() => {
    if (summary.prizeAwards.length > 0 && !summary.prizeAwards.some((a) => a.award_status === 'assigned')) {
      diagnosePrizeAssignment(eventId).then((data) => {
        console.log('[diag/assignment]', JSON.parse(JSON.stringify(data)));
      });
    }
  }, [eventId, summary.prizeAwards]);

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

      <PrizeAwardsSummary awards={summary.prizeAwards} />

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
