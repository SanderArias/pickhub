'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { closePredictions } from '@/app/actions/creator';
import { ConfirmActionModal } from './ConfirmActionModal';
import { EVENT_STATUS_CONFIG } from '@/lib/status-config';

interface PickemStatusCardProps {
  eventId: string;
  status: 'open' | 'predictions_closed' | 'completed';
  submissionCount: number;
  closeDate?: string | null;
  pendingTiebreakerCount?: number;
  compact?: boolean;
}

type VisualState = 'open' | 'predictions_closed' | 'tiebreakers_pending' | 'completed';

const VISUAL_CONFIG: Record<Exclude<VisualState, 'completed'>, {
  dot: string;
  title: string;
  description: string;
  nextStep: string;
}> = {
  open: {
    dot: 'bg-purple-primary',
    title: 'Predicciones abiertas',
    description: 'Los participantes pueden enviar sus predicciones.',
    nextStep: 'Cerrar las predicciones.',
  },
  predictions_closed: {
    dot: 'bg-warning',
    title: 'Predicciones cerradas',
    description: 'Ya no se aceptan nuevas participaciones.',
    nextStep: 'Publicar los resultados oficiales.',
  },
  tiebreakers_pending: {
    dot: 'bg-yellow-400',
    title: 'Desempate pendiente',
    description: 'La clasificaci\u00f3n est\u00e1 calculada, pero debes resolver un empate antes de publicar el resultado final.',
    nextStep: '',
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PickemStatusCard({
  eventId,
  status,
  submissionCount,
  closeDate,
  pendingTiebreakerCount = 0,
  compact = false,
}: PickemStatusCardProps) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const config = EVENT_STATUS_CONFIG[status];
  const isCompleted = status === 'completed';

  const visualState: VisualState =
    isCompleted && pendingTiebreakerCount > 0
      ? 'tiebreakers_pending'
      : status;

  const nonCompletedConfig = VISUAL_CONFIG[visualState as keyof typeof VISUAL_CONFIG];

  const handleClosePredictions = useCallback(async () => {
    setClosing(true);
    setCloseError(null);
    const result = await closePredictions(eventId);
    setClosing(false);
    setShowCloseModal(false);
    if (result.error) {
      setCloseError(result.error);
    } else {
      router.refresh();
    }
  }, [eventId, router]);

  const showCTA = visualState === 'open' || visualState === 'predictions_closed';

  return (
    <>
      <div className={`rounded-xl border border-border bg-surface ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex size-3 shrink-0 rounded-full ${visualState === 'tiebreakers_pending' ? nonCompletedConfig?.dot : config.dot}`} />
          <div className="flex-1 min-w-0">
            <h2 className={`font-bold text-text-primary ${compact ? 'text-sm' : 'text-base'}`}>
              {visualState === 'tiebreakers_pending' ? nonCompletedConfig?.title : isCompleted ? config.title : nonCompletedConfig?.title ?? config.title}
            </h2>
            <p className={`text-text-secondary ${compact ? 'mt-0.5 text-xs' : 'mt-1 text-sm'}`}>
              {visualState === 'tiebreakers_pending'
                ? nonCompletedConfig?.description
                : isCompleted
                  ? config.description
                  : nonCompletedConfig?.description ?? config.description}
            </p>

            <p className={`text-text-muted ${compact ? 'mt-1.5 text-xs' : 'mt-2 text-xs'}`}>
              {submissionCount} participaci&oacute;n{submissionCount !== 1 ? 'es' : ''}
            </p>

            {visualState === 'tiebreakers_pending' && pendingTiebreakerCount > 1 && (
              <p className="mt-1 text-xs text-text-muted">
                {pendingTiebreakerCount} desempates pendientes
              </p>
            )}

            {visualState === 'open' && closeDate && (
              <p className="mt-2 text-xs text-text-muted">
                Cierre autom&aacute;tico: {formatDate(closeDate)}
              </p>
            )}

            {closeError && (
              <p className="mt-2 text-xs text-danger">{closeError}</p>
            )}
          </div>
        </div>

        {!compact && showCTA && (
          <>
            <div className="my-4 border-t border-border" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted">PR&Oacute;XIMO PASO</p>
                <p className="mt-0.5 text-sm text-text-primary">{nonCompletedConfig?.nextStep}</p>
              </div>

              <div className="shrink-0">
                {visualState === 'open' && (
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(true)}
                    disabled={closing}
                    className="w-full sm:w-auto rounded-lg bg-purple-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
                  >
                    {closing ? 'Cerrando...' : 'Cerrar predicciones'}
                  </button>
                )}
                {visualState === 'predictions_closed' && (
                  <Link
                    href={`/creator/pickems/${eventId}/results`}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-purple-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
                  >
                    Registrar resultados
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showCloseModal && (
        <ConfirmActionModal
          title="Cerrar predicciones"
          description="Los participantes ya no podrán enviar nuevas predicciones."
          consequences={[
            'Se bloquean nuevas participaciones',
            'Se conservan las predicciones existentes',
            'Podrás registrar los resultados oficiales después',
          ]}
          confirmLabel="Sí, cerrar predicciones"
          isPending={closing}
          onConfirm={handleClosePredictions}
          onCancel={() => { setShowCloseModal(false); setCloseError(null); }}
        />
      )}
    </>
  );
}
