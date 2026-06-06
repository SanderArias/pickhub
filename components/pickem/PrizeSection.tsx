'use client';

import { useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { updateEventPrizes } from '@/app/actions/creator';
import {
  type Prize,
  type PrizeStackingPolicy,
  CURRENCIES,
} from '@/lib/prize-types';
import { type TwitchVerificationStatus } from '@/lib/twitch';

type PrizeCategory = 'general_ranking' | 'subscriber_bonus';

type PrizeDraft = {
  localId: string;
  persistedId: string | null;
  category: PrizeCategory;
  rank: number;
  label: string;
  description: string;
  amount: string;
  currency: string;
};

const CATEGORY_LABELS: Record<PrizeCategory, string> = {
  general_ranking: 'Premios de la clasificación general',
  subscriber_bonus: 'Beneficios exclusivos para suscriptores',
};

const CATEGORY_DESCRIPTIONS: Record<PrizeCategory, string> = {
  general_ranking: 'Define qué recibe cada posición de la clasificación final, sin importar si el participante es suscriptor o no.',
  subscriber_bonus: 'Premia a los suscriptores mejor clasificados, aunque no estén entre los primeros lugares de la clasificación general.',
};

function genLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneDraft(d: PrizeDraft, overrides: Partial<PrizeDraft> = {}): PrizeDraft {
  return { ...d, ...overrides };
}

function ordinal(n: number): string {
  return `${n}.\u00BA`;
}

function subscriberRankLabel(rank: number): string {
  const labels: Record<number, string> = {
    1: 'Mejor suscriptor',
    2: 'Segundo mejor suscriptor',
    3: 'Tercer mejor suscriptor',
    4: 'Cuarto mejor suscriptor',
    5: 'Quinto mejor suscriptor',
  };
  if (rank <= 5) return labels[rank];
  return `${ordinal(Math.min(rank, 10))} mejor suscriptor`;
}

function emptyGeneralDraft(rank: number): PrizeDraft {
  return {
    localId: genLocalId(),
    persistedId: null,
    category: 'general_ranking',
    rank,
    label: '',
    description: '',
    amount: '',
    currency: 'USD',
  };
}

function emptySubDraft(rank: number): PrizeDraft {
  return {
    localId: genLocalId(),
    persistedId: null,
    category: 'subscriber_bonus',
    rank,
    label: '',
    description: '',
    amount: '',
    currency: 'USD',
  };
}

function nextAvailableRank(drafts: PrizeDraft[]): number {
  const taken = new Set(drafts.map((d) => d.rank));
  let r = 1;
  while (taken.has(r)) r++;
  return r;
}

function toDrafts(p: Prize): PrizeDraft[] {
  const category: PrizeCategory = p.eligibility_type === 'subscribers' ? 'subscriber_bonus' : 'general_ranking';
  const quantity = p.quantity;
  const start = p.eligible_rank_start;

  if (quantity === 1) {
    return [{
      localId: `migrated_${p.id}`,
      persistedId: p.id,
      category,
      rank: start,
      label: p.label,
      description: p.description ?? '',
      amount: p.amount != null ? String(p.amount) : '',
      currency: p.currency ?? 'USD',
    }];
  }

  const drafts: PrizeDraft[] = [];
  for (let i = 0; i < quantity; i++) {
    drafts.push({
      localId: i === 0 ? `migrated_${p.id}` : genLocalId(),
      persistedId: i === 0 ? p.id : null,
      category,
      rank: start + i,
      label: i === 0 ? p.label : `${p.label} (Top ${start + i})`,
      description: p.description ?? '',
      amount: p.amount != null ? String(p.amount) : '',
      currency: p.currency ?? 'USD',
    });
  }
  return drafts;
}

type FlatPrizeError = {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
  operation: string | null;
};

function getSaveErrorUserMessage(error: FlatPrizeError): string {
  if (!error || !error.message) {
    return 'No pudimos guardar los premios. La configuración no se perdió.';
  }
  if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('row-level security')) {
    return 'No tienes permisos para modificar los premios de este Pick\u2019em.';
  }
  if (error.code === '23505') {
    return 'Ya existe un premio con esa configuración. Revisa los datos e inténtalo nuevamente.';
  }
  if (error.code === '23514') {
    return 'Algunos valores no son válidos para los premios. Revisa la configuración.';
  }
  if (error.code === '23503') {
    return 'Referencia inválida. El evento podría haber sido eliminado.';
  }
  if (error.code === 'PGRST204' || error.message.includes('schema cache') || error.message.includes('column does not exist') || error.message.includes('PGRST')) {
    if (process.env.NODE_ENV === 'development') {
      return 'La estructura de premios no está actualizada en la base de datos.';
    }
    return 'No pudimos guardar los premios por un problema de configuración.';
  }
  if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.';
  }
  return 'No pudimos guardar los premios. La configuración no se perdió.';
}

function validateAmount(v: string): string | null {
  if (!v.trim()) return null;
  const n = Number(v);
  if (isNaN(n)) return 'El monto debe ser un número válido.';
  if (n < 0) return 'El monto no puede ser negativo.';
  return null;
}

function validateCurrency(v: string, amount: string): string | null {
  if (amount.trim() && !v.trim()) return 'La moneda es obligatoria cuando existe un monto.';
  return null;
}

function validateGeneral(d: PrizeDraft, allGeneral: PrizeDraft[]): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!d.label.trim()) errs.label = 'El nombre del premio es obligatorio.';
  if (!Number.isInteger(d.rank) || d.rank < 1) errs.rank = 'La posición debe ser al menos 1.';
  const dup = allGeneral.find((p) => p.rank === d.rank && p.localId !== d.localId);
  if (dup) errs.rank = 'Esta posición ya está asignada a otro premio.';
  const amtErr = validateAmount(d.amount);
  if (amtErr) errs.amount = amtErr;
  const curErr = validateCurrency(d.currency, d.amount);
  if (curErr) errs.currency = curErr;
  return errs;
}

function validateSub(d: PrizeDraft, allSub: PrizeDraft[]): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!d.label.trim()) errs.label = 'El nombre del beneficio es obligatorio.';
  if (!Number.isInteger(d.rank) || d.rank < 1) errs.rank = 'La posición debe ser al menos 1.';
  const dup = allSub.find((p) => p.rank === d.rank && p.localId !== d.localId);
  if (dup) errs.rank = 'Esta posición ya está asignada a otro beneficio.';
  const amtErr = validateAmount(d.amount);
  if (amtErr) errs.amount = amtErr;
  const curErr = validateCurrency(d.currency, d.amount);
  if (curErr) errs.currency = curErr;
  return errs;
}

function PrizeDeleteDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/80"
          >
            {title}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrizeCard({
  draft,
  expanded,
  localErrors,
  onChange,
  onDelete,
  onToggleExpanded,
  onDone,
  onCancel,
}: {
  draft: PrizeDraft;
  expanded: boolean;
  localErrors: Record<string, string>;
  onChange: (d: PrizeDraft) => void;
  onDelete: () => void;
  onToggleExpanded: () => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const isNew = !draft.persistedId;
  const hasAmount = draft.amount.trim().length > 0;

  const positionLabel = draft.category === 'general_ranking'
    ? `Top ${draft.rank}`
    : subscriberRankLabel(draft.rank);

  return (
    <>
      <div
        className={`rounded-xl border bg-surface transition-colors ${
          Object.keys(localErrors).length > 0 ? 'border-danger/50' : 'border-border'
        } ${expanded ? 'shadow-sm' : ''}`}
      >
        {!expanded ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex w-full items-start gap-3 px-4 py-3 text-left"
          >
            <span className="shrink-0 rounded-md bg-purple-primary/10 px-2.5 py-1 text-sm font-bold text-purple-primary">
              {positionLabel}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-text-primary">
                {draft.label || 'Nuevo premio'}
              </span>
              <span className="truncate text-xs text-text-muted">
                {CATEGORY_LABELS[draft.category]}
                {draft.amount && draft.currency ? ` · Valor estimado: ${draft.amount} ${draft.currency}` : ''}
              </span>
            </div>
            <svg className="mt-1 size-4 shrink-0 text-text-muted" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <div className="px-4 py-4">
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  {draft.category === 'general_ranking' ? 'Posición premiada' : 'Posición entre suscriptores'}
                  <span className="text-danger"> *</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={draft.rank}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    onChange({ ...draft, rank: isNaN(v) || v < 1 ? 1 : v });
                  }}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:border-purple-primary focus:outline-none"
                />
                {localErrors.rank && <p className="mt-1 text-xs text-danger">{localErrors.rank}</p>}
                <p className="mt-1 text-xs text-text-muted">
                  {draft.category === 'general_ranking'
                    ? 'Este premio se asignará a quien ocupe esta posición en la clasificación final.'
                    : 'Se toma la posición del participante únicamente entre los suscriptores verificados.'}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Nombre del premio <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={draft.label}
                  onChange={(e) => onChange({ ...draft, label: e.target.value })}
                  placeholder={draft.category === 'general_ranking' ? 'Ej. Primer lugar, Gift card de $50' : 'Ej. 3 meses de suscripción'}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
                />
                {localErrors.label && <p className="mt-1 text-xs text-danger">{localErrors.label}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Descripción <span className="text-text-muted">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={draft.description}
                  onChange={(e) => onChange({ ...draft, description: e.target.value })}
                  placeholder="Ej. Gift card canjeable en Riot Games"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Valor estimado <span className="text-text-muted">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={draft.amount}
                    onChange={(e) => onChange({ ...draft, amount: e.target.value })}
                    placeholder="25.00"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
                  />
                  {localErrors.amount && <p className="mt-1 text-xs text-danger">{localErrors.amount}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Moneda
                  </label>
                  <select
                    value={draft.currency}
                    onChange={(e) => onChange({ ...draft, currency: e.target.value })}
                    disabled={!hasAmount}
                    className={`w-full rounded-lg border bg-bg px-3 py-2 text-sm text-text-primary focus:border-purple-primary focus:outline-none ${
                      hasAmount ? 'border-border' : 'border-border/50 text-text-muted'
                    }`}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {localErrors.currency && <p className="mt-1 text-xs text-danger">{localErrors.currency}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isNew) {
                        setShowDiscardConfirm(true);
                      } else {
                        onCancel();
                      }
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
                  >
                    Cancelar cambios
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
                  >
                    Eliminar
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onDone}
                  className="rounded-lg bg-purple-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-text-primary">Descartar este premio</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Los datos introducidos en este premio se perderán.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
              >
                Seguir editando
              </button>
              <button
                type="button"
                onClick={() => { setShowDiscardConfirm(false); onCancel(); }}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/80"
              >
                Descartar premio
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PrizeBlock({
  category,
  drafts,
  expandedLocalId,
  errors,
  readOnly,
  disableAdd,
  emptyStateOverride,
  onToggle,
  onChange,
  onDone,
  onCancel,
  onDelete,
  onAdd,
}: {
  category: PrizeCategory;
  drafts: PrizeDraft[];
  expandedLocalId: string | null;
  errors: Record<string, Record<string, string>>;
  readOnly?: boolean;
  disableAdd?: boolean;
  emptyStateOverride?: ReactNode;
  onToggle: (localId: string) => void;
  onChange: (d: PrizeDraft) => void;
  onDone: (localId: string) => void;
  onCancel: (localId: string) => void;
  onDelete: (localId: string) => void;
  onAdd: () => void;
}) {
  const sorted = useMemo(() => [...drafts].sort((a, b) => a.rank - b.rank), [drafts]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{CATEGORY_LABELS[category]}</h3>
        <p className="mt-0.5 text-xs text-text-muted">{CATEGORY_DESCRIPTIONS[category]}</p>
      </div>

      {sorted.length === 0 ? (
        emptyStateOverride ?? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-6 text-center">
            <p className="text-sm text-text-secondary">
              {category === 'general_ranking'
                ? 'No has configurado premios para la clasificación general.'
                : 'No has configurado beneficios exclusivos para suscriptores.'}
            </p>
            {!readOnly && !disableAdd && (
              <button
                type="button"
                onClick={onAdd}
                className="mt-3 rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
              >
                {category === 'general_ranking' ? 'Agregar premio para Top 1' : 'Agregar beneficio para el mejor sub'}
              </button>
            )}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((d) => (
            <div key={d.localId} data-prize-id={d.localId}>
              <PrizeCard
                draft={d}
                expanded={expandedLocalId === d.localId}
                localErrors={errors[d.localId] ?? {}}
                onChange={onChange}
                onDelete={() => onDelete(d.localId)}
                onToggleExpanded={() => onToggle(d.localId)}
                onDone={() => onDone(d.localId)}
                onCancel={() => onCancel(d.localId)}
              />
              {expandedLocalId === d.localId && (
                <input
                  data-prize-input={d.localId}
                  type="text"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
          {!disableAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface/50 px-4 py-3 text-sm font-medium text-purple-primary transition-colors hover:bg-surface-hover hover:border-purple-primary/50"
            >
              {category === 'general_ranking' ? '+ Agregar posición premiada' : '+ Agregar beneficio para subs'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PrizeSectionInner({
  eventId,
  initialPrizes,
  initialStackingPolicy,
  twitchStatus = 'loading',
  readOnly = false,
}: {
  eventId: string;
  initialPrizes: Prize[];
  initialStackingPolicy: PrizeStackingPolicy;
  twitchStatus?: TwitchVerificationStatus;
  readOnly?: boolean;
}) {
  const initGeneral = useMemo(() => {
    const result: PrizeDraft[] = [];
    for (const p of initialPrizes) {
      const draftList = toDrafts(p);
      for (const d of draftList) {
        if (d.category === 'general_ranking') result.push(d);
      }
    }
    result.sort((a, b) => a.rank - b.rank);
    return result;
  }, [initialPrizes]);

  const initSub = useMemo(() => {
    const result: PrizeDraft[] = [];
    for (const p of initialPrizes) {
      const draftList = toDrafts(p);
      for (const d of draftList) {
        if (d.category === 'subscriber_bonus') result.push(d);
      }
    }
    result.sort((a, b) => a.rank - b.rank);
    return result;
  }, [initialPrizes]);

  const [generalPrizes, setGeneralPrizes] = useState<PrizeDraft[]>(initGeneral);
  const [subPrizes, setSubPrizes] = useState<PrizeDraft[]>(initSub);
  const [stackingPolicy, setStackingPolicy] = useState<PrizeStackingPolicy>(initialStackingPolicy);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastServerError, setLastServerError] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [expandedLocalId, setExpandedLocalId] = useState<string | null>(null);
  const originalsRef = useRef<Map<string, PrizeDraft>>(new Map());

  const totalCount = generalPrizes.length + subPrizes.length;
  const isTwitchActive = twitchStatus === 'active';
  const isTwitchLoading = twitchStatus === 'loading';
  const isTwitchBlocked = !readOnly && !isTwitchActive && !isTwitchLoading;

  const markDirty = useCallback(() => { setDirty(true); setSaved(false); }, []);

  const expandAndFocus = useCallback((localId: string) => {
    setExpandedLocalId(localId);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-prize-id="${localId}"]`);
      el?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
      requestAnimationFrame(() => {
        const input = document.querySelector(`[data-prize-input="${localId}"]`) as HTMLInputElement | null;
        input?.focus({ preventScroll: true });
      });
    });
  }, []);

  const handleToggle = useCallback(
    (localId: string) => {
      setExpandedLocalId((prev) => {
        if (prev === localId) return null;
        const allDrafts = [...generalPrizes, ...subPrizes];
        if (!originalsRef.current.has(localId)) {
          const draft = allDrafts.find((p) => p.localId === localId);
          if (draft) {
            originalsRef.current.set(localId, cloneDraft(draft));
          }
        }
        return localId;
      });
    },
    [generalPrizes, subPrizes],
  );

  const handleChange = useCallback(
    (d: PrizeDraft) => {
      markDirty();
      if (d.category === 'general_ranking') {
        setGeneralPrizes((prev) => prev.map((p) => (p.localId === d.localId ? d : p)));
      } else {
        setSubPrizes((prev) => prev.map((p) => (p.localId === d.localId ? d : p)));
      }
      setErrors((prev) => {
        const next = { ...prev };
        delete next[d.localId];
        return next;
      });
      setFormError(null);
    },
    [markDirty],
  );

  const handleDelete = useCallback(
    (localId: string) => {
      markDirty();
      if (generalPrizes.some((p) => p.localId === localId)) {
        setGeneralPrizes((prev) => prev.filter((p) => p.localId !== localId));
      } else {
        setSubPrizes((prev) => prev.filter((p) => p.localId !== localId));
      }
      setExpandedLocalId((prev) => prev === localId ? null : prev);
    },
    [markDirty, generalPrizes],
  );

  const handleDone = useCallback(
    (localId: string) => {
      const allDrafts = [...generalPrizes, ...subPrizes];
      const draft = allDrafts.find((p) => p.localId === localId);
      if (!draft) return;

      const errs = draft.category === 'general_ranking'
        ? validateGeneral(draft, generalPrizes)
        : validateSub(draft, subPrizes);

      if (Object.keys(errs).length > 0) {
        setErrors((prev) => ({ ...prev, [localId]: errs }));
        return;
      }

      setErrors((prev) => {
        const next = { ...prev };
        delete next[localId];
        return next;
      });
      originalsRef.current.set(localId, cloneDraft(draft));
      setExpandedLocalId(null);
    },
    [generalPrizes, subPrizes],
  );

  const handleCancel = useCallback(
    (localId: string) => {
      const original = originalsRef.current.get(localId);
      if (original) {
        if (original.category === 'general_ranking') {
          setGeneralPrizes((prev) => prev.map((p) => (p.localId === localId ? cloneDraft(original) : p)));
        } else {
          setSubPrizes((prev) => prev.map((p) => (p.localId === localId ? cloneDraft(original) : p)));
        }
      } else {
        setGeneralPrizes((prev) => prev.filter((p) => p.localId !== localId));
        setSubPrizes((prev) => prev.filter((p) => p.localId !== localId));
      }
      setExpandedLocalId(null);
    },
    [],
  );

  const handleAddGeneral = useCallback(() => {
    markDirty();
    const rank = nextAvailableRank(generalPrizes);
    const draft = emptyGeneralDraft(rank);
    setGeneralPrizes((prev) => [...prev, draft]);
    expandAndFocus(draft.localId);
  }, [markDirty, generalPrizes, expandAndFocus]);

  const handleAddSub = useCallback(() => {
    markDirty();
    const rank = nextAvailableRank(subPrizes);
    const draft = emptySubDraft(rank);
    setSubPrizes((prev) => [...prev, draft]);
    expandAndFocus(draft.localId);
  }, [markDirty, subPrizes, expandAndFocus]);

  const handleAddTop1 = useCallback(() => {
    markDirty();
    const draft = emptyGeneralDraft(1);
    setGeneralPrizes((prev) => [...prev, draft]);
    expandAndFocus(draft.localId);
  }, [markDirty, expandAndFocus]);

  const handleSave = useCallback(async () => {
    const allErrors: Record<string, Record<string, string>> = {};
    let hasError = false;

    for (const d of generalPrizes) {
      const errs = validateGeneral(d, generalPrizes);
      if (Object.keys(errs).length > 0) {
        allErrors[d.localId] = errs;
        hasError = true;
      }
    }
    for (const d of subPrizes) {
      const errs = validateSub(d, subPrizes);
      if (Object.keys(errs).length > 0) {
        allErrors[d.localId] = errs;
        hasError = true;
      }
    }

    setErrors(allErrors);
    if (hasError) {
      const firstErrorId = Object.keys(allErrors)[0];
      if (firstErrorId) {
        setExpandedLocalId(firstErrorId);
        expandAndFocus(firstErrorId);
      }
      setFormError('Revisa los premios incompletos antes de guardar.');
      return;
    }

    if (subPrizes.length > 0 && isTwitchBlocked) {
      setExpandedLocalId(subPrizes[0].localId);
      expandAndFocus(subPrizes[0].localId);
      setFormError('Activa la verificaci\u00f3n de Twitch antes de guardar beneficios para suscriptores.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const sortedGeneral = [...generalPrizes].sort((a, b) => a.rank - b.rank);
      const sortedSub = [...subPrizes].sort((a, b) => a.rank - b.rank);

      const payload: Array<{
        clientId: string;
        id?: string;
        label: string;
        description: string | null;
        amount: number | null;
        currency: string;
        quantity: number;
        eligibility_type: string;
        prize_category: string;
        eligible_rank_start: number;
        sort_order: number;
        assignment_method: string;
      }> = [];

      for (const d of sortedGeneral) {
        payload.push({
          clientId: d.localId,
          id: d.persistedId ?? undefined,
          label: d.label.trim(),
          description: d.description || null,
          amount: d.amount ? Number(d.amount) : null,
          currency: d.currency,
          quantity: 1,
          eligibility_type: 'all',
          prize_category: 'general_ranking',
          eligible_rank_start: d.rank,
          sort_order: d.rank,
          assignment_method: 'ranking',
        });
      }
      for (const d of sortedSub) {
        payload.push({
          clientId: d.localId,
          id: d.persistedId ?? undefined,
          label: d.label.trim(),
          description: d.description || null,
          amount: d.amount ? Number(d.amount) : null,
          currency: d.currency,
          quantity: 1,
          eligibility_type: 'subscribers',
          prize_category: 'subscriber_bonus',
          eligible_rank_start: d.rank,
          sort_order: 1000 + d.rank,
          assignment_method: 'ranking',
        });
      }

      const rawResult = await updateEventPrizes(eventId, payload, stackingPolicy);

      if (!rawResult || typeof rawResult !== 'object' || typeof rawResult.success !== 'boolean') {
        console.error('[prizes/save:client] Invalid server response', { rawResult, eventId });
        setFormError('No pudimos guardar los premios. La respuesta del servidor no fue válida.');
        return;
      }

      const result = rawResult as { success: boolean; saved?: Array<{ clientId: string; id: string }>; errorMessage?: string | null; errorCode?: string | null; errorDetails?: string | null; errorHint?: string | null; errorOperation?: string | null };

      if (!result.success) {
        const errorInfo = {
          message: result.errorMessage ?? 'Error desconocido',
          code: result.errorCode ?? null,
          details: result.errorDetails ?? null,
          hint: result.errorHint ?? null,
          operation: result.errorOperation ?? null,
        };
        console.error('[prizes/save:client] Failed to save prizes', {
          ...errorInfo,
          eventId,
          prizeCount: payload.length,
        });
        setLastServerError(errorInfo as unknown as Record<string, unknown>);
        setFormError(getSaveErrorUserMessage(errorInfo));
        return;
      }

      setLastServerError(null);
      if (result.saved) {
        const savedMap = new Map(result.saved.map((s: { clientId: string; id: string }) => [s.clientId, s.id]));
        setGeneralPrizes((prev) => prev.map((d) => {
          const dbId = savedMap.get(d.localId);
          return dbId ? { ...d, persistedId: dbId } : d;
        }));
        setSubPrizes((prev) => prev.map((d) => {
          const dbId = savedMap.get(d.localId);
          return dbId ? { ...d, persistedId: dbId } : d;
        }));
      }
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const serialized = { message: err instanceof Error ? err.message : 'Error desconocido', code: 'UNEXPECTED' as const, details: null as string | null, hint: null as string | null, operation: null as string | null };
      console.error('[prizes/save:client] Unexpected error saving prizes', serialized);
      setFormError(getSaveErrorUserMessage(serialized));
    } finally {
      setSaving(false);
    }
  }, [eventId, generalPrizes, subPrizes, stackingPolicy, expandAndFocus, isTwitchBlocked]);

  const handleStackingChange = useCallback(
    (policy: PrizeStackingPolicy) => {
      setStackingPolicy(policy);
      setDirty(true);
    },
    [],
  );

  const completedGeneral = generalPrizes.filter((d) => {
    const e = errors[d.localId];
    return !e || Object.keys(e).length === 0;
  }).length;
  const completedSub = subPrizes.filter((d) => {
    const e = errors[d.localId];
    return !e || Object.keys(e).length === 0;
  }).length;
  const totalIncomplete = totalCount - (completedGeneral + completedSub);

  let summaryText: string;
  if (totalCount === 0) {
    summaryText = 'Sin premios configurados';
  } else if (totalIncomplete === 0) {
    const parts: string[] = [];
    if (generalPrizes.length > 0) {
      parts.push(`${generalPrizes.length} premio${generalPrizes.length !== 1 ? 's' : ''} general${generalPrizes.length !== 1 ? 'es' : ''}`);
    }
    if (subPrizes.length > 0) {
      parts.push(`${subPrizes.length} beneficio${subPrizes.length !== 1 ? 's' : ''} para subs`);
    }
    summaryText = parts.join(' · ');
  } else {
    summaryText = `${totalCount} premio${totalCount !== 1 ? 's' : ''} · ${totalCount - totalIncomplete} configurado${totalCount - totalIncomplete !== 1 ? 's' : ''} · ${totalIncomplete} incompleto${totalIncomplete !== 1 ? 's' : ''}`;
  }

  return (
    <div className="flex flex-col gap-6">
      {!readOnly && (
        <p className="text-xs text-text-secondary">
          Configura las recompensas de la clasificación y los beneficios exclusivos para tus suscriptores.
        </p>
      )}

      {/* General ranking block */}
      <PrizeBlock
        category="general_ranking"
        drafts={generalPrizes}
        expandedLocalId={expandedLocalId}
        errors={errors}
        readOnly={readOnly}
        onToggle={handleToggle}
        onChange={handleChange}
        onDone={handleDone}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onAdd={handleAddGeneral}
      />

      <hr className="border-border" />

      {/* Subscriber bonus block */}
      <div className="flex flex-col gap-3">
        {!readOnly && isTwitchBlocked && subPrizes.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-bg px-4 py-3">
            <svg className="mt-0.5 size-4 shrink-0 text-warning" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 11.5C8.41421 11.5 8.75 11.1642 8.75 10.75C8.75 10.3358 8.41421 10 8 10C7.58579 10 7.25 10.3358 7.25 10.75C7.25 11.1642 7.58579 11.5 8 11.5Z" fill="currentColor" />
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-warning">Verificación de Twitch requerida</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Los beneficios para suscriptores no estarán disponibles hasta que actives la verificación.
              </p>
            </div>
            <a
              href="/settings"
              className="shrink-0 rounded-lg border border-warning-border px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/20"
            >
              Configurar Twitch
            </a>
          </div>
        )}

        <PrizeBlock
          category="subscriber_bonus"
          drafts={subPrizes}
          expandedLocalId={expandedLocalId}
          errors={errors}
          readOnly={readOnly}
          disableAdd={!readOnly && isTwitchBlocked}
          emptyStateOverride={!readOnly && isTwitchBlocked && subPrizes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-surface-hover">
                <svg className="size-5 text-text-muted" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="1" width="10" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6 6L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M6 9L10 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-3 text-sm text-text-secondary">
                Activa la verificación de suscriptores de Twitch para ofrecer beneficios exclusivos.
              </p>
              <a
                href="/settings"
                className="mt-3 rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
              >
                Configurar Twitch
              </a>
            </div>
          ) : undefined}
          onToggle={handleToggle}
          onChange={handleChange}
          onDone={handleDone}
          onCancel={handleCancel}
          onDelete={handleDelete}
          onAdd={handleAddSub}
        />
      </div>

      {/* Stacking policy — only shown when both categories have prizes */}
      {!readOnly && generalPrizes.length > 0 && subPrizes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-text-secondary">¿Un suscriptor puede ganar ambos tipos de premio?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              { value: 'allow_multiple_prizes' as PrizeStackingPolicy, label: 'Sí, puede recibir ambos', desc: 'Un suscriptor puede ganar un premio general y además recibir su beneficio exclusivo.' },
              { value: 'single_prize_per_participant' as PrizeStackingPolicy, label: 'No, pasar el beneficio al siguiente sub', desc: 'Si un suscriptor ya ganó un premio general, el beneficio exclusivo se asigna al siguiente suscriptor mejor clasificado.' },
            ]).map((opt) => {
              const selected = stackingPolicy === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStackingChange(opt.value)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? 'border-purple-border bg-purple-surface'
                      : 'border-border bg-surface hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                        selected ? 'border-purple-primary' : 'border-text-muted'
                      }`}
                    >
                      {selected && <span className="size-2 rounded-full bg-purple-primary" />}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${selected ? 'text-purple-primary' : 'text-text-primary'}`}>
                        {opt.label}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary bar */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-text-muted">{summaryText}</p>
        </div>
      )}

      {/* Form-level error */}
      {formError && (
        <div className="flex items-start gap-3 rounded-xl border border-danger-border bg-danger/5 px-4 py-3" role="alert">
          <svg className="mt-0.5 size-4 shrink-0 text-danger" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 11.5C8.41421 11.5 8.75 11.1642 8.75 10.75C8.75 10.3358 8.41421 10 8 10C7.58579 10 7.25 10.3358 7.25 10.75C7.25 11.1642 7.58579 11.5 8 11.5Z" fill="currentColor" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger">No pudimos guardar los premios.</p>
            <p className="mt-0.5 text-xs text-text-muted">{formError}</p>
          </div>
          <button
            type="button"
            onClick={() => { setFormError(null); setLastServerError(null); }}
            className="shrink-0 rounded-lg border border-danger-border px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
          >
            Reintentar
          </button>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && lastServerError && (
        <pre className="overflow-auto rounded-lg border border-danger-border bg-danger/5 p-3 text-[11px] leading-relaxed text-text-muted">
          {JSON.stringify(lastServerError, null, 2)}
        </pre>
      )}

      {/* Save */}
      {!readOnly && totalCount > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="self-start rounded-lg bg-purple-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar premios'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none">
                <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Premios guardados correctamente.
            </span>
          )}
          {dirty && <span className="text-xs text-warning">Cambios sin guardar</span>}
        </div>
      )}
    </div>
  );
}

export function PrizeSection(props: {
  eventId: string;
  initialPrizes: Prize[];
  initialStackingPolicy: PrizeStackingPolicy;
  twitchStatus?: TwitchVerificationStatus;
  readOnly?: boolean;
}) {
  return <PrizeSectionInner {...props} />;
}
