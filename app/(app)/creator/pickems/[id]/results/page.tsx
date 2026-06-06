import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCreatorPickemById } from '@/app/actions/creator';
import { getEventResults } from '@/app/actions/scoring';
import { PageHeader } from '@/components/ui';
import { ResultsSection } from '@/components/pickem/ResultsSection';

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

  if (event.status === 'completed') {
    redirect(`/creator/pickems/${id}?tab=summary`);
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={event.title}
        description="Registrar resultados"
        backHref={`/creator/pickems/${id}`}
        backLabel="Volver al Pick'em"
      />

      <ResultsSection
        eventId={id}
        predictions={event.predictions}
        existingResults={existingResults}
        status={event.status}
        players={event.players}
        onPublished={`/creator/pickems/${id}`}
      />
    </div>
  );
}
