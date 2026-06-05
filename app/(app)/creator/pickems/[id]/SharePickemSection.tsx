'use client';

import { useState, useRef, useEffect } from 'react';

function getBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return 'http://localhost:3000';
}

export function SharePickemSection({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = `${getBaseUrl()}/pickems/${slug}`;

  useEffect(() => {
    if (showToast) {
      toastTimer.current = setTimeout(() => setShowToast(false), 2500);
    }
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [showToast]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShowToast(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById('share-url-input') as HTMLInputElement;
      if (input) input.select();
    }
  };

  return (
    <div className="rounded-lg border border-purple-primary/30 bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Compartir Pick'em</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Invita a tu comunidad a participar en este Pick'em.
          </p>
        </div>

        {showToast && (
          <div className="rounded-lg bg-success/20 px-3 py-1.5 text-xs font-medium text-success transition-opacity">
            Enlace copiado al portapapeles
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          id="share-url-input"
          type="text"
          readOnly
          value={url}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-primary"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-lg border border-purple-primary px-3 py-2 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
        >
          {copied ? 'Copiado' : 'Copiar enlace'}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-purple-primary px-3 py-2 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
        >
          Abrir
        </a>
      </div>
    </div>
  );
}
