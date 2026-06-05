import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCreatorPickemById } from '@/app/actions/creator';
import { getEventResults } from '@/app/actions/scoring';
import { getLeaderboard } from '@/app/actions/leaderboard';
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
import { ShareSection } from '@/components/pickem/ShareSection';
import { LeaderboardSection } from '@/components/pickem/LeaderboardSection';
import { PublishSection } from './PublishSection';
import { ClosePredictionsButton } from './ClosePredictionsButton';

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
              title="Jugadores"
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
            title="Jugadores"
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

          <SectionCard title="Diseño para compartir" subtitle="Imagen optimizada para redes sociales, Discord o tu stream">
            <ShareSection
              title={event.title}
              description={event.description}
              creator={event.creator}
              players={event.players}
              slug={event.slug}
              status={event.status}
              isPublished={false}
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

      {/* ===== OPEN: Operational phase ===== */}
      {isOpen && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Participaciones</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{leaderboard.length > 0 ? leaderboard.length : '—'}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Predicciones</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activePredictionCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Jugadores</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activePlayerCount}</p>
            </div>
          </div>

          <SectionCard title="Compartir" subtitle="Invita participantes con este enlace">
            <ShareSection
              title={event.title}
              description={event.description}
              creator={event.creator}
              players={event.players}
              slug={event.slug}
              status={event.status}
              isPublished={true}
            />
          </SectionCard>

          <SectionCard title="Predicciones" subtitle="Vista de solo lectura">
            <PredictionsSection eventId={id} predictions={event.predictions} readOnly={true} />
          </SectionCard>

          <SectionCard title="Cerrar predicciones" subtitle="Una vez cerradas, los usuarios no podrán participar más">
            <ClosePredictionsButton eventId={id} />
          </SectionCard>
        </>
      )}

      {/* ===== PREDICTIONS CLOSED: Results management ===== */}
      {(isPredictionsClosed || isCompleted) && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Participaciones</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{leaderboard.length > 0 ? leaderboard.length : '—'}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Predicciones</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activePredictionCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-text-muted">Jugadores</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activePlayerCount}</p>
            </div>
          </div>

          <SectionCard
            title="Resultados"
            subtitle={isCompleted ? 'Resultados cargados y puntuaciones calculadas' : 'Registra los resultados y calcula puntuaciones'}
          >
            <Link
              href={`/creator/pickems/${id}/results`}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
            >
              {isCompleted ? 'Ver resultados' : 'Ir a resultados'}
            </Link>
          </SectionCard>

          {leaderboard.length > 0 && (
            <SectionCard title="Clasificación" subtitle="Puntuaciones de todos los participantes">
              <LeaderboardSection entries={leaderboard} />
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
