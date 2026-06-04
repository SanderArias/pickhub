'use client';

import { useState, useActionState } from 'react';
import { updatePickemGeneralInfo } from '@/app/actions/creator';
import { DateTimePickerField } from '@/components/ui/DateTimePicker';

export function GeneralInfoSection({
  eventId,
  event,
  isDraft,
}: {
  eventId: string;
  event: { title: string; description: string | null; ends_at: string | null };
  isDraft: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [closureMode, setClosureMode] = useState(event.ends_at ? 'auto' : 'manual');
  const [dateValue, setDateValue] = useState(
    event.ends_at ? new Date(event.ends_at).toISOString().slice(0, 16) : '',
  );
  const [dateError, setDateError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    updatePickemGeneralInfo.bind(null, eventId),
    { error: null as string | null },
  );

  const minDatetime = new Date().toISOString().slice(0, 16);

  const handleDateChange = (v: string) => {
    setDateValue(v);
    setDateError(null);
    if (v) {
      const d = new Date(v);
      if (d <= new Date()) {
        setDateError('La fecha debe ser posterior a la actual.');
      }
    }
  };

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5 text-sm">
          <p>
            <span className="text-text-muted">T&iacute;tulo:</span>{' '}
            <span className="text-text-primary">{event.title}</span>
          </p>
          {event.description && (
            <p>
              <span className="text-text-muted">Descripci&oacute;n:</span>{' '}
              <span className="text-text-primary">{event.description}</span>
            </p>
          )}
          <p>
            <span className="text-text-muted">Cierre de predicciones:</span>{' '}
            <span className="text-text-primary">
              {event.ends_at
                ? new Date(event.ends_at).toLocaleString()
                : 'Manual'}
            </span>
          </p>
        </div>
        {isDraft && (
          <div className="mt-1">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
            >
              Editar informaci&oacute;n
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-secondary">
          T&iacute;tulo
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
          Descripci&oacute;n <span className="text-text-muted">(opcional)</span>
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={event.description ?? ''}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-text-secondary">
          Cierre de predicciones
        </label>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-border-hover">
            <input
              type="radio"
              name="closure_mode"
              value="manual"
              checked={closureMode === 'manual'}
              onChange={() => { setClosureMode('manual'); setDateError(null); }}
              className="mt-0.5 accent-purple-primary"
            />
            <div>
              <span className="text-sm text-text-primary">Manual</span>
              <p className="mt-0.5 text-xs text-text-muted">
                El creador decidir&aacute; cu&aacute;ndo cerrar las predicciones.
              </p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-border-hover">
            <input
              type="radio"
              name="closure_mode"
              value="auto"
              checked={closureMode === 'auto'}
              onChange={() => { setClosureMode('auto'); setDateError(null); }}
              className="mt-0.5 accent-purple-primary"
            />
            <div>
              <span className="text-sm text-text-primary">Autom&aacute;tico</span>
              <p className="mt-0.5 text-xs text-text-muted">
                Las predicciones se cerrar&aacute;n autom&aacute;ticamente en la fecha seleccionada.
              </p>
            </div>
          </label>
        </div>
      </div>

      {closureMode === 'auto' && (
        <DateTimePickerField
          value={dateValue}
          onChange={handleDateChange}
          min={minDatetime}
          name="ends_at"
          error={dateError}
        />
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
          {pending ? 'Guardando\u2026' : 'Guardar cambios'}
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
  );
}
