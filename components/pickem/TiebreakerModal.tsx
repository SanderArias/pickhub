'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { performTiebreaker } from '@/app/actions/tiebreaker';
import type { TieGroup, TiebreakerDraw } from '@/app/actions/tiebreaker';

interface TiebreakerModalProps {
  group: TieGroup;
  eventId: string;
  onClose: () => void;
  onDone: () => void;
  remainingTiebreakerCount?: number;
}

type Phase = 'idle' | 'rolling' | 'done' | 'error';

export function TiebreakerModal({ group, eventId, onClose, onDone, remainingTiebreakerCount }: TiebreakerModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [finalDraws, setFinalDraws] = useState<TiebreakerDraw[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // ESC key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'idle' || phase === 'done' || phase === 'error') {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, onClose]);

  const sortedFinal = finalDraws
    ? group.participants
        .map((p) => ({
          ...p,
          order: finalDraws.find((d) => d.profile_id === p.profile_id)?.draw_order ?? 0,
        }))
        .sort((a, b) => a.order - b.order)
    : [];

  const startRoll = useCallback(async () => {
    setPhase('rolling');
    setErrorMsg(null);

    const res = await performTiebreaker(eventId, group.score);
    if (res.error || !res.draws) {
      setErrorMsg(res.error ?? 'Error al realizar el sorteo.');
      setPhase('error');
      return;
    }
    setFinalDraws(res.draws);

    const n = group.participants.length;
    const minCycles = 8;
    const totalSteps = Math.max(minCycles * n, 30);
    let step = 0;

    const scheduleNext = () => {
      if (step >= totalSteps) {
        const winnerIdx = group.participants.findIndex(
          (p) => p.profile_id === res.draws![0].profile_id,
        );
        setActiveIndex(winnerIdx >= 0 ? winnerIdx : 0);
        setPhase('done');
        return;
      }

      setActiveIndex(step % n);
      step++;

      // Decelerate: starts at ~60ms, ends at ~400ms
      const progress = step / totalSteps;
      const delay = 60 + progress * progress * 390;

      const id = setTimeout(scheduleNext, delay);
      timersRef.current.push(id);
    };

    const id = setTimeout(scheduleNext, 60);
    timersRef.current.push(id);
  }, [eventId, group, onDone]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        if (phase === 'idle' || phase === 'done' || phase === 'error') {
          onClose();
        }
      }
    },
    [phase, onClose],
  );

  const handleCloseAfterDone = useCallback(() => {
    onClose();
    onDone();
  }, [onClose, onDone]);

  const winner = phase === 'done' && sortedFinal.length > 0 ? sortedFinal[0] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 text-center">
          <h3 className="text-lg font-bold text-text-primary">Sorteo de desempate</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Empate por <span className="font-semibold text-purple-primary">{group.score} pts</span>
          </p>
        </div>

        {/* Participants list */}
        <div className="flex flex-col gap-2">
          {group.participants.map((p, i) => {
            const isActive = activeIndex === i;
            const finalPos = finalDraws
              ? finalDraws.find((d) => d.profile_id === p.profile_id)?.draw_order ?? 0
              : 0;

            return (
              <div
                key={p.profile_id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-100 ${
                  phase === 'done' && finalPos === 1
                    ? 'border-green-500/50 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                    : isActive && phase === 'rolling'
                      ? 'border-purple-primary bg-purple-surface shadow-lg shadow-purple-primary/20 scale-[1.02]'
                      : phase === 'done'
                        ? 'border-border bg-surface'
                        : 'border-border bg-surface'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    phase === 'done' && finalPos === 1
                      ? 'bg-green-500 text-white'
                      : phase === 'done'
                        ? 'bg-surface-hover text-text-muted'
                        : isActive && phase === 'rolling'
                          ? 'bg-purple-primary text-white'
                          : 'bg-surface-hover text-text-muted'
                  }`}
                >
                  {phase === 'done' ? finalPos : '?'}
                </span>

                <span
                  className={`flex-1 font-medium ${
                    phase === 'done' && finalPos === 1
                      ? 'text-green-400'
                      : isActive && phase === 'rolling'
                        ? 'text-purple-primary'
                        : 'text-text-primary'
                  }`}
                >
                  {p.display_name ?? 'Participante'}
                </span>

                {phase === 'done' && finalPos === 1 && (
                  <span className="shrink-0 rounded-full bg-green-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">
                    Ganador desempate
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {phase === 'error' && errorMsg && (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-center">
            <p className="text-sm text-danger">{errorMsg}</p>
          </div>
        )}

        {/* Winner banner */}
        {phase === 'done' && winner && (
          <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-center">
            <p className="text-xs text-text-muted">Ganador del desempate</p>
            <p className="mt-0.5 text-lg font-bold text-green-400">
              {'\uD83C\uDFC6'} {winner.display_name ?? 'Participante'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-center gap-3">
          {phase === 'idle' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={startRoll}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                Iniciar sorteo
              </button>
            </>
          )}

          {phase === 'rolling' && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Realizando sorteo...
            </div>
          )}

          {phase === 'error' && (
            <button
              type="button"
              onClick={() => { setPhase('idle'); setErrorMsg(null); }}
              className="rounded-lg bg-purple-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
            >
              Intentar de nuevo
            </button>
          )}

          {phase === 'done' && (
            <button
              type="button"
              onClick={handleCloseAfterDone}
              className={
                remainingTiebreakerCount !== undefined && remainingTiebreakerCount === 0
                  ? 'rounded-lg bg-purple-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600'
                  : 'rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover'
              }
            >
              {remainingTiebreakerCount !== undefined && remainingTiebreakerCount > 0
                ? `Siguiente desempate (${remainingTiebreakerCount})`
                : remainingTiebreakerCount !== undefined && remainingTiebreakerCount === 0
                  ? 'Finalizar clasificación'
                  : 'Cerrar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
