'use client';

import { useState } from 'react';
import { ResultsTabs } from './ResultsTabs';
import { ParticipantSummaryTab } from './ParticipantSummaryTab';
import { ParticipantMyPicksTab, type EnrichedPick } from './ParticipantMyPicksTab';
import { ParticipantRankingTab } from './ParticipantRankingTab';
import { OfficialResultsTab } from './OfficialResultsTab';
import type { LeaderboardEntry } from '@/app/actions/leaderboard';
import type { Prize } from '@/app/actions/participant';
import type { OfficialResultEntry } from '@/app/actions/results-data';

const TABS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'my-picks', label: 'Mi selección' },
  { id: 'ranking', label: 'Clasificación final' },
  { id: 'official-results', label: 'Resultados oficiales' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface ParticipantResultsViewProps {
  myEntry: { rank: number; display_name: string | null } | null;
  myScore: { total_score: number | null; correct_answers: number; total_questions: number } | null;
  isTiebreakerWinner: boolean;
  isTiebreakerLoser: boolean;
  hasResolvedTies: boolean;
  wonPrizeIds: string[];
  prizes: Prize[];
  leaderboard: LeaderboardEntry[];
  myProfileId?: string;
  tiebreakerWinners: string[];
  enrichedPicks: EnrichedPick[];
  officialResults: OfficialResultEntry[];
}

export function ParticipantResultsView({
  myEntry,
  myScore,
  isTiebreakerWinner,
  isTiebreakerLoser,
  hasResolvedTies,
  wonPrizeIds,
  prizes,
  leaderboard,
  myProfileId,
  tiebreakerWinners,
  enrichedPicks,
  officialResults,
}: ParticipantResultsViewProps) {
  const wonSet = new Set(wonPrizeIds);

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (TABS.some((t) => t.id === tab)) return tab as TabId;
    }
    return 'summary';
  });

  function handleTabChange(tab: string) {
    const tid = tab as TabId;
    setActiveTab(tid);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({ tab: tid }, '', url.toString());
  }

  return (
    <div className="flex flex-col gap-4">
      <ResultsTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <section hidden={activeTab !== 'summary'} role="tabpanel" id="panel-summary" aria-labelledby="tab-summary">
        <ParticipantSummaryTab
          myEntry={myEntry}
          myScore={myScore}
          isTiebreakerWinner={isTiebreakerWinner}
          isTiebreakerLoser={isTiebreakerLoser}
          hasResolvedTies={hasResolvedTies}
          wonPrizeIds={wonSet}
          prizes={prizes}
          leaderboard={leaderboard}
          myProfileId={myProfileId}
        />
      </section>

      <section hidden={activeTab !== 'my-picks'} role="tabpanel" id="panel-my-picks" aria-labelledby="tab-my-picks">
        <ParticipantMyPicksTab picks={enrichedPicks} />
      </section>

      <section hidden={activeTab !== 'ranking'} role="tabpanel" id="panel-ranking" aria-labelledby="tab-ranking">
        <ParticipantRankingTab
          leaderboard={leaderboard}
          myProfileId={myProfileId}
          tiebreakerWinners={tiebreakerWinners}
          wonPrizeIds={wonSet}
          prizes={prizes}
        />
      </section>

      <section hidden={activeTab !== 'official-results'} role="tabpanel" id="panel-official-results" aria-labelledby="tab-official-results">
        <OfficialResultsTab results={officialResults} />
      </section>
    </div>
  );
}
