'use client';

interface PublishConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  publishing: boolean;
}

export function PublishConfirmModal({ onConfirm, onCancel, publishing }: PublishConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-text-primary">Publicar resultados</h3>
        <p className="mt-2 text-sm text-text-secondary">
          Vas a registrar los resultados oficiales, calcular las puntuaciones y completar este Pick'em. Esta accion no podra editarse despues.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={publishing}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={publishing}
            className="rounded-lg bg-purple-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
          >
            {publishing ? 'Publicando...' : 'Sí, publicar resultados'}
          </button>
        </div>
      </div>
    </div>
  );
}
