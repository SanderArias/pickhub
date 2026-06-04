'use client';

import { useActionState } from 'react';
import { publishPickem } from '@/app/actions/creator';

function CheckItem({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          ok ? 'bg-success' : 'bg-danger'
        }`}
      />
      <span className={ok ? 'text-text-secondary' : 'text-text-muted'}>
        {label}
      </span>
    </div>
  );
}

export function PublishSection({
  eventId,
  status,
  canPublish,
  hasMinActivePlayers,
  activePlayerCount,
  hasMinPredictions,
  activePredictionCount,
  allPredictionsHaveOptions,
  hasValidClosure,
  hasPrizes,
}: {
  eventId: string;
  status: string;
  canPublish: boolean;
  hasMinActivePlayers: boolean;
  activePlayerCount: number;
  hasMinPredictions: boolean;
  activePredictionCount: number;
  allPredictionsHaveOptions: boolean;
  hasValidClosure: boolean;
  hasPrizes: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    publishPickem.bind(null, eventId),
    { error: null as string | null },
  );

  if (status !== 'draft') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="text-text-secondary">
            Pick&apos;em publicado el{' '}
            {new Date().toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-text-muted">
          Este Pick&apos;em ya fue iniciado. La configuraci&oacute;n est&aacute; bloqueada.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <CheckItem
          ok={true}
          label="Título configurado"
        />
        <CheckItem
          ok={hasMinActivePlayers}
          label={
            hasMinActivePlayers
              ? `${activePlayerCount} jugadores activos`
              : 'Al menos 2 jugadores activos'
          }
        />
        <CheckItem
          ok={hasMinPredictions}
          label={
            hasMinPredictions
              ? `${activePredictionCount} prediccione${activePredictionCount !== 1 ? 's' : ''}`
              : 'Al menos 1 predicción'
          }
        />
        <CheckItem
          ok={allPredictionsHaveOptions}
          label={
            allPredictionsHaveOptions
              ? 'Cada predicción tiene opciones'
              : 'Cada predicción necesita al menos 2 opciones'
          }
        />
        <CheckItem
          ok={hasValidClosure}
          label={
            hasValidClosure
              ? 'Fecha de cierre válida'
              : 'Fecha de cierre debe ser futura'
          }
        />
        <div className="flex items-center gap-2 text-xs">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-text-muted" />
          <span className="text-text-muted">
            Premios {hasPrizes ? 'configurados' : 'no configurados (opcional)'}
          </span>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={!canPublish || pending}
        className="self-start rounded-lg border border-purple-primary px-6 py-2.5 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? 'Publicando…' : 'Iniciar Pick\'em'}
      </button>
    </form>
  );
}
