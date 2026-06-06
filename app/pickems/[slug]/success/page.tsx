import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicPickem } from '@/app/actions/participant';

export default async function PickemSuccessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicPickem(slug);

  if (!result.event) {
    notFound();
  }

  const { event, predictions } = result;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-8">
        <section className="rounded-xl border border-purple-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-purple-primary/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-purple-primary">Tu Pick'em fue enviado</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Tus predicciones para <strong className="text-text-primary">{event.title}</strong> se guardaron correctamente.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {predictions.length} predicción{predictions.length !== 1 ? 'es' : ''} respondida{predictions.length !== 1 ? 's' : ''}
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/pickems/${slug}`}
            className="rounded-lg bg-purple-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
          >
            Ir al resumen
          </Link>
          <Link
            href="/inicio"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
