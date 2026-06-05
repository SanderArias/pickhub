import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCreatorPickemById } from '@/app/actions/creator';
import { getEventResults } from '@/app/actions/scoring';
import { getLeaderboard } from '@/app/actions/leaderboard';
import { getTiebreakerDraws, getTieGroups } from '@/app/actions/tiebreaker';
import {
  StatusBadge,
  PageHeader,
  SectionCard,
  RequirementCard,
} from '@/components/ui';
import { PlayersSection } from '@/components/players/PlayersSection';
import { PredictionsSection } from '@/components/predictions/PredictionsSection';
import { GeneralInfoSection } from '@/components/pickem/GeneralInfoSection';
import { PrizesSection } from '@/components/picks/PrizesSection';
import { Top8Readonly } from '@/components/pickem/Top8Readonly';
import { CompletedRightPanel } from '@/components/pickem/CompletedRightPanel';
import { PublishSection } from './PublishSection';
import { ClosePredictionsButton } from './ClosePredictionsButton';
import { SharePickemSection } from './SharePickemSection';

export default async function PickemDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getCreatorPickemById(id);

  if (!event) notFound();

  const isDraft = event.status === 'draft';
  const isOpen = event.status === 'open';
  const isPredictionsClosed = event.status === 'predictions_closed';
  const isCompleted = event.status === 'completed';

  const activePlayers = event.players.filter((p: { is_active: boolean }) => p.is_active);
  const activePlayerCount = activePlayers.length;
  const hasMinActivePlayers = activePlayerCount >= 2;

  const activePredictions = event.predictions.filter((p: { is_active: boolean }) => p.is_active);
  const activePredictionCount = activePredictions.length;
  const hasMinPredictions = activePredictionCount >= 1;

  const allPredictionsHaveOptions = activePredictions.every(
    (p: { options: unknown[] }) => p.options.length >= 2,
  );

  const hasValidClosure =
    !event.ends_at || new Date(event.ends_at) > new Date();

  const hasPrizes = event.prizes.length > 0;

  const existingResults = await getEventResults(id);
  const leaderboard = await getLeaderboard(id);

  const hasFinalResults = isCompleted || (isPredictionsClosed && leaderboard.length > 0);

  const drawsMap = hasFinalResults ? await getTiebreakerDraws(id) : {};
  const tieGroups = hasFinalResults ? await getTieGroups(id) : [];

  // Build readonly Top 8 official results
  const top8Question = hasFinalResults
    ? activePredictions.find((p: { template_type: string | null }) => p.template_type === 'top8_ordered')
    : null;
  const top8Results = top8Question && existingResults
    ? existingResults
        .filter((r: { question_id: string; position: number | null }) => r.question_id === top8Question.id && r.position !== null)
        .sort((a: { position: number | null }, b: { position: number | null }) => (a.position ?? 0) - (b.position ?? 0))
        .map((r: { option_id: string; position: number | null }) => {
          const opt = top8Question.options.find((o: { id: string }) => o.id === r.option_id);
          return {
            position: r.position ?? 0,
            optionId: r.option_id,
            label: opt?.label ?? '',
            playerId: opt?.player_id ?? null,
          };
        })
    : [];

  const canPublish =
    isDraft &&
    hasMinActivePlayers &&
    hasMinPredictions &&
    allPredictionsHaveOptions &&
    hasValidClosure;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={event.title}
        description={event.description ?? undefined}
        backHref="/creator/pickems"
        backLabel="Mis Pick'ems"
        actions={<StatusBadge status={event.status} />}
      />

      {/* ===== DRAFT: Full configuration ===== */}
      {isDraft && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RequirementCard
              title="Información general"
              state={hasValidClosure ? 'configured' : 'missing'}
              description="Título y fecha de cierre."
              requirement={hasValidClosure ? 'Configurado' : 'Revisar fecha'}
              current={event.ends_at ? `Cierre: ${new Date(event.ends_at).toLocaleString()}` : 'Cierre manual'}
            />
            <RequirementCard
              title="Pool de jugadores"
              state={hasMinActivePlayers ? 'configured' : 'missing'}
              description="Participantes activos para las predicciones."
              requirement="Al menos 2 jugadores activos"
              current={`${activePlayerCount} activo${activePlayerCount !== 1 ? 's' : ''}`}
            />
            <RequirementCard
              title="Predicciones"
              state={hasMinPredictions && allPredictionsHaveOptions ? 'configured' : 'missing'}
              description="Preguntas con opciones de predicción."
              requirement={hasMinPredictions ? 'Con opciones' : 'Al menos 1 predicción'}
              current={`${activePredictionCount} prediccione${activePredictionCount !== 1 ? 's' : ''}${activePredictionCount > 0 && !allPredictionsHaveOptions ? ' (faltan opciones)' : ''}`}
            />
            <RequirementCard
              title="Premios"
              state={hasPrizes ? 'configured' : 'optional'}
              description="Incentivos para los ganadores."
              requirement={hasPrizes ? `${event.prizes.length} configurados` : 'No obligatorio'}
              current={
                hasPrizes
                  ? event.prizes
                      .map(
                        (p: { label: string; amount: number | null; currency: string | null }) =>
                          `${p.label} (${p.amount ?? '—'} ${p.currency ?? 'USD'})`,
                      )
                      .join(', ')
                  : 'Sin premios configurados'
              }
            />
          </div>

          <SectionCard title="Información general" subtitle="Detalles básicos del Pick'em">
            <GeneralInfoSection eventId={id} event={event} isDraft={isDraft} />
          </SectionCard>

          <SectionCard
            title="Pool de jugadores"
            subtitle="Agrega los participantes del evento"
            action={<span className="text-xs text-text-muted">{activePlayerCount} activo{activePlayerCount !== 1 ? 's' : ''}</span>}
            accent={hasMinActivePlayers ? 'success' : 'error'}
          >
            <PlayersSection eventId={id} players={event.players} readOnly={false} />
          </SectionCard>

          <SectionCard
            title="Predicciones"
            subtitle="Preguntas y opciones para las predicciones"
            action={<span className="text-xs text-text-muted">{activePredictionCount} activa{activePredictionCount !== 1 ? 's' : ''}</span>}
            accent={hasMinPredictions && allPredictionsHaveOptions ? 'success' : 'error'}
          >
            <PredictionsSection eventId={id} predictions={event.predictions} readOnly={false} />
          </SectionCard>

          <SectionCard
            title="Premios"
            subtitle="Configura los premios para los ganadores"
            action={<span className="text-xs text-text-muted">{hasPrizes ? `${event.prizes.length} configurado${event.prizes.length !== 1 ? 's' : ''}` : 'Opcional'}</span>}
            accent={hasPrizes ? 'success' : 'warning'}
          >
            <PrizesSection eventId={id} prizes={event.prizes} readOnly={false} />
          </SectionCard>

          <SectionCard title="Publicación">
            <PublishSection
              eventId={id}
              status={event.status}
              canPublish={canPublish}
              hasMinActivePlayers={hasMinActivePlayers}
              activePlayerCount={activePlayerCount}
              hasMinPredictions={hasMinPredictions}
              activePredictionCount={activePredictionCount}
              allPredictionsHaveOptions={allPredictionsHaveOptions}
              hasValidClosure={hasValidClosure}
              hasPrizes={hasPrizes}
            />
          </SectionCard>
        </>
      )}

      {/* ===== OPEN: Operational phase ===== */}
      {isOpen && (
        <>
          <SharePickemSection slug={event.slug} />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Participaciones</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{event.submissionCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Predicciones</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activePredictionCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Pool de jugadores</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activePlayerCount}</p>
            </div>
          </div>

          <SectionCard title="Cerrar predicciones" subtitle="Una vez cerradas, los usuarios no podrán participar más">
            <ClosePredictionsButton eventId={id} />
          </SectionCard>
        </>
      )}

      {/* ===== PREDICTIONS CLOSED (no results yet): Needs to register results ===== */}
      {isPredictionsClosed && !hasFinalResults && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Participaciones</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{event.submissionCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Predicciones</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activePredictionCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Pool de jugadores</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activePlayerCount}</p>
            </div>
          </div>

          <SectionCard
            title="Resultados"
            subtitle="Registra los resultados y calcula puntuaciones"
          >
            <Link
              href={`/creator/pickems/${id}/results`}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
            >
              Ir a resultados
            </Link>
          </SectionCard>
        </>
      )}

      {/* ===== FINAL RESULTS: Show combined view (completed or predictions_closed with results) ===== */}
      {hasFinalResults && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Participaciones</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{event.submissionCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Predicciones</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activePredictionCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Pool de jugadores</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activePlayerCount}</p>
            </div>
          </div>

          {/* Prizes */}
          {hasPrizes && (() => {
            type PrizeShape = { id: string; tier: string; label: string; amount: number | null; currency: string | null; quantity: number };
            const prizes = event.prizes as PrizeShape[];
            const subPrizes = prizes.filter((p) => p.tier === 'subscriber');
            const communityPrizes = prizes.filter((p) => p.tier === 'nonsubscriber');

            const PrizeCard = ({ prize, variant }: { prize: PrizeShape; variant: 'sub' | 'community' }) => (
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

          {/* Two-column layout on desktop */}
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-6">
            {top8Results.length > 0 ? (
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-border bg-surface p-5">
                  <h3 className="mb-4 text-sm font-semibold text-text-primary">Resultados oficiales</h3>
                  <Top8Readonly rankedPlayers={top8Results} activePlayers={event.players} />
                </div>
              </div>
            ) : null}

            <CompletedRightPanel
              eventId={id}
              initialLeaderboard={leaderboard}
              initialTieGroups={tieGroups}
              initialDrawsMap={drawsMap}
              myProfileId={undefined}
            />
          </div>
        </>
      )}
    </div>
  );
}
