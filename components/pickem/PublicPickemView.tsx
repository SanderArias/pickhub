'use client';

import { useActionState, useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { submitPredictions } from '@/app/actions/participant';
import type { PublicEventData, EventPlayer, PredictionQuestion, Prize, Submission } from '@/app/actions/participant';
import type { LeaderboardEntry } from '@/app/actions/leaderboard';
import type { OfficialResultEntry } from '@/app/actions/results-data';
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
        label: opt?.label ?? '\u2014',
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
              <div className="hidden sm:flex size-24 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-hover p-2">
                <div className="relative size-full">
                  <Image
                    src={event.logo_url}
                    alt={`Logo de ${event.title}`}
                    fill
                    className="object-contain"
                    sizes="96px"
                  />
                </div>
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
          eventLogoUrl={event.logo_url}
          creatorLabel={event.creator?.display_name ?? event.creator?.handle ?? '\u2014'}
          participantName={participantName ?? '\u2014'}
          submittedAt={mySubmission?.submitted_at ?? null}
          rankedPlayers={rankedPlayers}
        />
      </div>
    );
  }

  /* ===== PRE-SUBMISSION VIEW ===== */
  const activePredictionCount = predictions.filter((q) => q.is_active).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <PickemParticipationHero
        event={event}
        hasTop8={hasTop8}
      />

      {/* Prizes carousel */}
      {hasPrizes && (
        <PrizeCarousel
          generalPrizes={generalPrizes}
          subPrizes={subPrizes}
          stackingPolicy={event.prize_stacking_policy}
        />
      )}

      {/* Subscriber eligibility notice */}
      {shouldShowTwitchNotice && <SubscriberTwitchEligibilityNotice />}

      {/* Prediction intro and form */}
      <PredictionIntro
        hasTop8={hasTop8}
        questionCount={activePredictionCount}
        playerCount={activePlayers.length}
      />

      <form action={formAction} className="flex flex-col gap-6">
        {predictions
          .filter((q) => q.is_active)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((q) => {
            if (q.question_type === 'single' && q.template_type === 'top8_ordered') {
              return (
                <div key={q.id} className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-text-primary">{q.title}</h3>
                  {q.description && (
                    <p className="text-xs text-text-muted">{q.description}</p>
                  )}
                  <Top8DnD
                    questionId={q.id}
                    activePlayers={activePlayers}
                    options={q.options.map((o) => ({ id: o.id, playerId: o.player_id, label: o.label }))}
                  />
                </div>
              );
            }
            return (
              <div key={q.id} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-text-primary">{q.title}</h3>
                {q.description && (
                  <p className="text-xs text-text-muted">{q.description}</p>
                )}
                <input type="hidden" name={`question_${q.id}`} value="" />
                <div className="flex flex-wrap gap-2">
                  {q.options
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((opt) => (
                      <label
                        key={opt.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:border-purple-primary/40 has-[:checked]:border-purple-primary has-[:checked]:bg-purple-primary/10"
                      >
                        <input
                          type="checkbox"
                          name={`question_${q.id}`}
                          value={opt.id}
                          className="size-4 accent-purple-primary"
                        />
                        {opt.label}
                      </label>
                    ))}
                </div>
              </div>
            );
          })}

        {state.error && (
          <p className="text-sm text-danger">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-purple-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
        >
          {pending ? 'Enviando...' : 'Enviar predicción'}
        </button>
      </form>
    </div>
  );
}
