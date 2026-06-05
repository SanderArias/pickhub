'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { approveCreator, rejectCreator, suspendCreator, reactivateCreator, reopenCreatorRequest } from '@/app/actions/admin';

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-warning',
  approved: 'text-purple-primary',
  rejected: 'text-danger',
  suspended: 'text-orange-400',
  reopened: 'text-text-muted',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
  reopened: 'Reabierta',
};

interface CreatorRowData {
  id: string;
  profile_id: string;
  handle: string;
  status: string;
  created_at: string;
  display_name: string | null;
}

export function AdminCreatorRow({ creator }: { creator: CreatorRowData }) {
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleApprove = useCallback(async () => {
    setError(null);
    setPending(true);
    const result = await approveCreator(creator.profile_id);
    if (result.error) {
      setError(result.error);
      setPending(false);
    } else {
      router.refresh();
    }
  }, [creator.profile_id, router]);

  const handleReactivate = useCallback(async () => {
    setError(null);
    setPending(true);
    const result = await reactivateCreator(creator.profile_id);
    if (result.error) {
      setError(result.error);
      setPending(false);
    } else {
      router.refresh();
    }
  }, [creator.profile_id, router]);

  const handleReopen = useCallback(async () => {
    setError(null);
    setPending(true);
    const result = await reopenCreatorRequest(creator.profile_id);
    if (result.error) {
      setError(result.error);
      setPending(false);
    } else {
      router.refresh();
    }
  }, [creator.profile_id, router]);

  const handleReject = useCallback(
    async (formData: FormData) => {
      const reason = (formData.get('reason') as string)?.trim();
      if (!reason) {
        setError('El motivo de rechazo es obligatorio.');
        return;
      }
      setError(null);
      setPending(true);
      const result = await rejectCreator(creator.profile_id, formData);
      if (result.error) {
        setError(result.error);
        setPending(false);
      } else {
        setShowReject(false);
        router.refresh();
      }
    },
    [creator.profile_id, router],
  );

  const handleSuspend = useCallback(
    async (formData: FormData) => {
      const reason = (formData.get('reason') as string)?.trim();
      if (!reason) {
        setError('El motivo de suspensión es obligatorio.');
        return;
      }
      setError(null);
      setPending(true);
      const result = await suspendCreator(creator.profile_id, formData);
      if (result.error) {
        setError(result.error);
        setPending(false);
      } else {
        setShowSuspend(false);
        router.refresh();
      }
    },
    [creator.profile_id, router],
  );

  return (
    <>
      <tr className="border-b border-border text-sm">
        <td className="px-4 py-3 font-mono text-text-primary">{creator.handle}</td>
        <td className="px-4 py-3 text-text-secondary">{creator.display_name ?? '—'}</td>
        <td className={`px-4 py-3 font-medium ${STATUS_COLORS[creator.status] ?? ''}`}>
          {STATUS_LABELS[creator.status] ?? creator.status}
        </td>
        <td className="px-4 py-3 text-text-muted">
          {new Date(creator.created_at).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              {creator.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={pending}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-success transition-colors hover:bg-success/10 disabled:opacity-50"
                  >
                    {pending ? '...' : 'Aprobar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setError(null); setShowReject(true); }}
                    disabled={pending}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </>
              )}
              {creator.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => { setError(null); setShowSuspend(true); }}
                  disabled={pending}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-400/10 disabled:opacity-50"
                >
                  Suspender
                </button>
              )}
              {creator.status === 'rejected' && (
                <button
                  type="button"
                  onClick={handleReopen}
                  disabled={pending}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
                >
                  {pending ? '...' : 'Reabrir solicitud'}
                </button>
              )}
              {creator.status === 'suspended' && (
                <button
                  type="button"
                  onClick={handleReactivate}
                  disabled={pending}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-success transition-colors hover:bg-success/10 disabled:opacity-50"
                >
                  {pending ? '...' : 'Restaurar acceso'}
                </button>
              )}
              {creator.status === 'reopened' && (
                <span className="text-xs text-text-muted">El usuario puede volver a solicitar acceso.</span>
              )}
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        </td>
      </tr>

      {showReject && (
        <tr>
          <td colSpan={5} className="bg-surface-elevated px-4 py-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                await handleReject(fd);
              }}
              className="flex flex-col gap-3"
            >
              <p className="text-sm font-medium text-text-primary">Rechazar solicitud</p>
              <textarea
                name="reason"
                rows={3}
                required
                placeholder="Ej. Actualmente estamos priorizando creadores con actividad constante en Twitch."
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg border border-danger px-4 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                >
                  {pending ? 'Rechazando...' : 'Confirmar rechazo'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowReject(false); setError(null); }}
                  disabled={pending}
                  className="rounded-lg bg-surface px-4 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}

      {showSuspend && (
        <tr>
          <td colSpan={5} className="bg-surface-elevated px-4 py-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                await handleSuspend(fd);
              }}
              className="flex flex-col gap-3"
            >
              <p className="text-sm font-medium text-text-primary">Suspender acceso al modo creador</p>
              <textarea
                name="reason"
                rows={3}
                required
                placeholder="Ej. Detectamos actividad que incumple las condiciones del programa."
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg border border-danger px-4 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                >
                  {pending ? 'Suspendiendo...' : 'Confirmar suspensión'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSuspend(false); setError(null); }}
                  disabled={pending}
                  className="rounded-lg bg-surface px-4 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
