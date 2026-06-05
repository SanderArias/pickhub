import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCreatorPickemById } from '@/app/actions/creator';
import { getEventResults } from '@/app/actions/scoring';
import { getLeaderboard } from '@/app/actions/leaderboard';
import { PageHeader, SectionCard } from '@/components/ui';
import { ResultsSection } from '@/components/pickem/ResultsSection';
import { LeaderboardSection } from '@/components/pickem/LeaderboardSection';

export default async function PickemResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getCreatorPickemById(id);

  if (!event) notFound();

  if (event.status === 'draft') {
    redirect(`/creator/pickems/${id}`);
  }

  if (event.status === 'open') {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={event.title}
          description="Resultados"
          backHref={`/creator/pickems/${id}`}
          backLabel="Volver al Pick'em"
        />
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">
            Cierra las predicciones antes de registrar resultados.
          </p>
          <Link
            href={`/creator/pickems/${id}`}
            className="mt-4 inline-block rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
          >
            Volver al Pick'em
          </Link>
        </div>
      </div>
    );
  }

  const existingResults = await getEventResults(id);
  const leaderboard = await getLeaderboard(id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={event.title}
        description={event.status === 'completed' ? 'Resultados finales' : 'Registrar resultados'}
        backHref={`/creator/pickems/${id}`}
        backLabel="Volver al Pick'em"
      />

      <SectionCard
        title="Resultados reales"
        subtitle="Marca las opciones correctas por cada predicción y calcula puntuaciones"
      >
        <ResultsSection
          eventId={id}
          predictions={event.predictions}
          existingResults={existingResults}
          status={event.status}
        />
      </SectionCard>

      {leaderboard.length > 0 && (
        <SectionCard
          title="Clasificación"
          subtitle="Puntuaciones calculadas de todos los participantes"
        >
          <LeaderboardSection entries={leaderboard} />
        </SectionCard>
      )}
    </div>
  );
}
