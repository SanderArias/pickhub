import type { Prize } from '@/app/actions/participant';

const SUB_LABELS: Record<number, string> = {
  1: 'Mejor suscriptor',
  2: 'Segundo mejor suscriptor',
  3: 'Tercer mejor suscriptor',
  4: 'Cuarto mejor suscriptor',
  5: 'Quinto mejor suscriptor',
};

export function SubscriberBenefit({
  prizes,
  stackingPolicy,
}: {
  prizes: Prize[];
  stackingPolicy: string | null;
}) {
  if (prizes.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-text-primary">
        Beneficio exclusivo para suscriptores
      </h3>
      <p className="text-xs text-text-muted">
        El suscriptor mejor clasificado recibe un beneficio adicional.
      </p>

      <div className="flex flex-col gap-1.5">
        {prizes.map((p, i) => {
          const label = SUB_LABELS[i + 1] ?? `${p.label} #${i + 1}`;

          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-purple-primary/20 bg-purple-primary/[0.02] px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1 flex items-center gap-3">
                <svg
                  className="size-4 shrink-0 text-purple-primary"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.571 4.714s0 2.286 0 2.286c0 0 3.722 0 3.722 0 0 0 0-2.286 0-2.286 0 0-3.722 0-3.722 0zm-3.286 11.432c-1.143 1.714-4.286 6.143-4.286 6.143 0 0 7.143-3.429 7.143-3.429 0 0-2.857-2.714-2.857-2.714zm12.286-11.432c0 0 0 2.286 0 2.286 0 0 3.722 0 3.722 0 0 0 0-2.286 0-2.286 0 0-3.722 0-3.722 0zm-4.286 0c0 0 0 2.286 0 2.286 0 0 3.722 0 3.722 0 0 0 0-2.286 0-2.286 0 0-3.722 0-3.722 0zm-8.571 4.286c0 0 0 2.286 0 2.286 0 0 3.722 0 3.722 0 0 0 0-2.286 0-2.286 0 0-3.722 0-3.722 0zm11.715 1.143c0 3.314-2.686 6-6 6-3.313 0-6-2.686-6-6 0-3.314 2.687-6 6-6 3.314 0 6 2.686 6 6z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-purple-primary">{label}</p>
                  <p className="text-xs text-text-primary">{p.label}</p>
                  {p.amount !== null && (
                    <p className="text-xs font-medium text-text-secondary">
                      {p.currency ?? 'USD'} {p.amount.toLocaleString('es-ES')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-muted">
        {stackingPolicy === 'allow_multiple_prizes'
          ? 'Los suscriptores también compiten por los premios generales.'
          : 'Si un suscriptor gana un premio general, el beneficio exclusivo pasa al siguiente suscriptor.'
        }
      </p>
    </section>
  );
}
