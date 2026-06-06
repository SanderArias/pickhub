'use client';

interface ConfirmActionModalProps {
  title: string;
  description: string;
  consequences: string[];
  confirmLabel: string;
  cancelLabel?: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'warning';
}

export function ConfirmActionModal({
  title,
  description,
  consequences,
  confirmLabel,
  cancelLabel = 'Cancelar',
  isPending,
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmActionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{description}</p>

        <div className="mt-4 space-y-1.5">
          {consequences.map((item) => (
            <div key={item} className="flex items-start gap-2 text-xs text-text-muted">
              <svg className="mt-0.5 size-3.5 shrink-0 text-success" viewBox="0 0 16 16" fill="none">
                <path d="M4 8L6.5 10.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              variant === 'warning'
                ? 'bg-warning hover:bg-warning/80'
                : 'bg-purple-primary hover:bg-purple-600'
            }`}
          >
            {isPending ? (variant === 'warning' ? 'Procesando...' : 'Publicando...') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
