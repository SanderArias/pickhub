'use client';

import { ResultsTabs } from './ResultsTabs';

const TABS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'ranking', label: 'Clasificación' },
  { id: 'official-results', label: 'Resultados oficiales' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

interface CompletedResultsTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function CompletedResultsTabs({ activeTab, onTabChange }: CompletedResultsTabsProps) {
  return (
    <ResultsTabs
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as TabId)}
    />
  );
}
