'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

export interface TabDef {
  id: string;
  label: string;
}

interface ResultsTabsProps {
  tabs: readonly TabDef[] | TabDef[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ResultsTabs({ tabs, activeTab, onTabChange }: ResultsTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const tabIds = tabs.map((t) => t.id);

  const measure = useCallback(() => {
    const btn = tabRefs.current[activeTab];
    if (!btn) return;
    setIndicator({
      left: btn.offsetLeft,
      width: btn.offsetWidth,
    });
  }, [activeTab]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="w-full border-b border-border/50">
      <div
        ref={containerRef}
        className="relative inline-flex w-fit"
        role="tablist"
        aria-label="Secciones de resultados"
      >
        <span
          aria-hidden="true"
          className="absolute bottom-0 h-0.5 rounded-full bg-purple-primary motion-reduce:transition-none"
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
            transition:
              'transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1), width 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        />

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => { tabRefs.current[tab.id] = node; }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => {
                const idx = tabIds.indexOf(activeTab);
                let nextIdx: number | null = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (idx + 1) % tabs.length;
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (idx - 1 + tabs.length) % tabs.length;
                if (e.key === 'Home') nextIdx = 0;
                if (e.key === 'End') nextIdx = tabs.length - 1;
                if (nextIdx !== null) {
                  e.preventDefault();
                  onTabChange(tabs[nextIdx].id);
                  tabRefs.current[tabs[nextIdx].id]?.focus();
                }
              }}
              className={`relative shrink-0 rounded-t-md px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary/40 focus-visible:ring-inset ${
                isActive
                  ? 'bg-purple-primary/[0.06] text-purple-primary font-semibold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
