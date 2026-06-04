import { notFound } from 'next/navigation';
import { getCreatorPickemById } from '@/app/actions/creator';
import {
  StatusBadge,
  PageHeader,
  SectionCard,
  RequirementCard,
  ActionButton,
} from '@/components/ui';
import { PlayersSection } from '@/components/players/PlayersSection';
import { PredictionsSection } from '@/components/predictions/PredictionsSection';

export default async function PickemDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getCreatorPickemById(id);

  if (!event) notFound();

  const playerCount = event.players.length;
  const hasMinPlayers = playerCount >= 2;
  const predictionCount = event.predictions.length;
  const hasMinPredictions = predictionCount >= 1;
  const hasPrizes = event.prizes.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <PageHeader
        title={event.title}
        description={event.description ?? undefined}
        backHref="/creator/pickems"
        backLabel="Mis Pick'ems"
        actions={<StatusBadge status={event.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RequirementCard
          title="Información general"
          state="configured"
          description="Título y descripción del evento."
          requirement="Título"
          current="Configurado"
        />
        <RequirementCard
          title="Jugadores"
          state={hasMinPlayers ? 'configured' : 'missing'}
          description="Participantes para las predicciones."
          requirement="Al menos 2 jugadores"
          current={`${playerCount} jugador${playerCount !== 1 ? 'es' : ''}`}
        />
        <RequirementCard
          title="Predicciones"
          state={hasMinPredictions ? 'configured' : 'missing'}
          description="Preguntas y opciones de predicción."
          requirement="Al menos 1 predicción"
          current={`${predictionCount}/5 predicciones`}
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
                    (p: {
                      label: string;
                      amount: number | null;
                      currency: string | null;
                    }) => `${p.label} (${p.amount ?? '—'} ${p.currency ?? 'USD'})`,
                  )
                  .join(', ')
              : 'Sin premios configurados'
          }
        />
      </div>

      <SectionCard
        title="Información general"
        subtitle="Detalles básicos del Pick'em"
      >
        <div className="flex flex-col gap-1.5 text-sm">
          <p>
            <span className="text-[#555]">Cierre de predicciones:</span>{' '}
            <span className="text-[#ccc]">
              {event.ends_at
                ? new Date(event.ends_at).toLocaleString()
                : 'Cierre manual'}
            </span>
          </p>
          <p>
            <span className="text-[#555]">Creado:</span>{' '}
            <span className="text-[#ccc]">
              {new Date(event.created_at).toLocaleString()}
            </span>
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Jugadores"
        subtitle="Agrega los participantes del evento"
        action={
          <span className="text-xs text-[#555]">
            {playerCount} agregado{playerCount !== 1 ? 's' : ''}
          </span>
        }
        accent={hasMinPlayers ? 'green' : 'red'}
      >
        <PlayersSection eventId={id} players={event.players} />
      </SectionCard>

      <SectionCard
        title="Predicciones"
        subtitle={`${predictionCount} de 5 creadas`}
        action={
          <span className="text-xs text-[#555]">
            {predictionCount} creada{predictionCount !== 1 ? 's' : ''}
          </span>
        }
        accent={hasMinPredictions ? 'green' : 'red'}
      >
        <PredictionsSection eventId={id} predictions={event.predictions} />
      </SectionCard>

      <SectionCard
        title="Premios"
        subtitle="Configura los premios para los ganadores"
        action={
          <span className="text-xs text-[#555]">
            {hasPrizes ? `${event.prizes.length} configurados` : 'Opcional'}
          </span>
        }
        accent={hasPrizes ? 'green' : 'yellow'}
      >
        {hasPrizes ? (
          <div className="flex flex-col gap-2">
            {event.prizes.map(
              (prize: {
                id: string;
                label: string;
                tier: string;
                amount: number | null;
                currency: string | null;
              }) => (
                <div
                  key={prize.id}
                  className="rounded-md border border-[#1f1f1f] bg-[#181818] p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#e8e8e8]">
                      {prize.label}
                    </span>
                    <span className="text-xs text-[#555]">{prize.tier}</span>
                  </div>
                  {prize.amount && (
                    <p className="mt-0.5 text-base font-bold text-[#e8e8e8]">
                      {prize.amount} {prize.currency ?? 'USD'}
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="text-xs text-[#888]">
            Los premios son opcionales y se pueden configurar en cualquier
            momento.
          </p>
        )}
        <div className="mt-3">
          <ActionButton disabled variant="secondary">
            Configurar premios
          </ActionButton>
        </div>
      </SectionCard>

      <SectionCard title="Publicación">
        {event.status === 'draft' ? (
          <>
            <div className="mb-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[#888]">
                  Información general configurada
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    hasMinPlayers ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                />
                <span className={hasMinPlayers ? 'text-[#888]' : 'text-[#555]'}>
                  {hasMinPlayers
                    ? `${playerCount} jugadores`
                    : 'Al menos 2 jugadores'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    hasMinPredictions ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                />
                <span className={hasMinPredictions ? 'text-[#888]' : 'text-[#555]'}>
                  {hasMinPredictions
                    ? `${predictionCount}/5 predicciones`
                    : 'Al menos 1 predicción'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    hasPrizes ? 'bg-emerald-400' : 'bg-[#555]'
                  }`}
                />
                <span className={hasPrizes ? 'text-[#888]' : 'text-[#555]'}>
                  Premios {hasPrizes ? 'configurados' : 'no configurados (opcional)'}
                </span>
              </div>
            </div>

            <ActionButton disabled>
              Iniciar Pick&apos;em
            </ActionButton>
          </>
        ) : (
          <p className="text-sm text-[#888]">
            Estado actual:{' '}
            <span className="text-[#ccc]">{event.status}</span>
          </p>
        )}
      </SectionCard>
    </div>
  );
}
