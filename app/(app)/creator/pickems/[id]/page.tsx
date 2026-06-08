import { notFound } from 'next/navigation';
import { getCreatorPickemById } from '@/activities/pickem/actions';
import { getPrizeConfiguration } from '@/activities/pickem/prizes/actions/get-prize-configuration';
import { getCreatorTwitchVerificationStatus } from '@/app/actions/twitch-status';
import { getActivityCapabilities } from '@/activities/registry.server';
import { getTiebreakerDraws, getTieGroups } from '@/app/actions/tiebreaker';
import { getPredictionConfigurationSummary } from '@/lib/summary';
import {
  PageHeader,
  SectionCard,
  RequirementCard,
} from '@/components/ui';
import { PlayersSection } from '@/components/players/PlayersSection';
import { PredictionsSection } from '@/components/predictions/PredictionsSection';
import { GeneralInfoSection } from '@/components/pickem/GeneralInfoSection';
import { PrizeSection } from '@/components/pickem/PrizeSection';
import { CreatorPickemClientSection } from '@/components/pickem/CreatorPickemClientSection';
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

  const caps = getActivityCapabilities('pickem');

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

  const prizeConfig = await getPrizeConfiguration(id);
  const hasPrizes = prizeConfig.generalPrizes.length > 0 || prizeConfig.subscriberBenefits.length > 0;

  const { status: twitchStatus } = await getCreatorTwitchVerificationStatus();

  // Load tiebreaker data for non-draft events (including completed, to detect pending ties)
  const drawsMap = !isDraft ? await getTiebreakerDraws(id) : {};
  const tieGroups = !isDraft ? await getTieGroups(id) : [];
  const pendingTiebreakerCount = tieGroups.filter(
    (g) => !g.participants.every((p) => p.profile_id in drawsMap),
  ).length;

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

      {/* Status card + completed results (shared pendingTiebreakerCount state) */}
      {!isDraft && (
        <CreatorPickemClientSection
          eventId={id}
          status={event.status as 'open' | 'predictions_closed' | 'tiebreaker_pending' | 'completed'}
          submissionCount={event.submissionCount}
          endsAt={event.ends_at}
          initialPendingTiebreakerCount={pendingTiebreakerCount}
          initialTab={initialTab}
          hasPrizes={hasPrizes}
          canManage={caps.manageExisting}
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
              current={hasPrizes ? `${prizeConfig.generalPrizes.length} general${prizeConfig.generalPrizes.length !== 1 ? 'es' : ''}` + (prizeConfig.subscriberBenefits.length > 0 ? ` · ${prizeConfig.subscriberBenefits.length} sub` : '') : 'Sin premios configurados'}
              href="#premios"
            />
          </div>

          <SectionCard id="informacion-general" title="Información general" subtitle="Detalles básicos del Pick'em">
            <GeneralInfoSection eventId={id} event={event} isDraft={isDraft} canManage={caps.manageExisting} />
          </SectionCard>

          <div id="pool-de-jugadores">
            <PlayersSection
              eventId={id}
              players={event.players}
              activePlayerCount={activePlayerCount}
              hasMinActivePlayers={hasMinActivePlayers}
              readOnly={!caps.manageExisting}
            />
          </div>

          <SectionCard
            id="predicciones"
            title="Predicciones"
            subtitle="Preguntas y opciones para las predicciones"
            action={<span className="text-xs text-text-muted">{activePredictionCount} activa{activePredictionCount !== 1 ? 's' : ''}</span>}
            accent={hasMinPredictions && allPredictionsHaveOptions ? 'success' : 'error'}
          >
            <PredictionsSection eventId={id} predictions={event.predictions} readOnly={!caps.manageExisting} />
          </SectionCard>

          <div id="premios">
            <PrizeSection
              eventId={id}
              initialConfiguration={prizeConfig}
              twitchStatus={twitchStatus}
              readOnly={!caps.manageExisting}
            />
          </div>

          <SectionCard title="Publicación" accent="success">
            <PublishSection
              eventId={id}
          status={event.status as 'open' | 'predictions_closed' | 'tiebreaker_pending' | 'completed'}
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
    </div>
  );
}
