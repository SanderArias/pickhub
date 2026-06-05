'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signInWithTwitch } from '@/app/actions/auth';
import { submitPredictions } from '@/app/actions/participant';
import type { PublicEventData, EventPlayer, PredictionQuestion, Prize, Submission } from '@/app/actions/participant';
import { PredictionSelectionExpandable } from '@/components/pickem/PredictionSelectionExpandable';

function PlayerChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
      <span className="size-1.5 rounded-full bg-purple-primary" />
      {name}
    </span>
  );
}

export function PublicPickemView({
  event,
  players,
  predictions,
  prizes,
  mySubmission,
  myScore,
  isAuthenticated,
  isClosed,
}: {
  event: PublicEventData;
  players: EventPlayer[];
  predictions: PredictionQuestion[];
  prizes: Prize[];
  mySubmission: Submission | null;
  myScore: { total_score: number | null; correct_answers: number; total_questions: number } | null;
  isAuthenticated: boolean;
  isClosed: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    submitPredictions.bind(null, event.id),
    { error: null as string | null, success: false },
  );

  const activePlayers = players.filter((p) => p.is_active);
  const hasPrizes = prizes.length > 0;
  const isOpen = event.status === 'open';

  if (state.success) {
    return <SubmissionReceipt event={event} predictions={predictions} players={activePlayers} />;
  }

  return (
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

        {/* Divider */}
        <div className="h-px bg-border" />
      </section>

      {/* Prizes */}
      {hasPrizes && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Premios</h2>
          <div className="flex flex-wrap gap-2">
            {prizes.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-purple-border bg-purple-surface px-3 py-2 text-sm text-purple-primary"
              >
                {p.label}{p.amount !== null ? ` (${p.amount} ${p.currency ?? 'USD'})` : ''}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Players */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Jugadores {activePlayers.length > 0 && <span className="text-text-muted">({activePlayers.length})</span>}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {activePlayers.length > 0
            ? activePlayers.map((p) => <PlayerChip key={p.id} name={p.name} />)
            : <span className="text-sm text-text-muted">Sin jugadores</span>}
        </div>
        <div className="h-px bg-border" />
      </section>

      {/* Unauthenticated CTA */}
      {!isAuthenticated && (
        <section className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="mb-4 text-sm text-text-secondary">
            Inicia sesi&oacute;n con Twitch para participar.
          </p>
          <form action={signInWithTwitch}>
            <button
              type="submit"
              className="rounded-lg bg-purple-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
            >
              Iniciar sesi&oacute;n con Twitch
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
                  <p className="mt-0.5 text-xs text-text-muted">
                    Ordena 8 jugadores del puesto 1 al 8 · Acierto por posición exacta
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-text-muted">
                    {q.points_per_correct} punto{q.points_per_correct !== 1 ? 's' : ''} por acierto
                    {q.question_type === 'single' ? ' · Selección única' : ` · Selecciona hasta ${q.max_selections} opciones`}
                  </p>
                )}
              </legend>

              {isTop8 ? (
                <div className="flex flex-col gap-2">
                  {[1,2,3,4,5,6,7,8].map((pos) => (
                    <div key={pos} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
                        {pos}
                      </span>
                      <select
                        name={`q_${q.id}_${pos}`}
                        required
                        defaultValue=""
                        className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text-primary"
                      >
                        <option value="" disabled>Seleccionar jugador</option>
                        {q.options.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
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
            {pending ? 'Enviando\u2026' : 'Enviar participaci&oacute;n'}
          </button>
        </form>
      )}

      {/* Closed without submission */}
      {isAuthenticated && !mySubmission && isClosed && (
        <section className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">Las predicciones ya est&aacute;n cerradas.</p>
        </section>
      )}

      {/* No predictions configured */}
      {isAuthenticated && !mySubmission && predictions.length === 0 && (
        <section className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">Este Pick&apos;em no tiene predicciones configuradas.</p>
        </section>
      )}

      {/* Already submitted */}
      {isAuthenticated && mySubmission && (
        <section className="flex flex-col gap-6">
          {/* Score card */}
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

          {/* Predictions review */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-4 text-sm font-semibold text-text-primary">Tus predicciones</h3>

            <div className="flex flex-col gap-3">
              {predictions.map((q) => {
                const isTop8 = q.template_type === 'top8_ordered';
                const selected = mySubmission.answers.filter((a) => a.question_id === q.id);

                if (isTop8) {
                  const sorted = [...selected].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                  const labels = sorted.map((s) => ({
                    position: s.position ?? 0,
                    label: q.options.find((o) => o.id === s.option_id)?.label ?? '—',
                  }));
                  return (
                    <PredictionSelectionExpandable
                      key={q.id}
                      eventTitle={event.title}
                      creatorLabel={event.creator?.display_name ?? event.creator?.handle ?? '—'}
                      questionTitle={q.title}
                      selectedLabels={labels.map((l) => l.label)}
                      isSingle={false}
                      isTop8={true}
                    />
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
        </section>
      )}
    </div>
  );
}

function SubmissionReceipt({
  event,
  predictions,
  players,
}: {
  event: PublicEventData;
  predictions: PredictionQuestion[];
  players: EventPlayer[];
}) {
  return (
    <div className="flex flex-col gap-8">
      {/* Success card */}
      <section className="rounded-xl border border-purple-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-purple-primary/20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-purple-primary">Tu Pick&apos;em fue enviado</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Tus predicciones para <strong className="text-text-primary">{event.title}</strong> se guardaron correctamente.
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {predictions.length} predicci&oacute;n{predictions.length !== 1 ? 'es' : ''} respondida{predictions.length !== 1 ? 's' : ''}
        </p>
      </section>

      {/* CTAs */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/pickems/${event.slug}`}
          className="rounded-lg bg-purple-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
        >
          Ver mi comprobante
        </Link>
        <Link
          href="/inicio"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
