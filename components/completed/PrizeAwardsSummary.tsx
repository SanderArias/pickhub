'use client';

import { useActionState } from 'react';
import type { PrizeAwardEntry, CompletedSummary } from '@/app/actions/results-data';
import { PrizeAwardCard } from './PrizeAwardCard';
import {
  runLegacyPrizeBackfillAction,
  type LegacyPrizeBackfillState,
} from '@/app/actions/legacy-prizes';

const initialState: LegacyPrizeBackfillState = {
  success: false,
  message: null,
};

export function PrizeAwardsSummary({ awards, eventId, hasLegacyPrizes, legacyMigrationStatus }: {
  awards: PrizeAwardEntry[];
  eventId: string;
  hasLegacyPrizes: boolean;
  legacyMigrationStatus: CompletedSummary['legacyMigrationStatus'];
}) {
  const action = runLegacyPrizeBackfillAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (awards.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text-primary">Premios entregados</h3>
        <p className="text-xs text-text-muted">
          Este Pick&rsquo;em no ten&iacute;a premios configurados.
        </p>
      </section>
    );
  }

  const assigned = awards.filter((a) => a.award_status === 'assigned');
  const pendingAwards = awards.filter((a) => a.award_status !== 'assigned');

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-primary">Premios entregados</h3>

      {assigned.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {assigned.map((a) => (
            <PrizeAwardCard key={a.prize_id} award={a} />
          ))}
        </div>
      )}

      {assigned.length === 0 && pendingAwards.length === 0 && (
        <p className="text-xs text-text-muted">
          No hay premios asignados a&uacute;n.
        </p>
      )}

      {pendingAwards.length > 0 && (
        <div className="rounded-lg border border-warning-border bg-surface px-3.5 py-2.5">
          <p className="text-xs font-medium text-warning">
            {pendingAwards.length} premio{pendingAwards.length !== 1 ? 's' : ''} pendiente{pendingAwards.length !== 1 ? 's' : ''} de asignaci&oacute;n
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            La clasificaci&oacute;n est&aacute; publicada, pero a&uacute;n no se han asignado estos premios.
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {pendingAwards.map((a) => (
              <PrizeAwardCard key={a.prize_id} award={a} />
            ))}
          </div>
        </div>
      )}

      {hasLegacyPrizes && legacyMigrationStatus === 'pending' && (
        <div className="rounded-lg border border-warning-border bg-surface px-3.5 py-2.5">
          <p className="text-xs font-medium text-warning">Premios del sistema anterior pendientes de migraci&oacute;n</p>
          <p className="mt-0.5 text-xs text-text-muted">
            Este Pick&rsquo;em usa premios del sistema anterior. Puedes migrarlos para que se asignen autom&aacute;ticamente.
          </p>
          <form action={formAction}>
            <button
              type="submit"
              disabled={pending}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Migrando premios...' : 'Migrar premios legacy'}
            </button>
          </form>
          {state.message && (
            <p
              role={state.success ? 'status' : 'alert'}
              aria-live="polite"
              className={`mt-1.5 text-xs font-medium ${state.success ? 'text-success' : 'text-danger'}`}
            >
              {state.message}
            </p>
          )}
        </div>
      )}

      {hasLegacyPrizes && legacyMigrationStatus === 'migrated' && (
        <div className="rounded-lg border border-success-border bg-surface px-3.5 py-2.5">
          <p className="text-xs font-medium text-success">Premios migrados correctamente</p>
          <p className="mt-0.5 text-xs text-text-muted">
            Los premios del sistema anterior se asignaron autom&aacute;ticamente.
          </p>
        </div>
      )}

      {hasLegacyPrizes && legacyMigrationStatus === 'failed' && (
        <div className="rounded-lg border border-danger-border bg-surface px-3.5 py-2.5">
          <p className="text-xs font-medium text-danger">Error en la migraci&oacute;n de premios</p>
          <p className="mt-0.5 text-xs text-text-muted">
            Ocurri&oacute; un error al migrar los premios. Intenta nuevamente.
          </p>
          <form action={formAction}>
            <button
              type="submit"
              disabled={pending}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Migrando premios...' : 'Reintentar migraci\u00f3n'}
            </button>
          </form>
          {state.message && (
            <p
              role={state.success ? 'status' : 'alert'}
              aria-live="polite"
              className={`mt-1.5 text-xs font-medium ${state.success ? 'text-success' : 'text-danger'}`}
            >
              {state.message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
