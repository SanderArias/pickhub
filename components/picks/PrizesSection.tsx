'use client';

import { useState, useActionState, useCallback } from 'react';
import { upsertEventPrize, deleteEventPrize } from '@/app/actions/creator';

const TIER_OPTIONS = [
  { value: 'subscriber', label: 'Suscriptores' },
  { value: 'nonsubscriber', label: 'No suscriptores' },
];

const MAX_PRIZES = 2;

interface Prize {
  id: string;
  tier: string;
  label: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  quantity: number;
}

export function PrizesSection({
  eventId,
  prizes,
  readOnly = false,
}: {
  eventId: string;
  prizes: Prize[];
  readOnly?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    upsertEventPrize.bind(null, eventId),
    { error: null as string | null },
  );

  const occupiedTiers = new Set(prizes.map((p) => p.tier));
  const atLimit = prizes.length >= MAX_PRIZES;

  const handleDelete = useCallback(async (prizeId: string) => {
    setDeletingId(prizeId);
    const result = await deleteEventPrize(eventId, prizeId);
    setDeletingId(null);
    if (result?.error) alert(result.error);
  }, [eventId]);

  if (prizes.length === 0 && !showForm) {
    return (
      <div>
        <p className="text-xs text-text-secondary">
          Los premios son opcionales y se pueden configurar en cualquier momento.
        </p>
        {!atLimit && !readOnly && (
          <div className="mt-3">
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
            >
              Agregar premio
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {prizes.length} de {MAX_PRIZES} configurados
        </span>
      </div>

      {prizes.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {prizes.map((prize) => (
            <div
              key={prize.id}
              className="rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{prize.label}</span>
                    <span className="rounded bg-surface-hover px-1.5 py-0.5 text-xs text-text-muted">
                      {TIER_OPTIONS.find((t) => t.value === prize.tier)?.label ?? prize.tier}
                    </span>
                  </div>
                  {prize.description && (
                    <p className="mt-0.5 text-xs text-text-secondary">{prize.description}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                    {prize.amount !== null && (
                      <span>{prize.amount} {prize.currency ?? 'USD'}</span>
                    )}
                    <span>{prize.quantity} ganador{prize.quantity !== 1 ? 'es' : ''}</span>
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(prize.id)}
                    disabled={deletingId === prize.id}
                    className="shrink-0 rounded px-2 py-0.5 text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                  >
                    {deletingId === prize.id ? '…' : 'Eliminar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (atLimit && !showForm ? (
        <p className="text-sm text-text-primary">
          Límite alcanzado: este Pick&apos;em puede tener hasta {MAX_PRIZES} premios (uno por tipo).
        </p>
      ) : showForm ? (
        <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Tipo de premio
              </label>
              <select
                name="tier"
                defaultValue={
                  prizes.length === 0
                    ? 'subscriber'
                    : TIER_OPTIONS.find((t) => !occupiedTiers.has(t.value))?.value ?? 'subscriber'
                }
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary"
              >
                {TIER_OPTIONS.map((t) => (
                  <option
                    key={t.value}
                    value={t.value}
                    disabled={occupiedTiers.has(t.value)}
                  >
                    {t.label}{occupiedTiers.has(t.value) ? ' (ya configurado)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Cantidad de ganadores
              </label>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              Nombre del premio
            </label>
            <input
              name="label"
              type="text"
              required
              placeholder="Ej. Gift card de $10"
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
              placeholder="Ej. Canjeable por suscripción de 1 mes"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Monto <span className="text-text-muted">(opcional)</span>
              </label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min={0}
                placeholder="10.00"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Moneda
              </label>
              <select
                name="currency"
                defaultValue="USD"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
                <option value="COP">COP</option>
                <option value="ARS">ARS</option>
                <option value="CLP">CLP</option>
                <option value="PEN">PEN</option>
              </select>
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-danger">{state.error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
            >
              {pending ? 'Guardando…' : 'Guardar premio'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
        >
          Agregar premio
        </button>
      ))}
    </div>
  );
}
