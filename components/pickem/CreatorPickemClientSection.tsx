'use client';

import { useState, useCallback } from 'react';
import type { TieGroup } from '@/app/actions/tiebreaker';
import { PickemStatusCard } from './PickemStatusCard';
import { CompletedResultsClient } from '@/components/completed/CompletedResultsClient';

interface CreatorPickemClientSectionProps {
  eventId: string;
  status: 'open' | 'predictions_closed' | 'completed';
  submissionCount: number;
  endsAt: string | null;
  initialPendingTiebreakerCount: number;
  initialTab: string;
  tieGroups: TieGroup[];
  drawsMap: Record<string, number>;
  hasPrizes: boolean;
  canManage?: boolean;
}

export function CreatorPickemClientSection({
  eventId,
  status,
  submissionCount,
  endsAt,
  initialPendingTiebreakerCount,
  initialTab,
  tieGroups,
  drawsMap,
  hasPrizes,
  canManage = true,
}: CreatorPickemClientSectionProps) {
  const [pendingTiebreakerCount, setPendingTiebreakerCount] = useState(initialPendingTiebreakerCount);

  const handleTiebreakerChange = useCallback((count: number) => {
    setPendingTiebreakerCount(count);
  }, []);

  const isCompleted = status === 'completed';
  const hasPending = pendingTiebreakerCount > 0;

  return (
    <>
      <PickemStatusCard
        eventId={eventId}
        status={status}
        submissionCount={submissionCount}
        closeDate={endsAt}
        pendingTiebreakerCount={pendingTiebreakerCount}
        compact={isCompleted && !hasPending}
        hasPrizes={hasPrizes}
        canManage={canManage}
      />

      {isCompleted && (
        <CompletedResultsClient
          eventId={eventId}
          initialTab={initialTab}
          tieGroups={tieGroups}
          drawsMap={drawsMap}
          hasPrizes={hasPrizes}
          onTiebreakerStatusChange={handleTiebreakerChange}
        />
      )}
    </>
  );
}
