'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Participation } from '@/app/actions/participant';
import { ExpandableDescription } from '@/components/pickem/ExpandableDescription';

function FilterTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-purple-surface text-purple-primary'
          : 'text-text-muted hover:text-text-primary'
      }`}
    >
      {label} ({count})
    </button>
  );
}

export function ParticipacionesClient({
  open,
  closed,
}: {
  open: Participation[];
  closed: Participation[];
}) {
  const [filter, setFilter] = useState<'open' | 'closed'>('open');

  const list = filter === 'open' ? open : closed;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1">
        <FilterTab
          active={filter === 'open'}
          label="Abiertos"
          count={open.length}
          onClick={() => setFilter('open')}
        />
        <FilterTab
          active={filter === 'closed'}
          label="Cerrados"
          count={closed.length}
          onClick={() => setFilter('closed')}
        />
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">
            {filter === 'open'
              ? 'No tienes participaciones abiertas.'
              : 'No tienes participaciones cerradas.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((p) => (
            <Link
              key={p.submissionId}
              href={`/pickems/${p.eventSlug}`}
              className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{p.eventTitle}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {p.creatorDisplayName ?? p.creatorHandle ?? '—'}
                    {p.submittedAt ? ` · ${new Date(p.submittedAt).toLocaleDateString()}` : ''}
                  </p>
                  {p.eventDescription && (
                    <ExpandableDescription
                      description={p.eventDescription}
                      collapsedLines={2}
                      className="mt-1"
                    />
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-text-muted">
                  <p>{p.answersCount} respuesta{p.answersCount !== 1 ? 's' : ''}</p>
                  <p className="mt-0.5 text-purple-primary">Ver mi Pick’em</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
