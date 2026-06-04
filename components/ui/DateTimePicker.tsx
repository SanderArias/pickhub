'use client';

import { useCallback } from 'react';

function formatDateForInput(dateStr: string) {
  if (!dateStr) return '';
  return dateStr.slice(0, 16);
}

export function DateTimePicker({
  value,
  onChange,
  min,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  name?: string;
}) {
  const dateValue = value ? value.split('T')[0] : '';
  const timeValue = value ? value.split('T')[1]?.slice(0, 5) : '';

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      onChange(`${newDate}T${timeValue || '00:00'}`);
    },
    [timeValue, onChange],
  );

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value;
      onChange(`${dateValue || ''}T${newTime}`);
    },
    [dateValue, onChange],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key.length === 1) {
      e.preventDefault();
    }
  }, []);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="date"
          value={dateValue}
          onChange={handleDateChange}
          onKeyDown={handleKeyDown}
          min={min?.slice(0, 10)}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary caret-transparent focus:border-purple-primary [color-scheme:dark]"
        />
      </div>
      <div className="w-[140px]">
        <input
          type="time"
          value={timeValue}
          onChange={handleTimeChange}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary caret-transparent focus:border-purple-primary [color-scheme:dark]"
        />
      </div>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}

export function DateTimePickerField({
  value,
  onChange,
  min,
  name,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  name?: string;
  error?: string | null;
}) {
  const displayValue = value ? formatDateForInput(value) : '';

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-secondary">
        Fecha y hora de cierre
      </label>
      <DateTimePicker
        value={value}
        onChange={onChange}
        min={min}
        name={name}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {!error && value && displayValue && (
        <p className="mt-1 text-xs text-text-muted">
          Seleccionado: {new Date(displayValue).toLocaleString()}
        </p>
      )}
    </div>
  );
}
