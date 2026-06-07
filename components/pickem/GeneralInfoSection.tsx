'use client';

import { useRef, useState, useEffect, useActionState, useTransition } from 'react';
import { updatePickemGeneralInfo, uploadEventLogo, removeEventLogo } from '@/activities/pickem/actions';
import { PredictionCloseScheduler } from '@/components/ui/PredictionCloseScheduler';
import { splitDatetimeForTimezone, detectTimezone } from '@/lib/timezones';

export function GeneralInfoSection({
  eventId,
  event,
  isDraft,
  canManage = true,
}: {
  eventId: string;
  event: { title: string; description: string | null; ends_at: string | null; logo_url: string | null; predictions_close_timezone: string | null };
  isDraft: boolean;
  canManage?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  const initialSchedule = event.ends_at
    ? splitDatetimeForTimezone(event.ends_at, event.predictions_close_timezone)
    : { date: '', time: '', tz: detectTimezone() };

  const [state, formAction, pending] = useActionState(
    updatePickemGeneralInfo.bind(null, eventId),
    { error: null as string | null },
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(event.logo_url);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();
  const [removePending, startRemove] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevPending = useRef(pending);

  // Auto-collapse on successful save
  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      setEditing(false);
    }
    prevPending.current = pending;
  }, [pending, state.error]);

  return (
    <div>
      {/* Read-only summary */}
      <div className="flex flex-col gap-3">
        {event.logo_url && (
          <img
            src={event.logo_url}
            alt="Logo del Pick'em"
            className="h-20 w-20 rounded-lg border border-border object-cover"
          />
        )}
        <div className="flex flex-col gap-1.5 text-sm">
          <p>
            <span className="text-text-muted">Título:</span>{' '}
            <span className="text-text-primary">{event.title}</span>
          </p>
          {event.description && (
            <p>
              <span className="text-text-muted">Descripción:</span>{' '}
              <span className="text-text-primary">{event.description}</span>
            </p>
          )}
          <p>
            <span className="text-text-muted">Cierre de predicciones:</span>{' '}
            <span className="text-text-primary">
              {event.ends_at
                ? `${new Date(event.ends_at).toLocaleString()} (${event.predictions_close_timezone ?? 'UTC'})`
                : 'Manual'}
            </span>
          </p>
        </div>
        {isDraft && canManage && !editing && (
          <div className="mt-1">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
            >
              Editar información
            </button>
          </div>
        )}
      </div>

      {/* Animated editor */}
      <div
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{
          maxHeight: editing ? '3000px' : '0px',
          opacity: editing ? 1 : 0,
        }}
      >
        <div className={editing ? 'mt-4' : ''}>
          <form action={formAction} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
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
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Descripción <span className="text-text-muted">(opcional)</span>
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={event.description ?? ''}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>

            {/* Logo del Pick'em */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Logo del Pick&rsquo;em <span className="text-text-muted">(opcional)</span>
              </label>
              <div className="flex items-start gap-4">
                {logoUrl ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-xs text-text-muted">
                    Sin logo
                  </div>
                )}
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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger transition-colors hover:border-danger/60 disabled:opacity-50"
                    >
                      {removePending ? 'Eliminando…' : 'Eliminar logo'}
                    </button>
                  )}
                </div>
              </div>
              {logoError && (
                <p className="mt-1.5 text-sm text-danger">{logoError}</p>
              )}
              <p className="mt-1.5 text-xs text-text-muted">
                PNG, JPG, WEBP o SVG. M&aacute;ximo 1 MB.
              </p>
            </div>

            <PredictionCloseScheduler
              initialMode={event.ends_at ? 'auto' : 'manual'}
              initialDate={initialSchedule.date}
              initialTime={initialSchedule.time}
              initialTimezone={initialSchedule.tz}
            />

            {state?.error && (
              <p className="text-sm text-danger">{state.error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
              >
                {pending ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
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
