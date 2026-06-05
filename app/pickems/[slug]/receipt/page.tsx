import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getSubmissionReceipt } from '@/app/actions/participant';
import { createServerClient } from '@/services/supabase';
import { PredictionSelectionExpandable } from '@/components/pickem/PredictionSelectionExpandable';

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submissionId?: string }>;
}) {
  const { slug } = await params;
  const { submissionId } = await searchParams;

  const user = await getUser();
  if (!user) redirect(`/login?redirect=/pickems/${slug}/receipt`);

  const result = await getSubmissionReceipt(slug, submissionId);
  if (!result.event || !result.submission) {
    notFound();
  }

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const participantName = profile?.display_name ?? user.email ?? 'â€”';

  const { event, submission, predictions, prizes } = result;
  const prizesByTier = prizes.reduce(
    (acc, p) => {
      (acc[p.tier] ??= []).push(p);
      return acc;
    },
    {} as Record<string, typeof prizes>,
  );

  const sortedPredictions = predictions.map((q) => {
    const isTop8 = q.template_type === 'top8_ordered';
    const selected = submission.answers.filter((a) => a.question_id === q.id);
    if (isTop8) {
      const sorted = [...selected].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      return {
        key: q.id,
        title: q.title,
        isTop8: true,
        labels: sorted.map((s) => (s as { option_label?: string }).option_label ?? 'â€”'),
        options: q.options,
        isSingle: false,
      };
    }
    return {
      key: q.id,
      title: q.title,
      isTop8: false,
      labels: selected.map((s) => (s as { option_label?: string }).option_label ?? 'â€”'),
      options: q.options,
      isSingle: q.question_type === 'single',
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      {/* Header */}
      <section className="flex flex-col gap-4">
        <div className="relative">
          <div className="pointer-events-none absolute -inset-x-8 -top-8 h-48 bg-gradient-to-b from-purple-primary/[0.04] to-transparent" />
          <div className="relative">
            {event.logo_url && (
              <div className="mb-4">
                <img
                  src={event.logo_url}
                  alt="Logo del torneo"
                  className="object-contain max-w-[220px] max-h-[72px] sm:max-w-[280px] sm:max-h-[90px]"
                />
              </div>
            )}

            <h1 className="text-2xl font-bold tracking-tight text-text-primary">{event.title}</h1>

            {event.creator && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-purple-primary/20 text-xs font-bold text-purple-primary">
                  {(event.creator.display_name ?? event.creator.handle ?? '?')[0].toUpperCase()}
                </div>
                <span className="text-sm text-text-secondary">
                  {event.creator.display_name ?? event.creator.handle}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-border" />
      </section>

      {/* Submission info */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-text-muted">Participante</span>
            <p className="font-medium text-text-primary">{participantName}</p>
          </div>
          <div>
            <span className="text-text-muted">Fecha de envío</span>
            <p className="font-medium text-text-primary">
              {submission.submitted_at
                ? new Date(submission.submitted_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'â€”'}
            </p>
          </div>
        </div>
      </section>

      {/* Predictions */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text-primary">Tus predicciones</h2>
        <div className="flex flex-col gap-3">
          {sortedPredictions.map((p) => (
            <div key={p.key} className="rounded-xl border border-border bg-surface p-5">
              <PredictionSelectionExpandable
                eventTitle={event.title}
                creatorLabel={event.creator?.display_name ?? event.creator?.handle ?? 'â€”'}
                questionTitle={p.title}
                selectedLabels={p.labels}
                isSingle={p.isSingle}
                isTop8={p.isTop8}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Prizes */}
      {prizes.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-text-primary">Premios</h2>
          {prizesByTier['subscriber']?.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-purple-primary">
                <span>â­</span> Exclusivo para Subs
              </p>
              <div className="flex flex-wrap gap-2">
                {prizesByTier['subscriber'].map((p) => (
                  <div
                    key={p.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-purple-border bg-purple-surface px-3 py-2 text-sm text-purple-primary"
                  >
                    <span className="text-xs">â­</span>
                    <span>SUB</span>
                    <span className="text-text-muted">Â·</span>
                    {p.label}{p.amount !== null ? ` (${p.amount} ${p.currency ?? 'USD'})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
          {prizesByTier['nonsubscriber']?.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <span>ðŸŒ</span> Abierto para Todos
              </p>
              <div className="flex flex-wrap gap-2">
                {prizesByTier['nonsubscriber'].map((p) => (
                  <div
                    key={p.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  >
                    <span className="text-xs">ðŸŒ</span>
                    <span className="text-xs text-text-muted">TODOS</span>
                    <span className="text-text-muted">Â·</span>
                    {p.label}{p.amount !== null ? ` (${p.amount} ${p.currency ?? 'USD'})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border pt-4 text-center">
        <p className="text-xs text-text-muted">
          Powered by <span className="font-semibold text-text-secondary">PickHub</span>
        </p>
      </footer>
    </div>
  );
}
