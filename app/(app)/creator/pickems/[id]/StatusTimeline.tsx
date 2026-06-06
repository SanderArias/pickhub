'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { closePredictions } from '@/app/actions/creator';

const STATUS_ORDER = ['open', 'predictions_closed', 'completed'] as const;
const LABELS: Record<string, string> = {
  open: 'Abierto',
  predictions_closed: 'Cerrado',
  completed: 'Completado',
};
const DOT_COLORS: Record<string, string> = {
  open: 'bg-purple-primary',
  predictions_closed: 'bg-warning',
  completed: 'bg-success',
};
const LINE_COLORS: Record<string, string> = {
  open: 'bg-purple-primary',
  predictions_closed: 'bg-warning',
  completed: 'bg-success',
};
const TEXT_COLORS: Record<string, string> = {
  open: 'text-purple-primary',
  predictions_closed: 'text-warning',
  completed: 'text-success',
};

export function StatusTimeline({
  eventId,
  status,
}: {
  eventId: string;
  status: string;
}) {
  const router = useRouter();

  const currentStepIdx = STATUS_ORDER.indexOf(status as any);
  const hasAction = status === 'open' || status === 'predictions_closed';

  async function handleClose() {
    await closePredictions(eventId);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold text-text-primary">Estado del Pick'em</h2>
        {hasAction && (
          status === 'open' ? (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-purple-primary px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-purple-600"
            >
              Cerrar predicciones
            </button>
          ) : (
            <Link
              href={`/creator/pickems/${eventId}/results`}
              className="rounded-lg bg-purple-primary px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-purple-600"
            >
              Registrar resultados
            </Link>
          )
        )}
      </div>

      <div className="mt-2 flex items-center">
        {STATUS_ORDER.map((step, i) => {
          const isPast = i < currentStepIdx;
          const isCurrent = i === currentStepIdx;
          const isFuture = i > currentStepIdx;

          return (
            <div key={step} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div className={`size-3 rounded-full transition-colors ${
                  isFuture ? 'border border-border' : DOT_COLORS[step]
                }`} />
                <span className={`text-[11px] leading-none transition-colors ${
                  isCurrent
                    ? `${TEXT_COLORS[step]} font-semibold`
                    : isPast
                      ? `${TEXT_COLORS[step]}/60 font-medium`
                      : 'text-text-muted font-medium'
                }`}>
                  {LABELS[step]}
                </span>
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div className={`mx-2 h-px w-6 sm:w-10 rounded-full transition-colors ${
                  i < currentStepIdx ? LINE_COLORS[step] : 'bg-border'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
