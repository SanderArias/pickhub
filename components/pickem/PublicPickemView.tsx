'use client';

import { useActionState, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithTwitch } from '@/app/actions/auth';
import { submitPredictions } from '@/app/actions/participant';
import type { PublicEventData, EventPlayer, PredictionQuestion, Prize, Submission } from '@/app/actions/participant';
import type { LeaderboardEntry } from '@/app/actions/leaderboard';
import { PredictionSelectionExpandable } from '@/components/pickem/PredictionSelectionExpandable';
import { Top8DnD } from '@/components/pickem/Top8DnD';
import { Top8Readonly } from '@/components/pickem/Top8Readonly';
import { LeaderboardSection } from '@/components/pickem/LeaderboardSection';
import { ReceiptModal } from '@/components/pickem/ReceiptModal';

export function PublicPickemView({
  event,
  players,
  predictions,
  prizes,
  mySubmission,
  myScore,
  isAuthenticated,
  isClosed,
  participantName,
  leaderboard,
  drawsMap,
  tiebreakerWinners,
  myProfileId,
}: {
  event: PublicEventData;
  players: EventPlayer[];
  predictions: PredictionQuestion[];
  prizes: Prize[];
  mySubmission: Submission | null;
  myScore: { total_score: number | null; correct_answers: number; total_questions: number } | null;
  isAuthenticated: boolean;
  isClosed: boolean;
  participantName?: string;
  leaderboard: LeaderboardEntry[];
  drawsMap: Record<string, number>;
  tiebreakerWinners: string[];
  myProfileId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    submitPredictions.bind(null, event.id),
    { error: null as string | null, success: false, submissionId: null as string | null },
  );

  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  // Redirect to success page on successful submission
  useEffect(() => {
    if (state.success) {
      router.replace(`/pickems/${event.slug}/success`);
    }
  }, [state.success, event.slug, router]);

  const activePlayers = players.filter((p) => p.is_active);

  const rankedPlayers = useMemo(() => {
    const top8Q = predictions.find((q) => q.template_type === 'top8_ordered');
    if (!top8Q || !mySubmission) return [];
    const answers = mySubmission.answers
      .filter((a) => a.question_id === top8Q.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const playerLookup = new Map(activePlayers.map((p) => [p.id, p.country_code]));
    return answers.map((a) => {
      const opt = top8Q.options.find((o) => o.id === a.option_id);
      let countryCode: string | null = null;
      if (opt?.player_id) {
        countryCode = playerLookup.get(opt.player_id) ?? null;
      }
      return {
        position: a.position ?? 0,
        optionId: a.option_id,
        label: opt?.label ?? '—',
        playerId: opt?.player_id ?? null,
        countryCode,
      };
    });
  }, [predictions, mySubmission, activePlayers]);
  const hasPrizes = prizes.length > 0;
  const isOpen = event.status === 'open';

  const resolvedTies = Object.keys(drawsMap).length > 0;

  return state.success ? (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8">
      <div className="flex min-h-[30vh] items-center justify-center">
        <p className="text-sm text-text-muted">Redirigiendo...</p>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="flex flex-col gap-4">
        <div className="relative">
          <div className="pointer-events-none absolute -inset-x-8 -top-8 h-48 bg-gradient-to-b from-purple-primary/[0.04] to-transparent" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <span className={`size-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-text-muted'}`} />
              <span className="text-xs font-medium text-text-secondary">
                {event.status === 'open'
                  ? `Abierto${event.ends_at ? ` · Cierra ${new Date(event.ends_at).toLocaleDateString()}` : ''}`
                  : event.status === 'predictions_closed'
                    ? 'Predicciones cerradas'
                    : event.status === 'completed'
                      ? 'Completado'
                      : 'Cerrado'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">{event.title}</h1>
          </div>
        </div>

        {event.description && (
          <p className="text-sm leading-relaxed text-text-secondary">{event.description}</p>
        )}

        {event.creator && (
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-purple-primary/20 text-xs font-bold text-purple-primary">
              {(event.creator.display_name ?? event.creator.handle ?? '?')[0].toUpperCase()}
            </div>
            <span className="text-sm text-text-secondary">
              {event.creator.display_name ?? event.creator.handle}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
          <span><strong className="text-text-primary">{predictions.length}</strong> predicciones</span>
          <span><strong className="text-text-primary">{activePlayers.length}</strong> jugadores</span>
          {event.ends_at && (
            <span>
              Cierre <strong className="text-text-primary">{new Date(event.ends_at).toLocaleDateString()}</strong>
            </span>
          )}
        </div>

        <div className="h-px bg-border" />
      </section>

      {/* Prizes */}
      {hasPrizes && (() => {
        const subPrizes = prizes.filter((p) => p.tier === 'subscriber');
        const communityPrizes = prizes.filter((p) => p.tier === 'nonsubscriber');

        const PrizeCard = ({ prize, variant }: { prize: Prize; variant: 'sub' | 'community' }) => (
          <div
            className={`inline-flex flex-col gap-0.5 rounded-lg border px-3 py-2 w-fit min-w-[150px] max-w-[220px] ${
              variant === 'sub'
                ? 'border-yellow-600/30 bg-yellow-500/5'
                : 'border-border bg-surface'
            }`}
          >
            {variant === 'sub' ? (
              <p className="text-[11px] font-semibold text-yellow-400 tracking-wide">★ Subs</p>
            ) : (
              <p className="text-[11px] font-medium text-text-secondary">Comunidad</p>
            )}
            {prize.amount !== null && (
              <p className={`text-xs font-bold ${variant === 'sub' ? 'text-yellow-400' : 'text-text-primary'}`}>
                {prize.amount.toLocaleString('es-ES')} {prize.currency ?? 'USD'}
              </p>
            )}
            <p className="text-[11px] text-text-muted">
              {prize.quantity} ganador{prize.quantity !== 1 ? 'es' : ''}
            </p>
          </div>
        );

        return (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Premios</h2>
            <div className="flex flex-wrap items-center gap-2">
              {subPrizes.map((p) => (
                <PrizeCard key={p.id} prize={p} variant="sub" />
              ))}
              {communityPrizes.map((p) => (
                <PrizeCard key={p.id} prize={p} variant="community" />
              ))}
            </div>
          </section>
        );
      })()}

      {/* Unauthenticated CTA */}
      {!isAuthenticated && (
        <section className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="mb-4 text-sm text-text-secondary">
            Inicia sesión con Twitch para participar.
          </p>
          <form action={signInWithTwitch}>
            <button
              type="submit"
              className="rounded-lg bg-purple-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
            >
              Iniciar sesión con Twitch
            </button>
          </form>
        </section>
      )}

      {/* Prediction form */}
      {isAuthenticated && !mySubmission && !isClosed && predictions.length > 0 && (
        <form action={formAction} className="flex flex-col gap-6">
          {predictions.map((q) => {
            const isTop8 = q.template_type === 'top8_ordered';

            return (
            <fieldset key={q.id} className="rounded-xl border border-border bg-surface p-5">
              <legend className="mb-3">
                <h3 className="text-sm font-medium text-text-primary">{q.title}</h3>
                {q.description && (
                  <p className="mt-0.5 text-xs text-text-secondary">{q.description}</p>
                )}
                {isTop8 ? (
                  <div className="mt-0.5 space-y-2">
                    <p className="text-xs text-text-muted">
                      Arrastra los jugadores para crear tu ranking final.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-primary/30 bg-surface px-2 py-1 text-xs">
                        <span className="font-semibold text-purple-primary">+1</span>
                        <span className="text-text-secondary">Jugador dentro del Top 8</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-primary/30 bg-surface px-2 py-1 text-xs">
                        <span className="font-semibold text-purple-primary">+1</span>
                        <span className="text-text-secondary">Posici&oacute;n exacta</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-text-muted">
                    {q.points_per_correct} punto{q.points_per_correct !== 1 ? 's' : ''} por acierto
                    {q.question_type === 'single' ? ' · Selección única' : ` · Selecciona hasta ${q.max_selections} opciones`}
                  </p>
                )}
              </legend>

              {isTop8 ? (
                <Top8DnD
                  questionId={q.id}
                  activePlayers={activePlayers}
                  options={q.options.map((opt) => ({
                    id: opt.id,
                    playerId: opt.player_id ?? null,
                    label: opt.label,
                  }))}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary transition-colors hover:border-border-hover has-[:checked]:border-purple-primary"
                    >
                      {q.question_type === 'single' ? (
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={opt.id}
                          className="accent-purple-primary"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          name={`q_${q.id}`}
                          value={opt.id}
                          className="accent-purple-primary"
                        />
                      )}
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            );
          })}

          {state?.error && (
            <p className="text-sm text-danger">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-lg bg-purple-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
          >
            {pending ? 'Enviando\u2026' : 'Enviar participación'}
          </button>
        </form>
      )}

      {/* Closed without submission */}
      {isAuthenticated && !mySubmission && isClosed && (
        <section className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">Las predicciones ya están cerradas.</p>
        </section>
      )}

      {/* No predictions configured */}
      {isAuthenticated && !mySubmission && predictions.length === 0 && (
        <section className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">Este Pick'em no tiene predicciones configuradas.</p>
        </section>
      )}

      {/* Already submitted */}
      {isAuthenticated && mySubmission && (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Left column — Predictions review */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-text-primary">Tus predicciones</h3>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="shrink-0 rounded-lg border border-purple-primary px-3 py-1.5 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
                >
                  Ver mi comprobante
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {predictions.map((q) => {
                  const isTop8 = q.template_type === 'top8_ordered';
                  const selected = mySubmission.answers.filter((a) => a.question_id === q.id);

                  if (isTop8) {
                    const sorted = [...selected].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                    const ranked = sorted.map((s) => {
                      const opt = q.options.find((o) => o.id === s.option_id);
                      return {
                        position: s.position ?? 0,
                        optionId: s.option_id,
                        label: opt?.label ?? '—',
                        playerId: opt?.player_id ?? null,
                      };
                    });
                    return (
                      <div key={q.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                        <p className="mb-3 text-sm font-semibold text-text-primary">{q.title}</p>
                        <Top8Readonly rankedPlayers={ranked} activePlayers={activePlayers} />
                      </div>
                    );
                  }

                  const selectedLabels = selected
                    .map((s) => q.options.find((o) => o.id === s.option_id)?.label)
                    .filter(Boolean) as string[];

                  return (
                    <PredictionSelectionExpandable
                      key={q.id}
                      eventTitle={event.title}
                      creatorLabel={event.creator?.display_name ?? event.creator?.handle ?? '—'}
                      questionTitle={q.title}
                      selectedLabels={selectedLabels}
                      isSingle={q.question_type === 'single'}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column — Score + Tiebreaker + Leaderboard */}
          <div className="flex flex-col gap-6">
            {myScore && myScore.total_score !== null && (
              <div className="flex items-center gap-6 rounded-xl border border-purple-border bg-purple-surface p-5">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-primary">{myScore.total_score}</p>
                  <p className="text-xs text-text-muted">puntos</p>
                </div>
                <div className="text-sm text-text-secondary">
                  <p>{myScore.correct_answers} aciertos</p>
                  <p>{myScore.total_questions} preguntas</p>
                </div>
              </div>
            )}

            {resolvedTies && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h2 className="text-sm font-semibold text-text-primary">Desempate resuelto</h2>
                </div>

                <div className="rounded-xl border border-green-500/20 bg-green-500/[0.02] p-5">
                  {[...leaderboard]
                    .filter((e) => e.profile_id in drawsMap)
                    .sort((a, b) => (drawsMap[a.profile_id] ?? 0) - (drawsMap[b.profile_id] ?? 0))
                    .map((entry) => {
                      const order = drawsMap[entry.profile_id] ?? 0;
                      const isWinner = order === 1;
                      return (
                        <div key={entry.profile_id} className="flex items-center gap-3 py-1.5">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isWinner ? 'bg-green-500 text-white' : 'bg-surface-hover text-text-muted'
                          }`}>
                            {order}
                          </span>
                          <span className={`text-sm ${
                            isWinner ? 'font-medium text-green-400' : 'text-text-primary'
                          }`}>
                            {entry.display_name ?? 'Participante'}
                          </span>
                          {isWinner && (
                            <span className="shrink-0 rounded-full bg-green-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">
                              Ganador desempate
                            </span>
                          )}
                        </div>
                      );
                    })}
                  <p className="mt-3 text-xs text-text-muted">
                    El desempate fue resuelto mediante sorteo aleatorio.
                  </p>
                </div>
              </section>
            )}

            {leaderboard.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-text-primary">Clasificación</h2>
                <LeaderboardSection entries={leaderboard} myProfileId={myProfileId} tiebreakerWinners={tiebreakerWinners} />
              </div>
            )}
          </div>
        </div>
      )}

      <ReceiptModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        eventTitle={event.title}
        eventSlug={event.slug}
        eventLogoUrl={event.logo_url}
        creatorLabel={event.creator?.display_name ?? event.creator?.handle ?? '—'}
        participantName={participantName ?? '—'}
        submittedAt={mySubmission?.submitted_at ?? null}
        rankedPlayers={rankedPlayers}
      />
    </div>
  );
}
