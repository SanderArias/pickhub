import Link from 'next/link';

export interface ActivityItem {
  display_name: string | null;
  event_title: string;
  event_slug: string;
  submitted_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

export function RecentActivitySection({
  activities,
}: {
  activities: ActivityItem[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-primary">Actividad reciente</h2>
        <Link
          href="/creator/activity"
          className="flex items-center gap-1 text-xs text-purple-primary transition-colors hover:text-purple-hover"
        >
          Ver todo
          <svg className="size-3" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-5 py-6 text-center">
          <p className="text-sm text-text-muted">
            A&uacute;n no hay participaciones recientes.
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Invita a tu comunidad a participar en tus Pick&rsquo;ems.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {activities.map((a, i) => (
            <Link
              key={i}
              href={`/pickems/${a.event_slug}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-hover"
            >
              <p className="min-w-0 truncate text-sm text-text-primary">
                <span className="font-semibold">{a.display_name ?? 'Un participante'}</span>
                <span className="text-text-muted"> participó en </span>
                {a.event_title ? (
                  <span className="font-semibold">{a.event_title}</span>
                ) : (
                  <span className="text-text-muted">un Pick&rsquo;em</span>
                )}
              </p>
              <span className="shrink-0 text-xs text-text-muted">{timeAgo(a.submitted_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
