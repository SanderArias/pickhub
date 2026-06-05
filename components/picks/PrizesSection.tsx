'use client';

import { useState, useActionState, useCallback, useEffect, useRef, startTransition } from 'react';
import { upsertEventPrize, deleteEventPrize } from '@/app/actions/creator';

interface Prize {
  id: string;
  tier: string;
  label: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  quantity: number;
}

function PrizePanel({
  eventId,
  tier,
  tierLabel,
  tierDescription,
  prize,
  readOnly,
}: {
  eventId: string;
  tier: string;
  tierLabel: string;
  tierDescription: string;
  prize: Prize | null;
  readOnly: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [state, formAction, pending] = useActionState(
    upsertEventPrize.bind(null, eventId),
    { error: null as string | null },
  );
  const [deleting, setDeleting] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (!pending && state && !state.error) {
      startTransition(() => {
        setExpanded(false);
        setShowSuccess(true);
      });
      const t = setTimeout(() => setShowSuccess(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state, pending]);

  const handleDelete = useCallback(async () => {
    if (!prize) return;
    setDeleting(true);
    const result = await deleteEventPrize(eventId, prize.id);
    setDeleting(false);
    if (result?.error) alert(result.error);
  }, [eventId, prize]);

  return (
    <div className="rounded-lg border border-border bg-surface">
      {showSuccess && (
        <p className="px-4 pt-3 text-xs text-success">Premio guardado.</p>
      )}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {tierLabel}
            </span>
            {prize ? (
              <span className="text-xs text-purple-primary">Configurado</span>
            ) : (
              <span className="text-xs text-text-muted">Sin configurar</span>
            )}
          </div>
          {prize && (
            <p className="mt-0.5 text-xs text-text-secondary">
              {prize.label}
              {prize.amount !== null && ` · ${prize.amount} ${prize.currency ?? 'USD'}`}
              {` · ${prize.quantity} ganador${prize.quantity !== 1 ? 'es' : ''}`}
            </p>
          )}
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-3 text-xs text-text-secondary">{tierDescription}</p>

          {readOnly && prize && (
            <div className="mb-3 rounded-lg border border-border bg-surface-elevated px-3 py-2">
              <p className="text-sm text-text-primary">{prize.label}</p>
              {prize.description && (
                <p className="text-xs text-text-secondary">{prize.description}</p>
              )}
              <p className="mt-0.5 text-xs text-text-muted">
                {prize.amount !== null && `${prize.amount} ${prize.currency ?? 'USD'} · `}
                {prize.quantity} ganador{prize.quantity !== 1 ? 'es' : ''}
              </p>
            </div>
          )}

          {!readOnly && (
            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="tier" value={tier} />

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Nombre del premio
                </label>
                <input
                  name="label"
                  type="text"
                  required
                  defaultValue={prize?.label ?? ''}
                  placeholder="Ej. Gift card de $25"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Descripción <span className="text-text-muted">(opcional)</span>
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={prize?.description ?? ''}
                  placeholder="Ej. Canjeable por suscripción de 1 mes"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Cantidad
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min={1}
                    defaultValue={prize?.quantity ?? 1}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:border-purple-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Monto <span className="text-text-muted">(opcional)</span>
                  </label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={prize?.amount ?? ''}
                    placeholder="25.00"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Moneda
                  </label>
                  <select
                    name="currency"
                    defaultValue={prize?.currency ?? 'USD'}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:border-purple-primary focus:outline-none"
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
                <p className="text-xs text-danger">{state.error}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="self-start rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
                >
                  {pending ? 'Guardando…' : prize ? 'Actualizar premio' : 'Guardar premio'}
                </button>
                {prize && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="self-start rounded-lg px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                  >
                    {deleting ? 'Eliminando…' : 'Eliminar premio'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
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
  const subscriberPrize = prizes.find((p) => p.tier === 'subscriber') ?? null;
  const nonsubscriberPrize = prizes.find((p) => p.tier === 'nonsubscriber') ?? null;
  const count = prizes.length;

  return (
    <div>
      <p className="mb-3 text-xs text-text-secondary">
        Configura premios opcionales para incentivar la participación.
      </p>

      <p className="mb-4 text-xs text-text-muted">
        {count === 0
          ? 'Sin premios configurados'
          : count === 1
            ? '1 premio configurado'
            : 'Premios configurados'}
      </p>

      <div className="flex flex-col gap-3">
        <PrizePanel
          eventId={eventId}
          tier="subscriber"
          tierLabel="Premio para suscriptores"
          tierDescription="Incentivo exclusivo para tus suscriptores de Twitch."
          prize={subscriberPrize}
          readOnly={readOnly}
        />
        <PrizePanel
          eventId={eventId}
          tier="nonsubscriber"
          tierLabel="Premio para no suscriptores"
          tierDescription="Premio abierto a todos los participantes."
          prize={nonsubscriberPrize}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
