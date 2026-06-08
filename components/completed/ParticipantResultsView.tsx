'use client';

import { useState, useMemo, useEffect } from 'react';
import { ResultsTabs } from './ResultsTabs';
import { ParticipantSummaryTab } from './ParticipantSummaryTab';
import { ParticipantMyPicksTab, type EnrichedPick } from './ParticipantMyPicksTab';
import { ParticipantRankingTab } from './ParticipantRankingTab';
import { OfficialResultsTab } from './OfficialResultsTab';
import type { LeaderboardEntry } from '@/app/actions/leaderboard';
import type { Prize } from '@/app/actions/participant';
import type { OfficialResultEntry } from '@/activities/pickem/actions/results-data';

interface TabDef {
  id: string;
  label: string;
  visible: boolean;
}

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
  isTiebreakerPending?: boolean;
  prizeStatuses?: Array<{ definitionId: string; status: string; label: string; amount: number | null; currency: string | null; category: string; winnerName?: string | null }>;
  resultStatus?: string | null;
  sharedRank?: number | null;
  showRanking?: boolean;
  showOfficialResults?: boolean;
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
  isTiebreakerPending,
  prizeStatuses,
  resultStatus,
  sharedRank,
  showRanking = false,
  showOfficialResults = false,
  allAwards,
  prizeAwards,
}: ParticipantResultsViewProps) {
  const wonSet = new Set(wonPrizeIds);

  const tabs: TabDef[] = useMemo(() => [
    { id: 'summary', label: 'Resumen', visible: true },
    { id: 'my-picks', label: 'Mi selección', visible: true },
    { id: 'ranking', label: 'Clasificación', visible: showRanking },
    { id: 'official-results', label: 'Resultados oficiales', visible: showOfficialResults },
  ], [showRanking, showOfficialResults]);

  const visibleTabs = useMemo(() => tabs.filter((t) => t.visible), [tabs]);
  const visibleIds = useMemo(() => new Set(visibleTabs.map((t) => t.id)), [visibleTabs]);

  const [activeTab, setActiveTab] = useState<string>('summary');

  // Initialize active tab from URL on mount, defaulting to summary if invalid
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab && visibleIds.has(tab)) {
        setActiveTab(tab);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'summary');
        window.history.replaceState({ tab: 'summary' }, '', url.toString());
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Normalize active tab to summary if it becomes hidden
  useEffect(() => {
    if (!visibleIds.has(activeTab)) {
      setActiveTab('summary');
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'summary');
      window.history.replaceState({ tab: 'summary' }, '', url.toString());
    }
  }, [activeTab, visibleIds]);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({ tab }, '', url.toString());
  }

  return (
    <div className="flex flex-col gap-4">
      {visibleTabs.length > 1 && (
        <ResultsTabs
          tabs={visibleTabs.map(({ id, label }) => ({ id, label }))}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}

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
          isTiebreakerPending={isTiebreakerPending}
          prizeStatuses={prizeStatuses}
          resultStatus={resultStatus}
          sharedRank={sharedRank}
          prizeAwards={prizeAwards}
        />
      </section>

      <section hidden={activeTab !== 'my-picks'} role="tabpanel" id="panel-my-picks" aria-labelledby="tab-my-picks">
        <ParticipantMyPicksTab picks={enrichedPicks} />
      </section>

      {showRanking && (
        <section hidden={activeTab !== 'ranking'} role="tabpanel" id="panel-ranking" aria-labelledby="tab-ranking">
          <ParticipantRankingTab
            leaderboard={leaderboard}
            myProfileId={myProfileId}
            tiebreakerWinners={tiebreakerWinners}
            wonPrizeIds={wonSet}
            prizes={prizes}
            isTiebreakerPending={isTiebreakerPending}
            allAwards={allAwards}
            prizeAwards={prizeAwards}
          />
        </section>
      )}

      {showOfficialResults && (
        <section hidden={activeTab !== 'official-results'} role="tabpanel" id="panel-official-results" aria-labelledby="tab-official-results">
          <OfficialResultsTab results={officialResults} />
        </section>
      )}
    </div>
  );
}
