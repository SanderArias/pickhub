'use client';

import { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { ShareImageCard } from './ShareImageCard';
import { getAppUrl } from '@/lib/app-url';

interface Player {
  id: string;
  name: string;
  is_active: boolean;
}

interface Creator {
  handle: string | null;
  display_name: string | null;
  avatar_url?: string | null;
}

interface ShareSectionProps {
  title: string;
  description?: string | null;
  creator: Creator | null;
  players: Player[];
  slug: string;
  status: string;
  isPublished: boolean;
}

const getBaseUrl = getAppUrl;

export function ShareSection({ title, description, creator, players, slug, status, isPublished }: ShareSectionProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 1200,
        height: 630,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `pickhub-${slug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al descargar imagen:', err);
    } finally {
      setDownloading(false);
    }
  }, [slug]);

  const handleCopyImage = useCallback(async () => {
    if (!cardRef.current) return;
    setCopying(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 1200,
        height: 630,
        pixelRatio: 2,
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar imagen:', err);
    } finally {
      setCopying(false);
    }
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = `${getBaseUrl()}/pickems/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [slug]);

  return (
    <div className="flex flex-col gap-4">
      <div
        style={{
          transform: 'scale(0.5)',
          transformOrigin: 'top left',
          width: 1200,
          height: 630,
          overflow: 'hidden',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <ShareImageCard
          ref={cardRef}
          title={title}
          description={description}
          creator={creator}
          players={players}
          slug={slug}
          status={status}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-primary px-3 py-2 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {downloading ? 'Generando...' : 'Descargar imagen'}
        </button>

        <button
          type="button"
          onClick={handleCopyImage}
          disabled={copying}
          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-primary px-3 py-2 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2" />
          </svg>
          {copying ? 'Copiando...' : 'Copiar imagen'}
        </button>

        {isPublished && (
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={copying}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-primary px-3 py-2 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6898C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.4791 3.5309C19.5521 2.60389 18.298 2.07799 16.987 2.0666C15.6761 2.05521 14.413 2.55921 13.47 3.47L11.75 5.18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 11C13.5705 10.4259 13.0226 9.95087 12.3934 9.60708C11.7643 9.26329 11.0685 9.05889 10.3533 9.00768C9.63817 8.95648 8.92038 9.05972 8.24865 9.31024C7.57692 9.56076 6.96693 9.95304 6.46002 10.46L3.46002 13.46C2.54919 14.403 2.04519 15.6661 2.05658 16.977C2.06797 18.288 2.59387 19.5421 3.52088 20.4691C4.44789 21.3961 5.70196 21.922 7.01294 21.9334C8.32392 21.9448 9.58693 21.4408 10.53 20.53L12.24 18.82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {copying ? 'Copiando...' : 'Copiar enlace publico'}
          </button>
        )}
      </div>

      {copied && (
        <p className="text-xs text-purple-primary">¡Copiado al portapapeles!</p>
      )}

      {!isPublished && (
        <p className="text-xs text-text-muted">
          El enlace publico estara disponible cuando inicies el Pick’em.
        </p>
      )}
    </div>
  );
}
