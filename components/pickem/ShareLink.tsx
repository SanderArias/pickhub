'use client';

import { useState } from 'react';
import { getAppUrl } from '@/lib/app-url';

const getBaseUrl = getAppUrl;

export function ShareLink({ slug, isPublished }: { slug: string; isPublished: boolean }) {
  const [copied, setCopied] = useState(false);

  if (!isPublished) {
    return (
      <p className="text-xs text-text-muted">
        El enlace estará disponible cuando inicies el Pick’em.
      </p>
    );
  }

  const url = `${getBaseUrl()}/pickems/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select the input text
      const input = document.getElementById('share-link-input') as HTMLInputElement;
      if (input) {
        input.select();
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          id="share-link-input"
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
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-xs text-purple-primary transition-colors hover:text-purple-hover"
      >
        Abrir vista pública &rarr;
      </a>
    </div>
  );
}
