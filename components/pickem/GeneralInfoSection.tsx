'use client';

import { useRef, useState, useEffect, useActionState, useTransition, useId } from 'react';
import { updatePickemGeneralInfo, uploadEventLogo, removeEventLogo } from '@/activities/pickem/actions';
import { PredictionCloseScheduler } from '@/components/ui/PredictionCloseScheduler';
import { splitDatetimeForTimezone, detectTimezone } from '@/lib/timezones';
import { ReceiptTemplateSelector } from '@/components/pickem/ReceiptTemplateSelector';
import type { ReceiptTemplate } from '@/lib/receipt-templates';

const receiptLabel: Record<string, string> = {
  classic: 'Clásico negro',
  gradient: 'Degradado',
};

const templateBadge: Record<string, string> = {
  classic: 'border-border bg-[rgba(255,255,255,0.04)] text-text-secondary',
  gradient: 'border-purple-border bg-purple-primary/10 text-purple-primary',
};

export function GeneralInfoSection({
  eventId,
  event,
  isDraft,
  canManage = true,
}: {
  eventId: string;
  event: { title: string; description: string | null; ends_at: string | null; logo_url: string | null; predictions_close_timezone: string | null; receipt_template?: string | null };
  isDraft: boolean;
  canManage?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  const initialSchedule = event.ends_at
    ? splitDatetimeForTimezone(event.ends_at, event.predictions_close_timezone)
    : { date: '', time: '', tz: detectTimezone() };

  const [descDraft, setDescDraft] = useState(event.description ?? '');
  const descId = useId();
  const [state, formAction, pending] = useActionState(
    updatePickemGeneralInfo.bind(null, eventId),
    { error: null as string | null },
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(event.logo_url);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();
  const [removePending, startRemove] = useTransition();
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate>(
    (event.receipt_template as ReceiptTemplate) ?? 'classic',
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      setEditing(false);
    }
    prevPending.current = pending;
  }, [pending, state.error]);

  const closeMode = event.ends_at
    ? `${new Date(event.ends_at).toLocaleString()} (${event.predictions_close_timezone ?? 'UTC'})`
    : 'Manual';
  const isAuto = event.ends_at !== null;
  const template = (event.receipt_template as ReceiptTemplate) ?? 'classic';

  return (
    <div>
      {/* Summary card */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-xl border border-border bg-[rgba(255,255,255,0.015)] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-[#111113] p-2">
          {event.logo_url ? (
            <img src={event.logo_url} alt="Logo del Pick'em" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Sin logo</span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-text-primary">{event.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
            <span>
              Cierre:{' '}
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                isAuto
                  ? 'border-purple-border bg-purple-primary/10 text-purple-primary'
                  : 'border-[#3f3f46] bg-[rgba(255,255,255,0.04)] text-[#d4d4d8]'
              }`}>
                {isAuto ? 'Automático' : 'Manual'}
              </span>
            </span>
            <span>
              Comprobante:{' '}
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${templateBadge[template]}`}>
                {receiptLabel[template] || 'Clásico negro'}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:justify-self-end">
          {isDraft && canManage && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
            >
              Editar información
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{
          maxHeight: editing ? '3000px' : '0px',
          opacity: editing ? 1 : 0,
        }}
      >
        <div className={editing ? 'mt-7' : ''}>
          <form action={formAction} className="flex flex-col">
            {/* Contenido */}
            <section>
              <h4 className="text-base font-semibold text-text-primary">Contenido</h4>
              <p className="mt-0.5 text-sm text-text-muted">Define cómo se presentará este Pick&rsquo;em a los participantes.</p>
              <div className="mt-5 flex flex-col gap-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-secondary">
                    Título
                  </label>
                  <input
                    name="title"
                    type="text"
                    required
                    defaultValue={event.title}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </div>
                <div>
                  <label htmlFor={descId} className="mb-2 block text-sm font-medium text-text-secondary">
                    Descripción <span className="text-text-muted">(opcional)</span>
                  </label>
                  <textarea
                    id={descId}
                    name="description"
                    rows={3}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    className="min-h-[104px] w-full resize-y rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
                  />
                  <div className="mt-1 flex justify-end">
                    <span className={`text-xs ${descDraft.length > 300 ? 'text-danger' : 'text-text-muted'}`}>
                      {descDraft.length}/300
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Separator */}
            <hr className="my-8 border-border" />

            {/* Identidad visual */}
            <section>
              <h4 className="text-base font-semibold text-text-primary">Identidad visual</h4>
              <p className="mt-0.5 text-sm text-text-muted">Se mostrará en la página del evento y en los comprobantes.</p>
              <div className="mt-5 flex items-center gap-4 rounded-xl border border-border bg-[rgba(255,255,255,0.012)] p-3.5">
                <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-[#111113] p-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Sin logo</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setLogoError(null);
                      if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
                        setLogoError('Formato no soportado. Usa PNG, JPG, WEBP o SVG.');
                        return;
                      }
                      if (file.size > 1_048_576) {
                        setLogoError('El logo no puede superar 1 MB.');
                        return;
                      }
                      const fd = new FormData();
                      fd.set('logo', file);
                      startUpload(async () => {
                        const result = await uploadEventLogo(eventId, null, fd);
                        if (result.error) {
                          setLogoError(result.error);
                        } else if (result.url) {
                          setLogoUrl(result.url);
                        }
                      });
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-border-hover disabled:opacity-50"
                    >
                      {uploadPending ? 'Subiendo…' : 'Subir logo'}
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoError(null);
                          startRemove(async () => {
                            const result = await removeEventLogo(eventId);
                            if (result.error) {
                              setLogoError(result.error);
                            } else {
                              setLogoUrl(null);
                            }
                          });
                        }}
                        disabled={removePending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm text-danger/70 transition-colors hover:border-danger/20 hover:text-danger disabled:opacity-50"
                      >
                        {removePending ? 'Eliminando…' : 'Eliminar'}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">PNG, JPG, WEBP o SVG &middot; M&aacute;ximo 1 MB</p>
                  {logoError && (
                    <p className="text-sm text-danger">{logoError}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Separator */}
            <hr className="my-8 border-border" />

            {/* Comportamiento */}
            <section>
              <h4 className="text-base font-semibold text-text-primary">Comportamiento</h4>
              <p className="mt-0.5 text-sm text-text-muted">Configura cómo y cuándo dejarán de aceptarse predicciones.</p>
              <div className="mt-5">
                <PredictionCloseScheduler
                  initialMode={event.ends_at ? 'auto' : 'manual'}
                  initialDate={initialSchedule.date}
                  initialTime={initialSchedule.time}
                  initialTimezone={initialSchedule.tz}
                />
              </div>
            </section>

            {/* Separator */}
            <hr className="my-8 border-border" />

            {/* Diseño del comprobante */}
            <section>
              <h4 className="text-base font-semibold text-text-primary">Diseño del comprobante</h4>
              <p className="mt-0.5 text-sm text-text-muted">Elige cómo se verá la imagen que compartirán los participantes.</p>
              <div className="mt-5">
                <ReceiptTemplateSelector
                  value={receiptTemplate}
                  onChange={setReceiptTemplate}
                />
                <input type="hidden" name="receipt_template" value={receiptTemplate} />
              </div>
            </section>

            {state?.error && (
              <p className="mt-6 text-sm text-danger">{state.error}</p>
            )}

            {/* Actions bar */}
            <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50 sm:w-auto"
              >
                {pending ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover sm:w-auto"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
