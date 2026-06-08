import { EVENT_STATUS_CONFIG } from '@/lib/status-config';
import type { PublicEventData } from '@/app/actions/participant';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PickemParticipationHero({
  event,
  hasTop8,
}: {
  event: PublicEventData;
  hasTop8: boolean;
}) {
  const config = EVENT_STATUS_CONFIG[event.status as keyof typeof EVENT_STATUS_CONFIG] ?? EVENT_STATUS_CONFIG.draft;
  const hasLogo = !!event.logo_url;
  const creator = event.creator;
  const creatorInitial = (creator?.display_name ?? creator?.handle ?? '?')[0].toUpperCase();

  return (
    <section className="flex flex-col sm:flex-row gap-4 sm:gap-6">
      {/* Left content */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${config.dot}`} />
          <span className={`text-xs font-medium ${
            event.status === 'completed'
              ? 'text-success'
              : event.status === 'predictions_closed' || event.status === 'tiebreaker_pending'
                ? 'text-warning'
                : 'text-purple-primary'
          }`}>
            {config.title}
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {event.title}
        </h1>

        {creator && (
          <div className="flex items-center gap-2">
            {creator.avatar_url ? (
              <img
                src={creator.avatar_url}
                alt=""
                className="size-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-6 items-center justify-center rounded-full bg-purple-primary/20 text-[11px] font-bold text-purple-primary">
                {creatorInitial}
              </div>
            )}
            <span className="text-sm text-text-secondary">
              Organizado por {creator.display_name ?? creator.handle}
            </span>
          </div>
        )}

        <p className="text-sm text-text-secondary mt-1">
          {hasTop8 ? 'Predice el Top 8' : 'Completa tus predicciones'}
        </p>

        <p className="text-xs text-text-muted">
          {event.ends_at
            ? `Cierra el ${formatDate(event.ends_at)}`
            : 'Cierre manual por el creador'
          }
        </p>
      </div>

      {/* Event logo */}
      {hasLogo && (
        <div className="flex h-[96px] w-[112px] shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface-hover/50 p-[10px]">
          <img
            src={event.logo_url!}
            alt={`Logo de ${event.title}`}
            className="h-full w-full object-contain"
          />
        </div>
      )}
    </section>
  );
}
