'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { CompletedSummary, OfficialResultEntry } from '@/app/actions/results-data';
import { EventSummaryTab } from './EventSummaryTab';
import { FinalRankingTab } from './FinalRankingTab';
import { OfficialResultsTab } from './OfficialResultsTab';

const TABS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'ranking', label: 'Clasificaci\u00f3n' },
  { id: 'official-results', label: 'Resultados oficiales' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface CompletedResultsClientProps {
  eventId: string;
  initialSummary: CompletedSummary;
  initialOfficialResults: OfficialResultEntry[];
  initialTab?: string;
}

export function CompletedResultsClient({
  eventId,
  initialSummary,
  initialOfficialResults,
  initialTab = 'summary',
}: CompletedResultsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab: TabId =
    (searchParams.get('tab') as TabId) ?? initialTab as TabId;

  function handleTabChange(tabId: TabId) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', tabId);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Linear-style tabs */}
      <div
        className="flex gap-1 overflow-x-auto rounded-lg bg-surface-hover p-0.5"
        role="tablist"
        aria-label="Secciones de resultados"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.id)}
              className={`shrink-0 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg ${
                isActive
                  ? 'bg-surface text-purple-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      {activeTab === 'summary' && (
        <div role="tabpanel">
          <EventSummaryTab summary={initialSummary} />
        </div>
      )}

      {activeTab === 'ranking' && (
        <div role="tabpanel">
          <FinalRankingTab eventId={eventId} />
        </div>
      )}

      {activeTab === 'official-results' && (
        <div role="tabpanel">
          <OfficialResultsTab results={initialOfficialResults} />
        </div>
      )}
    </div>
  );
}
