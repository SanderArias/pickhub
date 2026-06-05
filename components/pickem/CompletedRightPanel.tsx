'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getLeaderboard } from '@/app/actions/leaderboard';
import { getTieGroups, getTiebreakerDraws } from '@/app/actions/tiebreaker';
import { TiebreakerSection } from './TiebreakerSection';
import { LeaderboardSection } from './LeaderboardSection';
import type { TieGroup } from '@/app/actions/tiebreaker';
import type { LeaderboardEntry } from '@/app/actions/leaderboard';

interface CompletedRightPanelProps {
  eventId: string;
  initialLeaderboard: LeaderboardEntry[];
  initialTieGroups: TieGroup[];
  initialDrawsMap: Record<string, number>;
  myProfileId?: string | null;
}

export function CompletedRightPanel({
  eventId,
  initialLeaderboard,
  initialTieGroups,
  initialDrawsMap,
  myProfileId,
}: CompletedRightPanelProps) {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [tieGroups, setTieGroups] = useState<TieGroup[]>(initialTieGroups);
  const [drawsMap, setDrawsMap] = useState<Record<string, number>>(initialDrawsMap);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [lb, tg, draws] = await Promise.all([
      getLeaderboard(eventId),
      getTieGroups(eventId),
      getTiebreakerDraws(eventId),
    ]);
    setLeaderboard(lb);
    setTieGroups(tg);
    setDrawsMap(draws as Record<string, number>);
    setRefreshing(false);
  }, [eventId]);

  const handleTiebreakerDone = useCallback(async () => {
    await refresh();
    router.refresh();
  }, [refresh, router]);

  const tiebreakerWinners = Object.entries(drawsMap)
    .filter(([, order]) => order === 1)
    .map(([pid]) => pid);

  return (
    <div className="flex flex-col gap-6">
      <TiebreakerSection
        eventId={eventId}
        tieGroups={tieGroups}
        drawsMap={drawsMap}
        onTiebreakerDone={handleTiebreakerDone}
      />

      {leaderboard.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Clasificación</h2>
            {refreshing && (
              <span className="text-xs text-text-muted">Actualizando...</span>
            )}
          </div>
          <LeaderboardSection entries={leaderboard} myProfileId={myProfileId} tiebreakerWinners={tiebreakerWinners} />
        </div>
      )}
    </div>
  );
}
