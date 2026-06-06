'use client';

import { useState, useCallback } from 'react';

interface ActivityEntry {
  type: 'submission';
  actorName: string | null;
  eventTitle: string;
  eventSlug: string;
  timestamp: string;
  isNew: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ActivityFeed({ activities }: { activities: ActivityEntry[] }) {
  const [highlightedIndices, setHighlightedIndices] = useState<Set<number>>(() => {
    return new Set(activities.map((a, i) => (a.isNew ? i : -1)).filter((i) => i >= 0));
  });

  const removeHighlight = useCallback((index: number) => {
    setHighlightedIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
        <p className="text-sm text-text-muted">No hay actividad registrada todavía.</p>
        <p className="mt-1 text-xs text-text-secondary">
          Cuando tu comunidad participe en tus Pick'ems, aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {activities.map((entry, i) => {
        const isHighlighted = highlightedIndices.has(i);
        return (
          <a
            key={`${entry.eventSlug}-${entry.timestamp}-${i}`}
            href={`/pickems/${entry.eventSlug}`}
            onMouseEnter={() => removeHighlight(i)}
            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors ${
              isHighlighted
                ? 'border-purple-500/60 bg-purple-500/[0.04] hover:border-border hover:bg-surface'
                : 'border-border bg-surface hover:bg-surface-hover'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm text-text-primary truncate">
                <span className="font-medium">{entry.actorName ?? 'Alguien'}</span>
                <span className="text-text-muted"> participó en </span>
                <span className="font-medium">{entry.eventTitle}</span>
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-[11px] text-text-muted">
                Participación
              </span>
              <span className="text-xs text-text-muted">{timeAgo(entry.timestamp)}</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
