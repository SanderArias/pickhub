'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { closePredictions } from '@/app/actions/creator';

export function ClosePredictionsButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(async () => {
    setPending(true);
    setError(null);
    const result = await closePredictions(eventId);
    if (result.error) {
      setError(result.error);
      setPending(false);
    } else {
      router.refresh();
    }
  }, [eventId, router]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted">
        Al cerrar las predicciones, los usuarios no podrán enviar nuevas participaciones.
        Podrás registrar los resultados reales después de cerrar.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClose}
          disabled={pending}
          className="rounded-lg border border-warning-border px-4 py-2 text-sm font-medium text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
        >
          {pending ? 'Cerrando...' : 'Cerrar predicciones'}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
