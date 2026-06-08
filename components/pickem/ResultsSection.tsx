'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { publishResultsAndCalculateScores, type PublishResultsOutcome } from '@/app/actions/scoring';
import { Top8OfficialResults } from '@/components/pickem/Top8OfficialResults';
import { ConfirmActionModal } from '@/components/pickem/ConfirmActionModal';

interface Option {
  id: string;
  label: string;
  player_id: string | null;
}

interface Prediction {
  id: string;
  title: string;
  description: string | null;
  question_type: 'single' | 'multiple' | 'ranking';
  pick_type: 'player' | 'custom';
  is_active: boolean;
  points_per_correct: number;
  template_type: string | null;
  config: Record<string, unknown>;
  options: Option[];
}

interface ExistingResult {
  question_id: string;
  option_id: string;
  is_correct: boolean;
  position: number | null;
}

interface ResultsSectionProps {
  eventId: string;
  predictions: Prediction[];
  existingResults: ExistingResult[];
  status: string;
  players: Array<{ id: string; country_code: string | null }>;
  onPublished?: string | (() => void);
}

export function ResultsSection({ eventId, predictions, existingResults, status, players, onPublished }: ResultsSectionProps) {
  const router = useRouter();
  const activePredictions = predictions.filter((p) => p.is_active !== false);

  const initialSelection = () => {
    const map: Record<string, string[]> = {};
    for (const p of activePredictions) {
      const selected = existingResults
        .filter((r) => r.question_id === p.id && r.is_correct && r.position === null)
        .map((r) => r.option_id);
      map[p.id] = selected;
    }
    return map;
  };

  const initialRanking = (): Record<string, string[]> => {
    const map: Record<string, string[]> = {};
    for (const p of activePredictions.filter((p) => p.template_type === 'top8_ordered')) {
      const byPosition: Record<number, string> = {};
      for (const r of existingResults.filter((r) => r.question_id === p.id && r.position !== null)) {
        byPosition[r.position!] = r.option_id;
      }
      const ordered: string[] = [];
      for (let i = 1; i <= 8; i++) {
        if (byPosition[i]) ordered.push(byPosition[i]);
      }
      map[p.id] = ordered;
    }
    return map;
  };

  const [selection, setSelection] = useState<Record<string, string[]>>(initialSelection);
  const [rankingSelection, setRankingSelection] = useState<Record<string, string[]>>(initialRanking);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const canEditResults = status === 'predictions_closed';

  const handleSingleSelect = useCallback((questionId: string, optionId: string) => {
    setSelection((prev) => ({ ...prev, [questionId]: [optionId] }));
  }, []);

  const handleMultipleSelect = useCallback((questionId: string, optionId: string) => {
    setSelection((prev) => {
      const current = prev[questionId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  }, []);

  const handleRankingChange = useCallback((questionId: string, orderedIds: string[]) => {
    setRankingSelection((prev) => ({ ...prev, [questionId]: orderedIds }));
  }, []);

  const doPublish = useCallback(async () => {
    setPublishing(true);
    setError(null);
    setShowConfirm(false);

    const standardQs = activePredictions.filter((p) => p.template_type !== 'top8_ordered');
    const standardResults: Record<string, string[]> = {};
    for (const q of standardQs) {
      standardResults[q.id] = selection[q.id] ?? [];
    }

    const rankingResults: Record<string, { position: number; option_id: string }[]> = {};
    const rankingQs = activePredictions.filter((p) => p.template_type === 'top8_ordered');
    for (const q of rankingQs) {
      const ordered = rankingSelection[q.id] ?? [];
      rankingResults[q.id] = ordered.map((optionId, index) => ({
        position: index + 1,
        option_id: optionId,
      }));
    }

    console.info('[publish-results:client] calling server action', { eventId });

    const result = await publishResultsAndCalculateScores(eventId, standardResults, rankingResults);

    console.info('[publish-results:client-result]', result);

    if (!result.success) {
      setPublishing(false);
      setError(result.error);
      return;
    }

    console.info('[publish-results:client] navigating to', result.redirectTo);

    // Navigate — the publishing state stays true until the component unmounts
    router.replace(result.redirectTo);
    router.refresh();
  }, [eventId, selection, rankingSelection, activePredictions, router]);

  if (activePredictions.length === 0) {
    return <p className="text-sm text-text-muted">No hay predicciones activas en este Pick'em.</p>;
  }

  const top8Prediction = activePredictions.find((p) => p.template_type === 'top8_ordered');
  const standardPredictions = activePredictions.filter((p) => p.template_type !== 'top8_ordered');

  const top8Ranked = top8Prediction ? (rankingSelection[top8Prediction.id] ?? []) : [];
  const top8RankedCount = top8Ranked.length;
  const isTop8Complete = top8RankedCount === 8;

  const hasStandardSelection = Object.values(selection).some((s) => s.length > 0);
  const hasAnySelection = hasStandardSelection || (top8Prediction ? isTop8Complete : false);

  return (
    <div className="flex flex-col gap-8">
      {/* Standard predictions — answer selection */}
      {standardPredictions.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Resultados de predicciones</h2>
            <p className="mt-0.5 text-xs text-text-secondary">Marca las opciones correctas para cada predicción.</p>
          </div>

          {standardPredictions.map((prediction) => {
            const selected = selection[prediction.id] ?? [];

            return (
              <div key={prediction.id}>
                <div className="mb-2.5">
                  <h3 className="text-sm font-medium text-text-primary">{prediction.title}</h3>
                  {prediction.description && (
                    <p className="mt-0.5 text-xs text-text-secondary">{prediction.description}</p>
                  )}
                  <span className="mt-1 inline-block text-xs text-text-muted">
                    {prediction.question_type === 'single' ? 'Selección única' : 'Selección múltiple'}
                    {' · '}
                    {prediction.points_per_correct} pt{prediction.points_per_correct !== 1 ? 's' : ''} c/u
                  </span>
                </div>

                {prediction.options.length === 0 ? (
                  <p className="text-xs text-text-muted">Sin opciones configuradas.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {prediction.options.map((option) => {
                      const isSelected = selected.includes(option.id);
                      if (prediction.question_type === 'single') {
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSingleSelect(prediction.id, option.id)}
                            disabled={!canEditResults}
                            className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                              isSelected
                                ? 'border-purple-primary bg-purple-surface text-text-primary'
                                : 'border-border text-text-secondary hover:border-border-hover'
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              isSelected ? 'border-purple-primary bg-purple-primary' : 'border-border'
                            }`}>
                              {isSelected && (
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                  <circle cx="4" cy="4" r="4" fill="white" />
                                </svg>
                              )}
                            </span>
                            {option.label}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleMultipleSelect(prediction.id, option.id)}
                          disabled={!canEditResults}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? 'border-purple-primary bg-purple-surface text-text-primary'
                              : 'border-border text-text-secondary hover:border-border-hover'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSelected ? 'border-purple-primary bg-purple-primary' : 'border-border'
                          }`}>
                            {isSelected && (
                              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                <path d="M2 4.5L3.5 6L7 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Top 8 oficial — DnD */}
      {top8Prediction && (
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Top 8 oficial</h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Ordena a los jugadores en la posición final que ocuparon.
            </p>
          </div>

          <Top8OfficialResults
            options={top8Prediction.options.map((o) => ({ id: o.id, label: o.label, playerId: o.player_id }))}
            players={players}
            initialRanked={top8Ranked}
            disabled={!canEditResults}
            onChange={(orderedIds) => handleRankingChange(top8Prediction.id, orderedIds)}
          />
        </section>
      )}

      {/* Processing overlay */}
      {canEditResults && publishing && (
        <div className="rounded-xl border border-border bg-surface p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <svg className="size-8 animate-spin text-purple-primary" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Publicando resultados</h3>
              <p className="mt-1 text-xs text-text-secondary">
                Estamos calculando la clasificación y preparando los premios.
              </p>
            </div>
            <div className="mt-1 space-y-1">
              {[
                { label: 'Resultados oficiales', done: true },
                { label: 'Puntuaciones', done: false },
                { label: 'Clasificación', done: false },
                { label: 'Empates', done: false },
                { label: 'Premios', done: false },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  {step.done ? (
                    <svg className="size-3 text-success shrink-0" viewBox="0 0 16 16" fill="none">
                      <path d="M4 8L6.5 10.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg className="size-3 text-text-muted shrink-0 animate-pulse" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="3" fill="currentColor" />
                    </svg>
                  )}
                  {step.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Validation block */}
      {canEditResults && !publishing && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-start gap-3">
            {top8Prediction && (
              <span className={`mt-0.5 flex size-3 shrink-0 rounded-full ${
                isTop8Complete ? 'bg-success' : 'bg-text-muted'
              }`} />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text-primary">Estado de publicación</h3>
              <p className="mt-1 text-xs text-text-secondary">
                {top8Prediction
                  ? isTop8Complete
                    ? 'Todas las posiciones del Top 8 han sido registradas.'
                    : `Faltan ${8 - top8RankedCount} posiciones por completar en el Top 8.`
                  : 'Revisa las opciones correctas antes de publicar.'}
              </p>

              {/* Progress for Top 8 */}
              {top8Prediction && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-xs">
                    {isTop8Complete ? (
                      <span className="flex items-center gap-1.5 font-medium text-success">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M4 8L6.5 10.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Resultados completos
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-medium text-text-muted">
                        <span className="size-2 rounded-full bg-text-muted" />
                        {top8RankedCount} de 8 posiciones registradas
                      </span>
                    )}
                  </div>
                </div>
              )}

              {!hasAnySelection && (
                <p className="mt-2 text-xs text-warning">
                  Selecciona al menos una opción correcta para poder publicar.
                </p>
              )}
            </div>
          </div>

          <div className="my-4 border-t border-border" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted">AL PUBLICAR SE GENERARÁ</p>
              <div className="mt-1.5 space-y-1">
                {['Puntuaciones de todos los participantes', 'Clasificación final', 'Detección de empates', 'Desempates si son necesarios'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <svg className="size-3 text-success shrink-0" viewBox="0 0 16 16" fill="none">
                      <path d="M4 8L6.5 10.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={!hasAnySelection}
              className="w-full sm:w-auto rounded-lg bg-purple-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
            >
              Publicar resultados
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/[0.03] px-4 py-3 text-sm text-danger">
          <p className="font-medium">No pudimos publicar los resultados.</p>
          <p className="mt-1 text-xs opacity-80">
            Tus selecciones se mantienen. Inténtalo nuevamente.
          </p>
          {error && (
            <p className="mt-1 text-xs opacity-60">{error}</p>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <ConfirmActionModal
          title="Publicar resultados oficiales"
          description="Esta acción iniciará el proceso de resolución del Pick'em."
          consequences={[
            'Calcula puntuaciones de todos los participantes',
            'Genera la clasificación final',
            'Detecta empates automáticamente',
            'Activa desempates si existen',
          ]}
          confirmLabel="Publicar resultados"
          isPending={publishing}
          onConfirm={doPublish}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
