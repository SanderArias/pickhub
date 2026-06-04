'use client';

import { useState } from 'react';
import { DateTimePickerField } from '@/components/ui/DateTimePicker';

export function ClosureSection() {
  const [mode, setMode] = useState('manual');
  const [dateValue, setDateValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const minDatetime = new Date().toISOString().slice(0, 16);

  const handleDateChange = (v: string) => {
    setDateValue(v);
    setError(null);
    if (mode === 'auto' && v) {
      const d = new Date(v);
      if (d <= new Date()) {
        setError('La fecha debe ser posterior a la actual.');
      }
    }
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text-secondary">
        Cierre de predicciones
      </p>
      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-border-hover">
          <input
            type="radio"
            name="closure_mode"
            value="manual"
            checked={mode === 'manual'}
            onChange={() => { setMode('manual'); setError(null); }}
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
            checked={mode === 'auto'}
            onChange={() => { setMode('auto'); setError(null); }}
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
      {mode === 'auto' && (
        <div className="mt-3">
          <DateTimePickerField
            value={dateValue}
            onChange={handleDateChange}
            min={minDatetime}
            name="ends_at"
            error={error}
          />
          {!dateValue && (
            <p className="mt-1 text-xs text-text-muted">
              Debes seleccionar una fecha y hora para el cierre autom&aacute;tico.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
