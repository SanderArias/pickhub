'use client';

import { useState, useActionState } from 'react';
import { createPredictionQuestion } from '@/app/actions/creator';

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
  options: Option[];
}

export function PredictionsSection({
  eventId,
  predictions,
}: {
  eventId: string;
  predictions: Prediction[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [pickType, setPickType] = useState('player');
  const [state, formAction, pending] = useActionState(
    createPredictionQuestion.bind(null, eventId),
    { error: null as string | null },
  );

  const count = predictions.length;
  const atLimit = count >= MAX_PREDICTIONS;

  if (count === 0 && !showForm) {
    return (
      <div>
        {atLimit ? (
          <p className="py-4 text-center text-sm text-[#e8e8e8]">
            Límite alcanzado: este Pick&apos;em puede tener hasta {MAX_PREDICTIONS} predicciones.
          </p>
        ) : (
          <p className="py-4 text-center text-sm text-[#555]">
            No hay predicciones creadas. Crea al menos 1 predicción para activar la participación.
          </p>
        )}

        {!atLimit && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-[#e8e8e8] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white"
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
        <span className="text-xs text-[#555]">
          {count} de {MAX_PREDICTIONS} creadas
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        {predictions.map((q, i) => (
          <div
            key={q.id}
            className="rounded-md border border-[#1f1f1f] bg-[#181818] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-xs font-medium text-[#555]">
                    {i + 1}
                  </span>
                  <span className="font-medium text-[#e8e8e8]">{q.title}</span>
                </div>
                {q.description && (
                  <p className="mt-0.5 text-xs text-[#888]">{q.description}</p>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#555]">
              <span>Tipo: {q.question_type === 'single' ? 'Única' : 'Múltiple'}</span>
              <span>Selección: {q.pick_type === 'player' ? 'Jugadores' : 'Personalizada'}</span>
              <span>Max: {q.max_selections}</span>
              <span>Puntos: {q.points_per_correct}</span>
              <span>Opciones: {q.options.length}</span>
            </div>
          </div>
        ))}
      </div>

      {atLimit ? (
        <p className="text-sm text-[#e8e8e8]">
          Límite alcanzado: este Pick&apos;em puede tener hasta {MAX_PREDICTIONS} predicciones.
        </p>
      ) : showForm ? (
        <form action={formAction} className="flex flex-col gap-4 rounded-md border border-[#1f1f1f] bg-[#111] p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#888]">
              Título de la predicción
            </label>
            <input
              name="title"
              type="text"
              required
              placeholder="Ej. ¿Quién ganará la final?"
              className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#888]">
              Descripción <span className="text-[#555]">(opcional)</span>
            </label>
            <textarea
              name="description"
              rows={2}
              placeholder="Contexto adicional para la predicción…"
              className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#888]">
                Tipo de respuesta
              </label>
              <select
                name="question_type"
                defaultValue="single"
                className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
              >
                <option value="single">Única opción</option>
                <option value="multiple">Múltiples opciones</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#888]">
                Origen de opciones
              </label>
              <select
                name="pick_type"
                value={pickType}
                onChange={(e) => setPickType(e.target.value)}
                className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
              >
                <option value="player">Jugadores del evento</option>
                <option value="custom">Personalizadas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#888]">
                Selecciones máximas
              </label>
              <input
                name="max_selections"
                type="number"
                min={1}
                defaultValue={1}
                className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#888]">
                Puntos por acierto
              </label>
              <input
                name="points_per_correct"
                type="number"
                min={1}
                defaultValue={1}
                className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
              />
            </div>
          </div>

          {pickType === 'custom' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[#888]">
                Opciones personalizadas
              </label>
              <textarea
                name="custom_options"
                rows={4}
                placeholder="Una opción por línea&#10;Ej:&#10;Opción A&#10;Opción B&#10;Opción C"
                className="w-full rounded border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e8e8e8] outline-none focus:border-[#2a2a2a]"
              />
              <p className="mt-1 text-xs text-[#555]">
                Escribe una opción por línea. Mínimo 2 opciones.
              </p>
            </div>
          )}

          {state?.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-[#e8e8e8] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white disabled:opacity-50"
            >
              {pending ? 'Creando…' : 'Guardar predicción'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md bg-[#181818] px-4 py-2 text-sm font-medium text-[#888] transition-colors hover:bg-[#1f1f1f]"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-[#e8e8e8] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white"
        >
          Crear predicción
        </button>
      )}
    </div>
  );
}
