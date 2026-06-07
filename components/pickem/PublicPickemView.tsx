'use client';

import { useActionState, useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithTwitch } from '@/app/actions/auth';
import { submitPredictions } from '@/app/actions/participant';
import type { PublicEventData, EventPlayer, PredictionQuestion, Prize, Submission } from '@/app/actions/participant';
import type { LeaderboardEntry } from '@/app/actions/leaderboard';
import type { OfficialResultEntry } from '@/activities/pickem/actions/results-data';
import { Top8DnD } from '@/components/pickem/Top8DnD';
import { ReceiptModal } from '@/components/pickem/ReceiptModal';
import { PickemParticipationHero } from '@/components/pickem/PickemParticipationHero';
import { PrizeCarousel } from '@/components/pickem/PrizeCarousel';
import { PredictionIntro } from '@/components/pickem/PredictionIntro';
import { SUBMITTED_PREDICTION_STATUS_CONFIG } from '@/lib/status-config';
import { SubscriberTwitchEligibilityNotice } from '@/components/pickem/SubscriberTwitchEligibilityNotice';
import { checkParticipantTwitchStatus } from '@/app/actions/twitch-status';
import { ParticipantResultsView } from '@/components/completed/ParticipantResultsView';
import type { EnrichedPick } from '@/components/completed/ParticipantMyPicksTab';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  participantName,
  participantTwitchStatus,
  leaderboard,
  tiebreakerWinners,
  myProfileId,
  myEntry,
  wonPrizeIds,
  enrichedPicks,
  officialResults,
  isTiebreakerWinner,
  isTiebreakerLoser,
  hasResolvedTies,
  canParticipate = true,
}: {
  event: PublicEventData;
  players: EventPlayer[];
  predictions: PredictionQuestion[];
  prizes: Prize[];
  mySubmission: Submission | null;
  myScore: { total_score: number | null; correct_answers: number; total_questions: number } | null;
  isAuthenticated: boolean;
  isClosed: boolean;
  canParticipate?: boolean;
  participantName?: string;
  participantTwitchStatus?: 'connected' | 'not_connected';
  leaderboard: LeaderboardEntry[];
  tiebreakerWinners: string[];
  myProfileId?: string | null;
  myEntry: { rank: number; display_name: string | null } | null;
  wonPrizeIds: string[];
  enrichedPicks: EnrichedPick[];
  officialResults: OfficialResultEntry[];
  isTiebreakerWinner: boolean;
  isTiebreakerLoser: boolean;
  hasResolvedTies: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    submitPredictions.bind(null, event.id),
    { error: null as string | null, success: false, submissionId: null as string | null },
  );

  const [showModal, setShowModal] = useState(false);
  const [resolvedTwitchStatus, setResolvedTwitchStatus] = useState(participantTwitchStatus);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [top8Counts, setTop8Counts] = useState<Record<string, number>>({});
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.replace(`/pickems/${event.slug}/success`);
    }
  }, [state.success, event.slug, router]);

  useEffect(() => {
    function handleFocus() {
      checkParticipantTwitchStatus().then(setResolvedTwitchStatus);
    }
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const activePlayers = players.filter((p) => p.is_active);

  const top8Q = predictions.find((q) => q.template_type === 'top8_ordered');
  const subtitle = top8Q ? `TOP ${top8Q.options.length}` : undefined;

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
  const hasTop8 = predictions.some((q) => q.template_type === 'top8_ordered');

  const generalPrizes = useMemo(
    () => [...prizes]
      .filter((p) => p.eligibility_type !== 'subscribers')
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [prizes],
  );

  const subPrizes = useMemo(
    () => [...prizes]
      .filter((p) => p.eligibility_type === 'subscribers')
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [prizes],
  );

  const hasSubscriberBenefits = subPrizes.length > 0;
  const shouldShowTwitchNotice = hasSubscriberBenefits && isAuthenticated && resolvedTwitchStatus === 'not_connected';

  const allTop8Filled = useMemo(() => {
    const top8Questions = predictions.filter((q) => q.template_type === 'top8_ordered');
    if (top8Questions.length === 0) return true;
    return top8Questions.every((q) => (top8Counts[q.id] ?? 0) >= 8);
  }, [predictions, top8Counts]);

  const hasSubmitted = isAuthenticated && !!mySubmission;

  if (state.success) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8">
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-sm text-text-muted">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  /* ===== SUBMITTED VIEW ===== */
  if (hasSubmitted) {
    const isCompleted = event.status === 'completed';
    const statusCopy = SUBMITTED_PREDICTION_STATUS_CONFIG[event.status] ?? SUBMITTED_PREDICTION_STATUS_CONFIG.open;

    return (
      <div className="flex flex-col gap-6">
        {/* Header — status, title, creator, buttons */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex gap-6">
            <div className="min-w-0 flex-1 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {statusCopy.tone === 'warning' ? (
                  <svg className="size-4 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : (
                  <svg className="size-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span className={`text-xs font-medium ${statusCopy.tone === 'warning' ? 'text-warning' : 'text-success'}`}>
                  {statusCopy.label}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-text-primary">{event.title}</h1>

              {event.creator && (
                <div className="flex items-center gap-2">
                  {event.creator.avatar_url ? (
                    <img src={event.creator.avatar_url} alt="" className="size-6 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded-full bg-purple-primary/20 text-[11px] font-bold text-purple-primary">
                      {(event.creator.display_name ?? event.creator.handle ?? '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-text-secondary">
                    Organizado por {event.creator.display_name ?? event.creator.handle}
                  </span>
                </div>
              )}

              <p className="text-sm text-text-secondary mt-1">
                {statusCopy.description}
              </p>
              <p className="text-xs text-text-muted">
                {event.status === 'open' && event.ends_at
                  ? `El Pick'em continúa abierto hasta el ${formatDate(event.ends_at)}.`
                  : statusCopy.contextualMessage}
              </p>

              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="rounded-lg border border-purple-primary px-4 py-2 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
                >
                  Ver comprobante
                </button>
              </div>
            </div>

            {event.logo_url && (
              <div className="hidden sm:flex h-[96px] w-[112px] shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface-hover/50 p-[10px]">
                <img
                  src={event.logo_url}
                  alt={`Logo de ${event.title}`}
                  className="h-full w-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* Subscriber eligibility notice */}
        {shouldShowTwitchNotice && <SubscriberTwitchEligibilityNotice />}

        {/* Tabbed results */}
        {isCompleted && (
          <div ref={resultsRef}>
            <ParticipantResultsView
            myEntry={myEntry}
            myScore={myScore}
            isTiebreakerWinner={isTiebreakerWinner}
            isTiebreakerLoser={isTiebreakerLoser}
            hasResolvedTies={hasResolvedTies}
            wonPrizeIds={wonPrizeIds}
            prizes={prizes}
            leaderboard={leaderboard}
            myProfileId={myProfileId ?? undefined}
            tiebreakerWinners={tiebreakerWinners}
            enrichedPicks={enrichedPicks}
            officialResults={officialResults}
          />
          </div>
        )}

        {!isCompleted && (
          <div className="flex flex-col gap-6">
            {/* Scoring rules */}
            {hasTop8 && (
              <section className="flex flex-col gap-1.5">
                <h3 className="text-sm font-semibold text-text-primary">C&oacute;mo se punt&uacute;a</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-primary/30 bg-surface px-2 py-1 text-xs">
                    <span className="font-semibold text-purple-primary">+1</span>
                    <span className="text-text-secondary">Jugador correcto dentro del Top {activePlayers.length}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-primary/30 bg-surface px-2 py-1 text-xs">
                    <span className="font-semibold text-purple-primary">+1</span>
                    <span className="text-text-secondary">Posici&oacute;n exacta</span>
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  M&aacute;ximo: {activePlayers.length * 2} pts
                </p>
              </section>
            )}

            {/* Scores and ranking when not completed */}
            {myScore && myScore.total_score !== null && (
              <div className="flex flex-col gap-6">
                {leaderboard.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <h2 className="text-sm font-semibold text-text-primary">Clasificaci&oacute;n</h2>
                    <div className="rounded-lg border border-border bg-surface p-4">
                      {leaderboard.map((entry) => {
                        const isMe = entry.profile_id === myProfileId;
                        return (
                          <div key={entry.profile_id} className="flex items-center gap-3 py-1.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
                              {entry.rank}
                            </span>
                            <span className={`text-sm ${isMe ? 'font-medium text-purple-primary' : 'text-text-primary'}`}>
                              {entry.display_name ?? 'Participante'}
                              {isMe && <span className="ml-1 text-xs text-purple-primary">(t&uacute;)</span>}
                            </span>
                            <span className="ml-auto text-sm font-semibold text-text-primary">
                              {entry.total_score} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        <ReceiptModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          eventTitle={event.title}
          eventSlug={event.slug}
          subtitle={subtitle}
          eventLogoUrl={event.logo_url}
          participantName={participantName || 'Usuario de PickHub'}
          rankedPlayers={rankedPlayers}
        />
      </div>
    );
  }

  /* ===== PRE-SUBMISSION VIEW ===== */
  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <PickemParticipationHero
          event={event}
          hasTop8={hasTop8}
        />
      </div>

      {/* Prizes carousel */}
      {hasPrizes && (
        <PrizeCarousel
          generalPrizes={generalPrizes}
          subPrizes={subPrizes}
          stackingPolicy={event.prize_stacking_policy}
        />
      )}

      {hasPrizes && <div className="h-px bg-border" />}

      {/* Subscriber eligibility notice */}
      {shouldShowTwitchNotice && <SubscriberTwitchEligibilityNotice />}

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

      {/* Participation disabled */}
      {isAuthenticated && !mySubmission && !isClosed && !canParticipate && (
        <section className="rounded-xl border border-warning-border bg-warning-bg p-6 text-center">
          <p className="text-sm text-warning">
            Las nuevas participaciones est&aacute;n temporalmente deshabilitadas.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Tus participaciones anteriores y resultados siguen disponibles.
          </p>
        </section>
      )}

      {/* Prediction intro + form */}
      {isAuthenticated && !mySubmission && !isClosed && canParticipate && predictions.length > 0 && (
        <form action={formAction} className="flex flex-col gap-6">
          <PredictionIntro
            hasTop8={hasTop8}
            questionCount={predictions.length}
            playerCount={activePlayers.length}
          />

          {predictions.map((q) => {
            const isTop8 = q.template_type === 'top8_ordered';

            if (isTop8) {
              return (
                <Top8DnD
                  key={q.id}
                  questionId={q.id}
                  activePlayers={activePlayers}
                  options={q.options.map((opt) => ({
                    id: opt.id,
                    playerId: opt.player_id ?? null,
                    label: opt.label,
                  }))}
                  onChange={(count) => setTop8Counts((prev) => ({ ...prev, [q.id]: count }))}
                />
              );
            }

            return (
            <fieldset key={q.id} className="rounded-xl border border-border bg-surface p-5">
              <legend className="mb-3">
                <h3 className="text-sm font-medium text-text-primary">{q.title}</h3>
                {q.description && <p className="mt-0.5 text-xs text-text-secondary">{q.description}</p>}
                <p className="mt-0.5 text-xs text-text-muted">
                  {q.points_per_correct} punto{q.points_per_correct !== 1 ? 's' : ''} por acierto
                  {q.question_type === 'single' ? ' · Selección única' : ` · Selecciona hasta ${q.max_selections} opciones`}
                </p>
              </legend>

              <div className="flex flex-col gap-2">
                {q.options.map((opt) => (
                  <label key={opt.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary transition-colors hover:border-border-hover has-[:checked]:border-purple-primary">
                    {q.question_type === 'single' ? (
                      <input type="radio" name={`q_${q.id}`} value={opt.id} className="accent-purple-primary" />
                    ) : (
                      <input type="checkbox" name={`q_${q.id}`} value={opt.id} className="accent-purple-primary" />
                    )}
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
            );
          })}

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <button
            type="submit"
            disabled={pending || !allTop8Filled}
            className="self-start rounded-lg bg-purple-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
          >
            {pending ? 'Enviando predicción…' : 'Enviar predicción'}
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
          <p className="text-sm text-text-muted">Este Pick&rsquo;em no tiene predicciones configuradas.</p>
        </section>
      )}
    </div>
  );
}
