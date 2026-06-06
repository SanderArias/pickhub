import { notFound } from 'next/navigation';
import { getCreatorPickemById } from '@/app/actions/creator';
import { getCreatorTwitchVerificationStatus } from '@/app/actions/twitch-status';
import { getCompletedSummary, getOfficialResults } from '@/app/actions/results-data';
import { getTiebreakerDraws, getTieGroups } from '@/app/actions/tiebreaker';
import { getPredictionConfigurationSummary, getPrizeConfigurationSummary } from '@/lib/summary';
import {
  PageHeader,
  SectionCard,
  RequirementCard,
} from '@/components/ui';
import { PlayersSection } from '@/components/players/PlayersSection';
import { PredictionsSection } from '@/components/predictions/PredictionsSection';
import { GeneralInfoSection } from '@/components/pickem/GeneralInfoSection';
import { PrizeSection } from '@/components/pickem/PrizeSection';
import { PickemStatusCard } from '@/components/pickem/PickemStatusCard';
import { CompletedResultsClient } from '@/components/completed/CompletedResultsClient';
import { PublishSection } from './PublishSection';
import { SharePickemSection } from './SharePickemSection';

export default async function PickemDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

  const { status: twitchStatus } = await getCreatorTwitchVerificationStatus();

  const drawsMap = !isDraft && !isCompleted ? await getTiebreakerDraws(id) : {};
  const tieGroups = !isDraft && !isCompleted ? await getTieGroups(id) : [];
  const allTiedProfileIds = new Set<string>();
  for (const g of tieGroups) {
    for (const p of g.participants) {
      allTiedProfileIds.add(p.profile_id);
    }
  }
  const pendingTiebreakerCount = tieGroups.length > 0
    ? [...allTiedProfileIds].filter((pid) => !(pid in drawsMap)).length
    : 0;

  const [summary, officialResults] = isCompleted
    ? await Promise.all([getCompletedSummary(id), getOfficialResults(id)])
    : [null, null];

  const canPublish =
    isDraft &&
    hasMinActivePlayers &&
    hasMinPredictions &&
    allPredictionsHaveOptions &&
    hasValidClosure;

  const sp = await searchParams;
  const initialTab = (sp.tab as string) ?? 'summary';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={event.title}
        description={event.description ?? undefined}
        backHref="/creator/pickems"
        backLabel="Mis Pick'ems"
      />

      {/* Status card for non-draft states */}
      {!isDraft && (
        <PickemStatusCard
          eventId={id}
          status={event.status}
          submissionCount={event.submissionCount}
          closeDate={event.ends_at}
          pendingTiebreakerCount={pendingTiebreakerCount}
          compact={isCompleted}
        />
      )}

      {/* ===== DRAFT: Full configuration ===== */}
      {isDraft && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RequirementCard
              title="Información general"
              state={hasValidClosure ? 'configured' : 'missing'}
              description="Título y fecha de cierre."
              current={event.ends_at ? `Cierre: ${new Date(event.ends_at).toLocaleString()}` : 'Cierre manual'}
              href="#informacion-general"
            />
            <RequirementCard
              title="Pool de jugadores"
              state={hasMinActivePlayers ? 'configured' : 'missing'}
              description="Participantes activos para las predicciones."
              current={`${activePlayerCount} activo${activePlayerCount !== 1 ? 's' : ''}`}
              href="#pool-de-jugadores"
            />
            <RequirementCard
              title="Predicciones"
              state={hasMinPredictions && allPredictionsHaveOptions ? 'configured' : 'missing'}
              description="Preguntas con opciones de predicción."
              current={getPredictionConfigurationSummary(event.predictions)}
              href="#predicciones"
            />
            <RequirementCard
              title="Premios"
              state={hasPrizes ? 'configured' : 'optional'}
              description="Incentivos para los ganadores."
              current={hasPrizes ? getPrizeConfigurationSummary(event.prizes).primary : 'Sin premios configurados'}
              href="#premios"
            />
          </div>

          <SectionCard id="informacion-general" title="Información general" subtitle="Detalles básicos del Pick'em">
            <GeneralInfoSection eventId={id} event={event} isDraft={isDraft} />
          </SectionCard>

          <div id="pool-de-jugadores">
            <PlayersSection
              eventId={id}
              players={event.players}
              activePlayerCount={activePlayerCount}
              hasMinActivePlayers={hasMinActivePlayers}
              readOnly={false}
            />
          </div>

          <SectionCard
            id="predicciones"
            title="Predicciones"
            subtitle="Preguntas y opciones para las predicciones"
            action={<span className="text-xs text-text-muted">{activePredictionCount} activa{activePredictionCount !== 1 ? 's' : ''}</span>}
            accent={hasMinPredictions && allPredictionsHaveOptions ? 'success' : 'error'}
          >
            <PredictionsSection eventId={id} predictions={event.predictions} readOnly={false} />
          </SectionCard>

          <SectionCard
            id="premios"
            title="Premios"
            subtitle="Configura los premios para los ganadores"
            action={<span className="text-xs text-text-muted">{hasPrizes ? `${event.prizes.length} configurado${event.prizes.length !== 1 ? 's' : ''}` : 'Opcional'}</span>}
            accent={hasPrizes ? 'success' : 'warning'}
          >
            <PrizeSection
              eventId={id}
              initialPrizes={event.prizes}
              initialStackingPolicy={event.prize_stacking_policy ?? 'single_prize_per_participant'}
              twitchStatus={twitchStatus}
              readOnly={false}
            />
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

      {/* ===== OPEN: Share section ===== */}
      {isOpen && (
        <SharePickemSection slug={event.slug} />
      )}

      {/* ===== COMPLETED: Tabs inline ===== */}
      {isCompleted && summary && (
        <CompletedResultsClient
          eventId={id}
          initialSummary={summary}
          initialOfficialResults={officialResults ?? []}
          initialTab={initialTab}
        />
      )}
    </div>
  );
}
