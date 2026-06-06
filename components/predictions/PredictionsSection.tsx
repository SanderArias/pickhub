'use client';

import { useState, useRef, useEffect, useActionState, useCallback } from 'react';
import { createPredictionQuestion, updatePredictionQuestion, deletePredictionQuestion } from '@/app/actions/creator';

const MAX_PREDICTIONS = 5;

interface Option {
  id: string;
  question_id: string;
  player_id: string | null;
  label: string;
  sort_order: number;
}

interface Prediction {
  id: string;
  title: string;
  description: string | null;
  question_type: string;
  pick_type: string;
  max_selections: number;
  points_per_correct: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  template_type: string | null;
  config: Record<string, unknown>;
  options: Option[];
}

export function PredictionsSection({
  eventId,
  predictions,
  readOnly = false,
}: {
  eventId: string;
  predictions: Prediction[];
  readOnly?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [pickType, setPickType] = useState('player');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Prediction | null>(null);
  const [templateMode, setTemplateMode] = useState<'template' | 'custom'>('template');

  const [state, formAction, pending] = useActionState(
    async (prev: { error: string | null }, formData: FormData) => {
      const editingId = formData.get('_editing_id') as string;
      if (editingId) {
        return updatePredictionQuestion(editingId, eventId, prev, formData);
      }
      return createPredictionQuestion(eventId, prev, formData);
    },
    { error: null as string | null },
  );

  const prevPending = useRef(pending);
  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      setShowForm(false);
      setEditing(null);
      setTemplateMode('template');
    }
    prevPending.current = pending;
  }, [pending, state.error]);

  const handleEdit = useCallback((q: Prediction) => {
    setEditing(q);
    setPickType(q.pick_type);
    setTemplateMode(q.template_type ? 'template' : 'custom');
    setShowForm(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditing(null);
    setShowForm(false);
    setTemplateMode('custom');
  }, []);

  const handleDelete = useCallback(async (questionId: string) => {
    setDeletingId(questionId);
    const result = await deletePredictionQuestion(questionId);
    setDeletingId(null);
    if (result?.error) {
      alert(result.error);
    }
  }, []);

  const handleStartCreate = useCallback(() => {
    setEditing(null);
    setTemplateMode('template');
    setPickType('player');
    setShowForm(true);
  }, []);

  const count = predictions.length;
  const atLimit = count >= MAX_PREDICTIONS;

  if (count === 0 && !showForm) {
    return (
      <div>
        {atLimit ? (
          <p className="py-4 text-center text-xs text-text-muted">
            Límite alcanzado. No puedes crear más predicciones en este Pick’em.
          </p>
        ) : (
          <p className="py-4 text-center text-sm text-text-muted">
            No hay predicciones creadas. Crea al menos 1 predicción para activar la participación.
          </p>
        )}

        {!atLimit && !readOnly && (
          <button
            onClick={handleStartCreate}
            className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
          >
            Crear predicción
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {count} creadas
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        {predictions.map((q, i) => (
          <div
            key={q.id}
            className="rounded-lg border border-border bg-surface p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-medium text-text-muted">
                    {i + 1}
                  </span>
                  <span className="font-medium text-text-primary">{q.title}</span>
                </div>
                {q.description && (
                  <p className="mt-0.5 text-xs text-text-secondary">{q.description}</p>
                )}
              </div>
              {!readOnly && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(q)}
                    disabled={!!(editing || deletingId)}
                    className="rounded px-2 py-0.5 text-xs text-text-secondary transition-colors hover:bg-border disabled:opacity-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(q.id)}
                    disabled={deletingId === q.id}
                    className="rounded px-2 py-0.5 text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                  >
                    {deletingId === q.id ? '…' : 'Eliminar'}
                  </button>
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
              {q.template_type === 'top8_ordered' ? (
                <span>Plantilla: Top 8 ordenado</span>
              ) : (
                <>
                  <span>Tipo: {q.question_type === 'single' ? 'Única' : 'Múltiple'}</span>
                  <span>Selección: {q.pick_type === 'player' ? 'Jugadores' : 'Personalizada'}</span>
                  <span>Max: {q.max_selections}</span>
                  <span>Puntos: {q.points_per_correct}</span>
                </>
              )}
              <span>Opciones: {q.options.length}</span>
            </div>
          </div>
        ))}
      </div>

      {readOnly ? null : atLimit && !editing ? (
        <p className="text-xs text-text-muted">
          Límite alcanzado. No puedes crear más predicciones en este Pick’em.
        </p>
      ) : showForm ? (
        <form
          key={editing?.id ?? 'create'}
          action={formAction}
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
        >
          <input type="hidden" name="_editing_id" value={editing?.id ?? ''} />

          {/* Template type selector (only for new predictions) */}
          {!editing && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Tipo de predicción
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateMode('template')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    templateMode === 'template'
                      ? 'border-purple-primary bg-purple-surface text-purple-primary'
                      : 'border-border text-text-secondary hover:border-border-hover'
                  }`}
                >
                  Plantilla PickHub
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateMode('custom')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    templateMode === 'custom'
                      ? 'border-purple-primary bg-purple-surface text-purple-primary'
                      : 'border-border text-text-secondary hover:border-border-hover'
                  }`}
                >
                  Predicción personalizada
                </button>
              </div>
            </div>
          )}

          {/* Hidden field for template_type */}
          <input type="hidden" name="template_type" value={templateMode === 'template' ? 'top8_ordered' : ''} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              Título de la predicción
            </label>
            <input
              name="title"
              type="text"
              required
              defaultValue={editing?.title ?? (templateMode === 'template' ? 'Predice el Top 8' : '')}
              placeholder={templateMode === 'template' ? 'Predice el Top 8' : 'Ej. ¿Quién ganará la final?'}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              Descripción <span className="text-text-muted">(opcional)</span>
            </label>
            <textarea
              name="description"
              rows={2}
              required={templateMode === 'template'}
              defaultValue={editing?.description ?? (templateMode === 'template' ? 'Ordena los jugadores del puesto 1 al 8.' : '')}
              placeholder={templateMode === 'template' ? 'Ordena los jugadores del puesto 1 al 8.' : 'Contexto adicional para la predicción…'}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>

          {/* Template card preview */}
          {templateMode === 'template' && (
            <div className="rounded-lg border border-purple-border bg-purple-surface/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-md bg-purple-primary/20 px-2 py-0.5 text-xs font-medium text-purple-primary">
                  Plantilla
                </span>
                <span className="text-sm font-medium text-text-primary">Top 8 ordenado</span>
              </div>
              <p className="text-xs text-text-secondary">
                Los participantes ordenan 8 jugadores del puesto 1 al 8.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-xs">
                  <span className="font-semibold text-purple-primary">+1</span>
                  <span className="text-text-secondary">Jugador dentro del Top 8</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-xs">
                  <span className="font-semibold text-purple-primary">+1</span>
                  <span className="text-text-secondary">Posici&oacute;n exacta</span>
                </span>
              </div>
              <p className="mt-2 text-xs text-text-muted">
                🏆 M&aacute;ximo posible: 16 puntos
              </p>
            </div>
          )}

          {/* Custom prediction fields */}
          {templateMode === 'custom' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Tipo de respuesta
                  </label>
                  <select
                    name="question_type"
                    defaultValue={editing?.question_type ?? 'single'}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary"
                  >
                    <option value="single">Única opción</option>
                    <option value="multiple">Múltiples opciones</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Origen de opciones
                  </label>
                  <select
                    name="pick_type"
                    value={pickType}
                    onChange={(e) => setPickType(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary"
                  >
                    <option value="player">Jugadores del evento</option>
                    <option value="custom">Personalizadas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Selecciones máximas
                  </label>
                  <input
                    name="max_selections"
                    type="number"
                    min={1}
                    defaultValue={editing?.max_selections ?? 1}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Puntos por acierto
                  </label>
                  <input
                    name="points_per_correct"
                    type="number"
                    min={1}
                    defaultValue={editing?.points_per_correct ?? 1}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary"
                  />
                </div>
              </div>

              {pickType === 'custom' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Opciones personalizadas
                  </label>
                  <textarea
                    name="custom_options"
                    rows={4}
                    defaultValue={
                      editing?.pick_type === 'custom'
                        ? editing.options.map((o) => o.label).join('\n')
                        : ''
                    }
                    placeholder="Una opción por línea&#10;Ej:&#10;Opción A&#10;Opción B&#10;Opción C"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Escribe una opción por línea. Mínimo 2 opciones.
                  </p>
                </div>
              )}
            </>
          )}

          {state?.error && (
            <p className="text-sm text-danger">{state.error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
            >
              {pending
                ? (editing ? 'Actualizando…' : 'Creando…')
                : (editing ? 'Actualizar predicción' : 'Guardar predicción')}
            </button>
            <button
              type="button"
              onClick={editing ? handleCancelEdit : () => { setShowForm(false); setTemplateMode('custom'); }}
              className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : !readOnly ? (
        <button
          onClick={handleStartCreate}
          className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
        >
          Crear predicción
        </button>
      ) : null}
    </div>
  );
}
