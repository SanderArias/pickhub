'use client';

import { useState, useMemo } from 'react';

interface CalendarProps {
  value: string;
  onChange: (date: string) => void;
  min?: string;
}

const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[][] = [];
  let row: (number | null)[] = [];
  for (let i = 0; i < first; i++) row.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(d);
    if (row.length === 7) {
      grid.push(row);
      row = [];
    }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null);
    grid.push(row);
  }
  return grid;
}

export function Calendar({ value, onChange, min }: CalendarProps) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const minDate = min ? new Date(min) : null;
  const selected = value ? new Date(value + 'T00:00:00') : null;

  const [viewYear, setViewYear] = useState(() => selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selected?.getMonth() ?? today.getMonth());

  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  function isDisabled(day: number): boolean {
    if (!minDate) return false;
    const d = new Date(viewYear, viewMonth, day);
    return d < minDate;
  }

  function isSelected(day: number): boolean {
    return selected !== null && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day;
  }

  function isToday(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day);
    return d.toISOString().slice(0, 10) === todayStr;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else { setViewMonth((m) => m - 1); }
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else { setViewMonth((m) => m + 1); }
  }

  return (
    <div className="w-[280px] p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-0 disabled:pointer-events-none"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="text-sm font-medium text-text-primary">{MONTHS[viewMonth]} {viewYear}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-[11px] font-medium text-text-muted">{d}</div>
        ))}
        {grid.map((row, ri) =>
          row.map((day, ci) => {
            if (day === null) return <div key={`e-${ri}-${ci}`} />;
            const disabled = isDisabled(day);
            const sel = isSelected(day);
            const tod = isToday(day);
            return (
              <button
                key={`${ri}-${ci}`}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const m = String(viewMonth + 1).padStart(2, '0');
                  const d = String(day).padStart(2, '0');
                  onChange(`${viewYear}-${m}-${d}`);
                }}
                className={`flex size-8 items-center justify-center rounded-md text-xs transition-colors ${
                  sel
                    ? 'bg-purple-primary text-white font-semibold'
                    : tod
                      ? 'border border-purple-primary/50 text-text-primary font-medium'
                      : disabled
                        ? 'text-text-muted/30 cursor-not-allowed'
                        : 'text-text-primary hover:bg-purple-primary/20 hover:text-white'
                }`}
              >
                {day}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
