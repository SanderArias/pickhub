'use client';

import { useState } from 'react';
import { publishPickem } from '@/activities/pickem/actions';

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
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  if (status !== 'draft' || published) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="text-text-secondary">
            Pick'em publicado el{' '}
            {new Date().toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-text-muted">
          Este Pick'em ya fue iniciado. La configuración está bloqueada.
        </p>
      </div>
    );
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);

    const result = await publishPickem(eventId);

    if (result.error) {
      setError(result.error);
      setPublishing(false);
    } else {
      setPublished(true);
      setOpen(false);
      setPublishing(false);
    }
  }

  const requirementsBlocking = !hasMinActivePlayers
    || !hasMinPredictions
    || !allPredictionsHaveOptions
    || !hasValidClosure;

  return (
    <>
      <div className="flex flex-col gap-4">
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

        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          disabled={!canPublish}
          className="self-start rounded-lg border border-purple-primary px-6 py-2.5 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Iniciar Pick'em
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !publishing) setOpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape' && !publishing) setOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-text-primary">
              ¿Iniciar este Pick'em?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              Al iniciar el Pick'em, los participantes podrán comenzar a enviar sus predicciones.
              Revisa la configuración antes de continuar.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <CheckItem ok={true} label="Título configurado" />
              <CheckItem
                ok={hasMinActivePlayers}
                label={hasMinActivePlayers ? `${activePlayerCount} jugadores activos` : 'Al menos 2 jugadores activos'}
              />
              <CheckItem
                ok={hasMinPredictions}
                label={hasMinPredictions ? `${activePredictionCount} prediccione${activePredictionCount !== 1 ? 's' : ''}` : 'Al menos 1 predicción'}
              />
              <CheckItem
                ok={allPredictionsHaveOptions}
                label={allPredictionsHaveOptions ? 'Cada predicción tiene opciones' : 'Cada predicción necesita al menos 2 opciones'}
              />
              <CheckItem
                ok={hasValidClosure}
                label={hasValidClosure ? 'Fecha de cierre válida' : 'Fecha de cierre debe ser futura'}
              />
              <div className="flex items-center gap-2 text-xs">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${hasPrizes ? 'bg-success' : 'bg-text-muted'}`} />
                <span className={hasPrizes ? 'text-text-secondary' : 'text-text-muted'}>
                  Premios {hasPrizes ? 'configurados' : 'no configurados (opcional)'}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs text-text-muted">
              Después de iniciar el Pick'em, algunos cambios quedarán restringidos
              para proteger las participaciones.
            </p>

            {error && (
              <p className="mt-3 text-sm text-danger" role="alert">{error}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { if (!publishing) { setOpen(false); setError(null); } }}
                disabled={publishing}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={requirementsBlocking || publishing}
                className="rounded-lg bg-purple-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
              >
                {publishing ? 'Publicando…' : 'Iniciar Pick\'em'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
