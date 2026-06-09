'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Popover } from '@/components/ui/Popover';
import { Calendar } from '@/components/ui/Calendar';
import { TimezoneCombobox } from '@/components/ui/TimezoneCombobox';
import {
  detectTimezone,
  buildUtcTimestamp,
  formatLocalInTimezone,
  getCountdownText,
  isDateDisabledInTimezone,
  isTimeDisabledInTimezone,
  isValidScheduledClose,
  getMinDateInTimezone,
} from '@/lib/timezones';
import { UI_FEATURES } from '@/config/ui-features';

const HOURS12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'] as const;

function parseTime(time: string): { hour12: number; minute: string; period: 'AM' | 'PM' } {
  if (!time) return { hour12: 12, minute: '00', period: 'AM' };
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour12, minute: String(m).padStart(2, '0'), period: period as 'AM' | 'PM' };
}

function buildTime(hour12: number, minute: string, period: 'AM' | 'PM'): string {
  const h24 = period === 'AM' ? (hour12 === 12 ? 0 : hour12) : (hour12 === 12 ? 12 : hour12 + 12);
  return `${String(h24).padStart(2, '0')}:${minute}`;
}

function formatDateDisplay(date: string): string {
  if (!date) return '';
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PredictionCloseScheduler({
  initialMode,
  initialDate,
  initialTime,
  initialTimezone,
  namePrefix = '',
}: {
  initialMode?: 'manual' | 'auto';
  initialDate?: string;
  initialTime?: string;
  initialTimezone?: string;
  namePrefix?: string;
}) {
  const [mode, setMode] = useState<'manual' | 'auto'>(
    !UI_FEATURES.automaticPredictionClose ? 'manual' : (initialMode ?? 'manual'),
  );
  const [date, setDate] = useState(initialDate ?? '');
  const [time, setTime] = useState(initialTime ?? '');
  const [tz, setTz] = useState(initialTimezone ?? detectTimezone());
  const [error, setError] = useState<string | null>(null);

  const p = (s: string) => (namePrefix ? `${namePrefix}_` : '') + s;

  const { hour12, minute, period } = parseTime(time);

  const minDateStr = useMemo(() => {
    if (mode !== 'auto' || !tz) return undefined;
    return getMinDateInTimezone(tz);
  }, [mode, tz]);

  const isDayDisabled = useCallback(
    (year: number, month: number, day: number) => {
      if (mode !== 'auto' || !tz) return false;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return isDateDisabledInTimezone(dateStr, tz);
    },
    [mode, tz],
  );

  const isHourDisabled = useCallback(
    (h12: number) => {
      if (!date || !tz) return false;
      // Check with a middle-of-the-interval minute to avoid edge cases
      const testTime = buildTime(h12, '30', h12 === 12 ? (hour12 === 12 ? period : PERIODS[0]) : period);
      return isTimeDisabledInTimezone(date, testTime, tz);
    },
    [date, tz, hour12, period],
  );

  const utcIso = useMemo(() => {
    if (!date || !time || !tz || mode !== 'auto') return null;
    return buildUtcTimestamp(date, time, tz);
  }, [date, time, tz, mode]);

  const targetDate = utcIso ? new Date(utcIso) : null;
  const countdown = targetDate ? getCountdownText(targetDate) : null;
  const localInfo = utcIso ? formatLocalInTimezone(utcIso, tz) : null;

  useEffect(() => {
    if (mode === 'manual') { setError(null); return; }
    if (!date) { setError('Selecciona una fecha para programar el cierre.'); return; }
    if (!time) { setError('Selecciona una hora para programar el cierre.'); return; }
    if (!utcIso) { setError('Selecciona una zona horaria.'); return; }
    const targetMs = new Date(utcIso).getTime();
    const nowMs = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    if (targetMs <= nowMs) {
      setError('La fecha y hora deben ser posteriores al momento actual.');
      return;
    }
    if (targetMs - nowMs < twoHours) {
      setError('El cierre automático debe programarse con al menos 2 horas de anticipación.');
      return;
    }
    setError(null);
  }, [mode, date, time, tz, utcIso]);

  function handleTimezoneChange(newTz: string) {
    setTz(newTz);
    setError(null);
    if (date && time && !isValidScheduledClose(date, time, newTz)) {
      setTime('');
    }
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
    setError(null);
    if (time && !isValidScheduledClose(newDate, time, tz)) {
      setTime('');
    }
  }

  function handleTimeChange(newTime: string) {
    if (date && !isValidScheduledClose(date, newTime, tz)) return;
    setTime(newTime);
    setError(null);
  }

  const showSchedule = mode === 'auto';

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text-secondary">Cierre de predicciones</p>
      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-purple-primary/50 has-[:checked]:border-purple-primary">
          <input
            type="radio"
            name={p('closure_mode')}
            value="manual"
            checked={mode === 'manual'}
            onChange={() => { setMode('manual'); setError(null); }}
            className="mt-0.5 accent-purple-primary"
          />
          <div>
            <span className="text-sm text-text-primary">Manual</span>
            <p className="mt-0.5 text-xs text-text-muted">El creador decidirá cuándo cerrar las predicciones.</p>
          </div>
        </label>
        {UI_FEATURES.automaticPredictionClose && (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-purple-primary/50 has-[:checked]:border-purple-primary">
            <input
              type="radio"
              name={p('closure_mode')}
              value="auto"
              checked={mode === 'auto'}
              onChange={() => { setMode('auto'); setError(null); }}
              className="mt-0.5 accent-purple-primary"
            />
            <div>
              <span className="text-sm text-text-primary">Automático</span>
              <p className="mt-0.5 text-xs text-text-muted">Las predicciones se cerrarán automáticamente en la fecha seleccionada.</p>
            </div>
          </label>
        )}
      </div>

      {showSchedule && (
        <div className="mt-3 rounded-xl border border-border bg-surface p-5">
          <p className="mb-0.5 text-sm font-semibold text-text-primary">Programar cierre</p>
          <p className="mb-5 text-xs text-text-muted">Define cuándo se cerrarán automáticamente las predicciones.</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            {/* Date */}
            <div className="sm:col-span-5">
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                Fecha de cierre <span className="text-purple-primary">*</span>
              </label>
              <Popover
                align="start"
                trigger={
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm transition-all hover:border-purple-primary/50"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-muted">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span className={`flex-1 text-left ${date ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                      {date ? formatDateDisplay(date) : 'Seleccionar fecha'}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-muted/60"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                }
              >
                <Calendar value={date} onChange={handleDateChange} isDayDisabled={isDayDisabled} />
              </Popover>
            </div>

            {/* Time */}
            <div className="sm:col-span-4">
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                Hora de cierre <span className="text-purple-primary">*</span>
              </label>
              <Popover
                align="start"
                trigger={
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm transition-all hover:border-purple-primary/50"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-muted">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span className={`flex-1 text-left ${time ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                      {time ? `${hour12}:${minute} ${period}` : 'Seleccionar hora'}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-muted/60"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                }
              >
                <div className="flex gap-3 p-3">
                  {/* Hours */}
                  <div className="flex flex-col gap-0.5">
                    <span className="mb-1 px-2 text-[10px] font-medium text-text-muted">Hora</span>
                    <div className="pickhub-scrollbar flex max-h-[180px] flex-col gap-0.5 overflow-auto pr-1">
                      {HOURS12.map((h) => {
                        const disabled = isHourDisabled(h);
                        return (
                          <button
                            key={h}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleTimeChange(buildTime(h, minute, period))}
                            className={`w-12 rounded-md px-2 py-1 text-center text-xs transition-colors ${
                              hour12 === h
                                ? 'bg-purple-primary text-white font-medium'
                                : disabled
                                  ? 'text-text-muted/30 cursor-not-allowed'
                                  : 'text-text-secondary hover:bg-purple-primary/20 hover:text-white'
                            }`}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Minutes */}
                  <div className="flex flex-col gap-0.5">
                    <span className="mb-1 px-2 text-[10px] font-medium text-text-muted">Min</span>
                    <div className="flex flex-col gap-0.5">
                      {MINUTES.map((m) => {
                        const disabled = isTimeDisabledInTimezone(date, buildTime(hour12, m, period), tz);
                        return (
                          <button
                            key={m}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleTimeChange(buildTime(hour12, m, period))}
                            className={`w-14 rounded-md px-2 py-1 text-center text-xs transition-colors ${
                              minute === m
                                ? 'bg-purple-primary text-white font-medium'
                                : disabled
                                  ? 'text-text-muted/30 cursor-not-allowed'
                                  : 'text-text-secondary hover:bg-purple-primary/20 hover:text-white'
                            }`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Period */}
                  <div className="flex flex-col gap-0.5">
                    <span className="mb-1 px-2 text-[10px] font-medium text-text-muted">Per.</span>
                    <div className="flex flex-col gap-0.5">
                      {PERIODS.map((p) => {
                        const testTime = buildTime(hour12, '30', p);
                        const disabled = isTimeDisabledInTimezone(date, testTime, tz);
                        return (
                          <button
                            key={p}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleTimeChange(buildTime(hour12, minute, p))}
                            className={`w-12 rounded-md px-2 py-1 text-center text-xs transition-colors ${
                              period === p
                                ? 'bg-purple-primary text-white font-medium'
                                : disabled
                                  ? 'text-text-muted/30 cursor-not-allowed'
                                  : 'text-text-secondary hover:bg-purple-primary/20 hover:text-white'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Popover>
            </div>

            {/* Timezone */}
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Zona horaria</label>
              <TimezoneCombobox
                value={tz}
                onChange={handleTimezoneChange}
                targetDate={targetDate ?? undefined}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="mt-5 rounded-lg bg-bg px-4 py-3">
            {mode === 'auto' && localInfo ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-text-primary font-medium">Las predicciones cerrarán:</p>
                <p className="text-xs text-text-primary">{localInfo.date}</p>
                <p className="text-xs text-text-primary">{localInfo.time}</p>
                <p className="text-xs text-text-muted">{localInfo.tzLabel}</p>
                <p className="mt-1 text-[11px] text-text-muted">
                  Equivale a: {localInfo.utcLabel} UTC
                </p>
                {countdown && (
                  <p className="mt-0.5 text-xs text-purple-primary font-medium">{countdown}</p>
                )}
              </div>
            ) : mode === 'auto' && date && time ? (
              <p className="text-xs text-text-muted">
                Selecciona una zona horaria para programar el cierre.
              </p>
            ) : (
              <p className="text-xs text-text-muted">
                Selecciona fecha, hora y zona horaria para programar el cierre.
              </p>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-danger">{error}</p>
          )}
        </div>
      )}

      {showSchedule && date && time && tz && !error && (
        <>
          <input type="hidden" name={p('ends_at')} value={buildUtcTimestamp(date, time, tz)} />
          <input type="hidden" name={p('predictions_close_timezone')} value={tz} />
        </>
      )}
    </div>
  );
}
