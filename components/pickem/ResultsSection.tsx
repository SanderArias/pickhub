'use client';

import { useState, useCallback } from 'react';
import { publishResultsAndCalculateScores } from '@/app/actions/scoring';

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
}

export function ResultsSection({ eventId, predictions, existingResults, status }: ResultsSectionProps) {
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

  const initialRanking = (): Record<string, Record<number, string>> => {
    const map: Record<string, Record<number, string>> = {};
    for (const p of activePredictions.filter((p) => p.template_type === 'top8_ordered')) {
      const byPosition: Record<number, string> = {};
      for (const r of existingResults.filter((r) => r.question_id === p.id && r.position !== null)) {
        byPosition[r.position!] = r.option_id;
      }
      map[p.id] = byPosition;
    }
    return map;
  };

  const [selection, setSelection] = useState<Record<string, string[]>>(initialSelection);
  const [rankingSelection, setRankingSelection] = useState<Record<string, Record<number, string>>>(initialRanking);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEditResults = status === 'predictions_closed' || status === 'completed';

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

  const handleRankingSelect = useCallback((questionId: string, position: number, optionId: string) => {
    setRankingSelection((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? {}), [position]: optionId },
    }));
  }, []);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setError(null);

    const standardQs = activePredictions.filter((p) => p.template_type !== 'top8_ordered');
    const standardResults: Record<string, string[]> = {};
    for (const q of standardQs) {
      standardResults[q.id] = selection[q.id] ?? [];
    }

    const rankingResults: Record<string, { position: number; option_id: string }[]> = {};
    const rankingQs = activePredictions.filter((p) => p.template_type === 'top8_ordered');
    for (const q of rankingQs) {
      const positions = rankingSelection[q.id] ?? {};
      rankingResults[q.id] = Object.entries(positions).map(([pos, optId]) => ({
        position: Number(pos),
        option_id: optId,
      }));
    }

    const result = await publishResultsAndCalculateScores(eventId, standardResults, rankingResults);
    if (result.error) setError(result.error);
    setPublishing(false);
  }, [eventId, selection, rankingSelection, activePredictions]);

  if (activePredictions.length === 0) {
    return <p className="text-sm text-text-muted">No hay predicciones activas en este Pick’em.</p>;
  }

  const hasSelection = Object.values(selection).some((s) => s.length > 0) ||
    Object.values(rankingSelection).some((posMap) => Object.keys(posMap).length > 0);

  return (
    <div className="flex flex-col gap-6">
      {activePredictions.map((prediction) => {
        const isTop8 = prediction.template_type === 'top8_ordered';

        if (isTop8) {
          const selected = rankingSelection[prediction.id] ?? {};
          return (
            <div key={prediction.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-text-primary">{prediction.title}</h3>
                {prediction.description && (
                  <p className="mt-0.5 text-xs text-text-secondary">{prediction.description}</p>
                )}
                <span className="mt-1 inline-block rounded-full border border-purple-border px-2 py-0.5 text-xs text-purple-primary">
                  Top 8 ordenado · Resultado real
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {[1,2,3,4,5,6,7,8].map((pos) => (
                  <div key={pos} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
                      {pos}
                    </span>
                    <select
                      value={selected[pos] ?? ''}
                      onChange={(e) => handleRankingSelect(prediction.id, pos, e.target.value)}
                      disabled={!canEditResults}
                      className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Seleccionar</option>
                      {prediction.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        const selected = selection[prediction.id] ?? [];

        return (
          <div key={prediction.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-text-primary">{prediction.title}</h3>
              {prediction.description && (
                <p className="mt-0.5 text-xs text-text-secondary">{prediction.description}</p>
              )}
              <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                {prediction.question_type === 'single' ? 'Seleccion unica' : 'Seleccion multiple'}
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

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {status === 'predictions_closed' && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || !hasSelection}
            className="rounded-lg bg-purple-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-hover disabled:opacity-50"
          >
            {publishing ? 'Publicando...' : 'Publicar resultados y calcular puntuaciones'}
          </button>
        )}

        {status === 'completed' && (
          <p className="text-xs text-text-muted">
            Resultados publicados. Las puntuaciones ya están calculadas.
          </p>
        )}
      </div>
    </div>
  );
}
