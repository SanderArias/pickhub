'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CompletedSummary, OfficialResultEntry } from '@/app/actions/results-data';
import type { TieGroup } from '@/app/actions/tiebreaker';
import { getCompletedSummary, getOfficialResults } from '@/app/actions/results-data';
import { getTieGroups, getTiebreakerDraws } from '@/app/actions/tiebreaker';
import { CompletedResultsTabs } from './CompletedResultsTabs';
import type { TabId } from './CompletedResultsTabs';
import { EventSummaryTab } from './EventSummaryTab';
import { FinalRankingTab } from './FinalRankingTab';
import { OfficialResultsTab } from './OfficialResultsTab';

function isTabId(v: string | null): v is TabId {
  return v !== null && (v === 'summary' || v === 'ranking' || v === 'official-results');
}

interface CompletedResultsClientProps {
  eventId: string;
  initialTab?: string;
  tieGroups: TieGroup[];
  drawsMap: Record<string, number>;
  hasPrizes?: boolean;
}

export function CompletedResultsClient({
  eventId,
  initialTab = 'summary',
  tieGroups: initialTieGroups,
  drawsMap: initialDrawsMap,
  hasPrizes: hasEventPrizes,
}: CompletedResultsClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>(
    isTabId(initialTab) ? initialTab : 'summary',
  );

  const [summary, setSummary] = useState<CompletedSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [officialResults, setOfficialResults] = useState<OfficialResultEntry[] | null>(null);
  const [officialResultsLoading, setOfficialResultsLoading] = useState(false);
  const [tieGroups, setTieGroups] = useState<TieGroup[]>(initialTieGroups);
  const [drawsMap, setDrawsMap] = useState<Record<string, number>>(initialDrawsMap);
  const loadedTabs = useRef(new Set<TabId>());

  const loadSummary = useCallback(async (force = false) => {
    if (loadedTabs.current.has('summary') && !force) return;
    loadedTabs.current.add('summary');
    setSummaryLoading(true);
    try {
      const data = await getCompletedSummary(eventId);
      setSummary(data);
    } finally {
      setSummaryLoading(false);
    }
  }, [eventId]);

  const refreshSummary = useCallback(async () => {
    loadedTabs.current.delete('summary');
    const [data, tg, draws] = await Promise.all([
      getCompletedSummary(eventId),
      getTieGroups(eventId),
      getTiebreakerDraws(eventId),
    ]);
    setSummary(data);
    setTieGroups(tg);
    setDrawsMap(draws as Record<string, number>);
    loadedTabs.current.add('summary');
  }, [eventId]);

  const loadOfficialResults = useCallback(async () => {
    if (loadedTabs.current.has('official-results')) return;
    loadedTabs.current.add('official-results');
    setOfficialResultsLoading(true);
    try {
      const data = await getOfficialResults(eventId);
      setOfficialResults(data);
    } finally {
      setOfficialResultsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (activeTab === 'summary') loadSummary();
    if (activeTab === 'official-results') loadOfficialResults();
  }, [activeTab, loadSummary, loadOfficialResults]);

  const updateTabInUrl = useCallback((tab: TabId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({ tab }, '', url.toString());
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const tab = e.state?.tab as TabId | undefined;
      if (isTabId(tab ?? null)) {
        setActiveTab(tab!);
      } else {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get('tab');
        if (isTabId(urlTab)) setActiveTab(urlTab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function handleTabChange(tabId: TabId) {
    setActiveTab(tabId);
    updateTabInUrl(tabId);
  }

  const pendingTiebreakerCount = tieGroups.filter(
    (g) => !g.participants.every((p) => p.profile_id in drawsMap),
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <CompletedResultsTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab panels — always mounted, hidden preserves DOM state */}
      <style>{`
        @keyframes panelFadeIn {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="relative [&_section:not([hidden])]:motion-safe:animate-[panelFadeIn_120ms_ease-out]">
        <section
          role="tabpanel"
          id="panel-summary"
          aria-labelledby="tab-summary"
          hidden={activeTab !== 'summary'}
        >
          {summaryLoading && !summary && <SummarySkeleton />}
          {summary && (
            <EventSummaryTab
              summary={summary}
              eventId={eventId}
              tieGroups={tieGroups}
              drawsMap={drawsMap}
              onRefresh={refreshSummary}
            />
          )}
        </section>

        <section
          role="tabpanel"
          id="panel-ranking"
          aria-labelledby="tab-ranking"
          hidden={activeTab !== 'ranking'}
        >
          <FinalRankingTab
            eventId={eventId}
            hasPendingTiebreakers={pendingTiebreakerCount > 0}
            hasPrizes={hasEventPrizes}
          />
        </section>

        <section
          role="tabpanel"
          id="panel-official-results"
          aria-labelledby="tab-official-results"
          hidden={activeTab !== 'official-results'}
        >
          {officialResultsLoading && !officialResults && <OfficialResultsSkeleton />}
          {officialResults !== null && (
            <OfficialResultsTab results={officialResults} />
          )}
        </section>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-6 motion-safe:animate-pulse" aria-label="Cargando resumen">
      <div className="flex items-end justify-center gap-4">
        <div className="h-24 w-24 rounded-lg bg-surface-hover" />
        <div className="h-32 w-24 rounded-lg bg-surface-hover" />
        <div className="h-20 w-24 rounded-lg bg-surface-hover" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-24 rounded bg-surface-hover" />
        <div className="h-20 rounded-lg bg-surface-hover" />
      </div>
    </div>
  );
}

function OfficialResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4 motion-safe:animate-pulse" aria-label="Cargando resultados oficiales">
      <div className="h-4 w-36 rounded bg-surface-hover" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-surface-hover" />
        ))}
      </div>
    </div>
  );
}
