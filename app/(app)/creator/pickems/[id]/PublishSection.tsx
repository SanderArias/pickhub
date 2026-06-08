'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { publishPickem } from '@/activities/pickem/actions';
import { pickemRoutes } from '@/activities/pickem/routes';

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

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? 'size-5'}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
    </svg>
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    return () => {};
  }, [eventId]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (status !== 'draft') {
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
    setIsPublishing(true);
    setError(null);

    const result = await publishPickem(eventId);

    if (result.error) {
      setError(result.error);
      setIsPublishing(false);
    } else {
      router.replace(pickemRoutes.creator.detail(eventId));
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
                ? activePredictionCount === 1
                  ? '1 predicción'
                  : `${activePredictionCount} predicciones`
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
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${hasPrizes ? 'bg-success' : 'bg-text-muted'}`} />
            <span className={hasPrizes ? 'text-text-secondary' : 'text-text-muted'}>
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
          onClick={(e) => { if (e.target === e.currentTarget && !isPublishing) setOpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape' && !isPublishing) setOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal={isPublishing ? true : true}
            aria-busy={isPublishing}
            className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
          >
            {/* === CONFIRM STATE === */}
            {!isPublishing && !error && (
              <>
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
                    label={hasMinPredictions ? (activePredictionCount === 1 ? '1 predicción' : `${activePredictionCount} predicciones`) : 'Al menos 1 predicción'}
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

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setError(null); }}
                    disabled={false}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={requirementsBlocking}
                    className="rounded-lg bg-purple-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
                  >
                    Iniciar Pick'em
                  </button>
                </div>
              </>
            )}

            {/* === PUBLISHING STATE === */}
            {isPublishing && !error && (
              <div className="flex flex-col items-center gap-4 py-4">
                <Spinner className="size-8 text-purple-primary" />
                <div className="text-center">
                  <h3 className="text-lg font-bold text-text-primary">
                    Iniciando tu Pick'em
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Estamos preparando la página y habilitando las predicciones.
                  </p>
                </div>
              </div>
            )}

            {/* === ERROR STATE === */}
            {error && !isPublishing && (
              <>
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex size-12 items-center justify-center rounded-full bg-danger/10">
                    <svg className="size-6 text-danger" viewBox="0 0 24 24" fill="none">
                      <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-text-primary">
                      Error al publicar
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      No pudimos iniciar el Pick'em. Tus cambios siguen guardados. Inténtalo nuevamente.
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-danger" role="alert">{error}</p>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setError(null); }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="rounded-lg bg-purple-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
                  >
                    Reintentar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
