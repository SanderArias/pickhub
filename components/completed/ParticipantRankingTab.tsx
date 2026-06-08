'use client';

import { useMemo } from 'react';
import type { LeaderboardEntry } from '@/app/actions/leaderboard';
import type { Prize } from '@/app/actions/participant';
import type { RankingEntry } from '@/activities/pickem/actions/results-data';
import { RankingTable } from './RankingTable';

interface ParticipantRankingTabProps {
  leaderboard: LeaderboardEntry[];
  myProfileId?: string | null;
  tiebreakerWinners: string[];
  wonPrizeIds: Set<string>;
  prizes: Prize[];
  isTiebreakerPending?: boolean;
}

export function ParticipantRankingTab({
  leaderboard,
  myProfileId,
  tiebreakerWinners,
  wonPrizeIds,
  prizes,
  isTiebreakerPending,
}: ParticipantRankingTabProps) {
  const tiebreakerSet = useMemo(() => new Set(tiebreakerWinners), [tiebreakerWinners]);
  const prizeLabelById = useMemo(() => new Map(prizes.map((p) => [p.id, p.label])), [prizes]);

  const entries: RankingEntry[] = useMemo(() => {
    return leaderboard.map((e) => {
      const isTiebreakerWinner = tiebreakerSet.has(e.profile_id);
      const wonLabels: string[] = [];
      if (myProfileId && e.profile_id === myProfileId) {
        for (const pid of wonPrizeIds) {
          const label = prizeLabelById.get(pid);
          if (label) wonLabels.push(label);
        }
      }
      return {
        rank: e.rank,
        profile_id: e.profile_id,
        display_name: e.display_name,
        avatar_url: null,
        total_score: e.total_score,
        correct_answers: e.correct_answers,
        total_questions: e.total_questions,
        prizes: wonLabels,
        is_tiebreaker_winner: isTiebreakerWinner,
        is_verified_subscriber: false,
      };
    });
  }, [leaderboard, tiebreakerSet, myProfileId, wonPrizeIds, prizeLabelById]);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">
          {isTiebreakerPending ? 'Clasificaci&oacute;n' : 'Clasificaci&oacute;n final'}
        </h2>
        {!isTiebreakerPending && (
          <p className="mt-0.5 text-xs text-text-muted">
            Posiciones definitivas despu&eacute;s de desempates y asignaci&oacute;n de premios.
          </p>
        )}
      </div>
      <RankingTable
        entries={entries}
        isProvisional={!!isTiebreakerPending}
        hasPrizes={prizes.length > 0}
        currentProfileId={myProfileId}
      />
    </section>
  );
}
