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
  allAwards?: Array<{ profileId: string; prizeLabel: string; amount: number | null; currency: string | null }>;
  prizeAwards?: Array<{
    prize_id: string;
    prize_label: string;
    prize_amount: number | null;
    prize_currency: string | null;
    prize_category: string | null;
    profile_id: string | null;
    display_name: string | null;
    award_status: string;
    rank_achieved: number | null;
  }>;
}

export function ParticipantRankingTab({
  leaderboard,
  myProfileId,
  tiebreakerWinners,
  wonPrizeIds,
  prizes,
  isTiebreakerPending,
  allAwards,
  prizeAwards,
}: ParticipantRankingTabProps) {
  const tiebreakerSet = useMemo(() => new Set(tiebreakerWinners), [tiebreakerWinners]);
  const prizesByProfile = useMemo(() => {
    const map = new Map<string, string[]>();
    if (prizeAwards) {
      for (const a of prizeAwards) {
        if (a.award_status !== 'assigned' || !a.profile_id) continue;
        const list = map.get(a.profile_id) ?? [];
        const label = a.prize_amount != null
          ? `${a.prize_label} · ${a.prize_amount.toLocaleString('es-ES')} ${a.prize_currency ?? 'USD'}`
          : a.prize_label;
        list.push(label);
        map.set(a.profile_id, list);
      }
    }
    return map;
  }, [prizeAwards]);

  const entries: RankingEntry[] = useMemo(() => {
    return leaderboard.map((e) => {
      const isTiebreakerWinner = tiebreakerSet.has(e.profile_id);
      const wonLabels = prizesByProfile.get(e.profile_id) ?? [];
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
  }, [leaderboard, tiebreakerSet, prizesByProfile]);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">
          Clasificación
        </h2>
        {!isTiebreakerPending && (
          <p className="mt-0.5 text-xs text-text-muted">
            Posiciones definitivas después de desempates y asignación de premios.
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
