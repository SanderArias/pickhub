'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getLeaderboard } from '@/app/actions/leaderboard';
import { getTieGroups } from '@/app/actions/tiebreaker';
import { TiebreakerSection } from './TiebreakerSection';
import { LeaderboardSection } from './LeaderboardSection';
import type { TieGroup } from '@/app/actions/tiebreaker';
import type { LeaderboardEntry } from '@/app/actions/leaderboard';

interface CompletedSectionProps {
  eventId: string;
  initialLeaderboard: LeaderboardEntry[];
  initialTieGroups: TieGroup[];
  myProfileId?: string | null;
}

export function CompletedSection({
  eventId,
  initialLeaderboard,
  initialTieGroups,
  myProfileId,
}: CompletedSectionProps) {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [tieGroups, setTieGroups] = useState<TieGroup[]>(initialTieGroups);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [lb, tg] = await Promise.all([
      getLeaderboard(eventId),
      getTieGroups(eventId),
    ]);
    setLeaderboard(lb);
    setTieGroups(tg);
    setRefreshing(false);
  }, [eventId]);

  const handleTiebreakerDone = useCallback(async () => {
    await refresh();
    router.refresh();
  }, [refresh, router]);

  return (
    <div className="flex flex-col gap-8">
      {tieGroups.length > 0 && (
        <TiebreakerSection
          eventId={eventId}
          tieGroups={tieGroups}
          onTiebreakerDone={handleTiebreakerDone}
        />
      )}

      {leaderboard.length > 0 && (
        <div className="flex flex-col gap-3">
          {tieGroups.length > 0 && (
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Clasificación</h2>
              {refreshing && (
                <span className="text-xs text-text-muted">Actualizando...</span>
              )}
            </div>
          )}
          <LeaderboardSection entries={leaderboard} myProfileId={myProfileId} />
        </div>
      )}
    </div>
  );
}
