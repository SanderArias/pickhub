'use client';

import { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { CARD_W, CARD_H, PredictionShareCard } from './PredictionShareCard';
import { getAppUrl } from '@/lib/app-url';

const getBaseUrl = getAppUrl;

interface PredictionSelectionExpandableProps {
  questionTitle: string;
  selectedLabels: string[];
  isSingle: boolean;
  isTop8?: boolean;
  eventTitle: string;
  creatorLabel: string;
}

export function PredictionSelectionExpandable({
  questionTitle,
  selectedLabels,
  isSingle,
  isTop8,
  eventTitle,
  creatorLabel,
}: PredictionSelectionExpandableProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'unsupported'>('idle');

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      const slug = eventTitle.toLowerCase().replace(/\s+/g, '-').slice(0, 30);
      link.download = `pickhub-${slug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al descargar imagen:', err);
    } finally {
      setDownloading(false);
    }
  }, [eventTitle]);

  const handleCopyImage = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 2,
        cacheBust: true,
      });
      if (!navigator.clipboard || !ClipboardItem) {
        setCopyStatus('unsupported');
        setTimeout(() => setCopyStatus('idle'), 2500);
        return;
      }
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Error al copiar imagen:', err);
      if (err instanceof DOMException || (err as Error)?.name === 'NotAllowedError') {
        setCopyStatus('unsupported');
        setTimeout(() => setCopyStatus('idle'), 2500);
      }
    }
  }, []);

  const selectedText = selectedLabels.length > 0 ? selectedLabels.join(', ') : 'Sin selección';

  return (
    <div className="border-b border-border pb-3 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary">{questionTitle}</p>
          <p className="mt-0.5 text-xs text-text-muted truncate">{selectedText}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary/10"
        >
          {expanded ? 'Ocultar' : 'Ver selección'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-4">
          {/* Preview */}
          <div
            style={{
              width: 340,
              height: (340 / CARD_W) * CARD_H,
              overflow: 'hidden',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)',
              position: 'relative',
            }}
          >
            <div
              style={{
                transform: `scale(${340 / CARD_W})`,
                transformOrigin: 'top left',
                width: CARD_W,
                height: CARD_H,
              }}
            >
              <PredictionShareCard
                ref={cardRef}
                eventTitle={eventTitle}
                creatorLabel={creatorLabel}
                questionTitle={questionTitle}
                selectedLabels={selectedLabels}
                isSingle={isSingle}
                isTop8={isTop8}
              />
            </div>
          </div>

          {/* Buttons */}
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-primary px-3 py-2 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2" />
              </svg>
              Copiar imagen
            </button>
          </div>

          {/* Status messages */}
          {copyStatus === 'copied' && (
            <p className="text-xs text-purple-primary">¡Copiado al portapapeles!</p>
          )}
          {copyStatus === 'unsupported' && (
            <p className="text-xs text-text-muted">
              Copiar imagen no está disponible en este navegador. Usa &quot;Descargar imagen&quot;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
