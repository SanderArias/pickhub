'use client';

import { useState, useCallback } from 'react';
import { PickemStatusCard } from './PickemStatusCard';
import { CompletedResultsClient } from '@/components/completed/CompletedResultsClient';

interface CreatorPickemClientSectionProps {
  eventId: string;
  status: 'open' | 'predictions_closed' | 'tiebreaker_pending' | 'completed';
  submissionCount: number;
  endsAt: string | null;
  initialPendingTiebreakerCount: number;
  initialTab: string;
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
  hasPrizes,
  canManage = true,
}: CreatorPickemClientSectionProps) {
  const [pendingTiebreakerCount, setPendingTiebreakerCount] = useState(initialPendingTiebreakerCount);

  const handleTiebreakerChange = useCallback((count: number) => {
    setPendingTiebreakerCount(count);
  }, []);

  const resultsReady = status === 'completed' || status === 'tiebreaker_pending';
  const hasPending = pendingTiebreakerCount > 0;

  return (
    <>
      <PickemStatusCard
        eventId={eventId}
        status={status}
        submissionCount={submissionCount}
        closeDate={endsAt}
        pendingTiebreakerCount={pendingTiebreakerCount}
        compact={resultsReady && !hasPending}
        hasPrizes={hasPrizes}
        canManage={canManage}
      />

      {resultsReady && (
        <CompletedResultsClient
          eventId={eventId}
          initialTab={initialTab}
          hasPrizes={hasPrizes}
          onTiebreakerStatusChange={handleTiebreakerChange}
        />
      )}
    </>
  );
}
