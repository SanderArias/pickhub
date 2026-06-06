'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { closePredictions } from '@/app/actions/creator';

const STEPS = [
  { key: 'open', label: 'Abierto' },
  { key: 'predictions_closed', label: 'Cerrado' },
  { key: 'completed', label: 'Completado' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-purple-primary',
  predictions_closed: 'bg-warning',
  completed: 'bg-success',
};

function getStepState(status: string, stepKey: string): 'completed' | 'current' | 'upcoming' {
  const order = ['open', 'predictions_closed', 'completed'];
  const statusIdx = order.indexOf(status);
  const stepIdx = order.indexOf(stepKey);
  if (stepIdx < statusIdx) return 'completed';
  if (stepIdx === statusIdx) return 'current';
  return 'upcoming';
}

function StepCircle({ state, colorClass }: { state: 'completed' | 'current' | 'upcoming'; colorClass: string }) {
  if (state === 'completed') {
    return (
      <div className={`flex size-6 items-center justify-center rounded-full ${colorClass}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (state === 'current') {
    return (
      <div className={`flex size-6 items-center justify-center rounded-full ${colorClass}`}>
        <div className="size-2.5 rounded-full bg-white" />
      </div>
    );
  }
  return (
    <div className="flex size-6 items-center justify-center rounded-full border-2 border-border">
      <div className="size-2 rounded-full bg-border" />
    </div>
  );
}

export function StatusTimeline({
  eventId,
  status,
}: {
  eventId: string;
  status: string;
}) {
  const router = useRouter();

  async function handleClose() {
    await closePredictions(eventId);
    router.refresh();
  }

  const order = ['open', 'predictions_closed', 'completed'];
  const currentStep = order.indexOf(status) + 1;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {/* Header + step indicator */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Estado del Pick'em</h2>
        <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-400">
          Paso {currentStep} de 3
        </span>
      </div>

      {/* Timeline */}
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const stepState = getStepState(status, step.key);
          const color = STATUS_COLORS[step.key];
          const isActive = stepState !== 'upcoming';

          return (
            <div key={step.key} className="flex items-center">
              {/* Circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <StepCircle state={stepState} colorClass={color} />
                <span className={`whitespace-nowrap text-xs font-medium transition-colors ${
                  isActive ? 'text-text-primary' : 'text-text-muted'
                }`}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className={`mx-2 h-1 w-10 sm:w-16 rounded-full transition-colors ${
                  stepState === 'completed' ? color : 'bg-border'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Context info + CTA */}
      <div className="mt-5 space-y-3">
        {status === 'open' && (
          <>
            <p className="text-xs leading-relaxed text-text-secondary">
              Los participantes aún pueden enviar predicciones.
              <br />
              Cuando el evento comience, cierra las predicciones para registrar los resultados oficiales.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg bg-purple-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
            >
              Cerrar predicciones
            </button>
          </>
        )}

        {status === 'predictions_closed' && (
          <>
            <p className="text-xs leading-relaxed text-text-secondary">
              Las predicciones fueron cerradas correctamente.
              <br />
              El siguiente paso es registrar los resultados oficiales del evento.
            </p>
            <Link
              href={`/creator/pickems/${eventId}/results`}
              className="block w-full rounded-lg bg-purple-primary px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-purple-600"
            >
              Registrar resultados
            </Link>
          </>
        )}

        {status === 'completed' && (
          <>
            <p className="text-xs leading-relaxed text-text-secondary">
              Resultados calculados y clasificación generada.
              <br />
              El Pick'em ha finalizado correctamente.
            </p>
            <Link
              href={`/creator/pickems/${eventId}/results`}
              className="block w-full rounded-lg bg-purple-primary px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-purple-600"
            >
              Ver clasificación
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
