'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { ShareablePredictionCard, CARD_W, CARD_H } from './ShareablePredictionCard';

interface RankedPlayer {
  position: number;
  label: string;
  countryCode: string | null;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventSlug: string;
  eventLogoUrl: string | null;
  creatorLabel: string;
  participantName: string;
  submittedAt: string | null;
  rankedPlayers: RankedPlayer[];
}

export function ReceiptModal({
  isOpen,
  onClose,
  eventTitle,
  eventSlug,
  eventLogoUrl,
  creatorLabel,
  participantName,
  submittedAt,
  rankedPlayers,
}: ReceiptModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'unsupported'>('idle');

  useEffect(() => {
    if (!isOpen) {
      setCopyStatus('idle');
    }
  }, [isOpen]);

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
      const username = participantName.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
      link.download = `pickhub-${eventSlug}-${username}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al descargar imagen:', err);
    } finally {
      setDownloading(false);
    }
  }, [eventSlug, participantName]);

  const handleCopy = useCallback(async () => {
    if (!cardRef.current) return;
    setCopying(true);
    try {
      const blob = await toBlob(cardRef.current, {
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 2,
        cacheBust: true,
      });
      if (!blob) return;
      if (!navigator.clipboard || !window.ClipboardItem) {
        setCopyStatus('unsupported');
        setTimeout(() => setCopyStatus('idle'), 3000);
        return;
      }
      await navigator.clipboard.write([
        new window.ClipboardItem({ 'image/png': blob }),
      ]);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2500);
    } catch (err) {
      console.error('Error al copiar imagen:', err);
      if (err instanceof DOMException || (err as Error)?.name === 'NotAllowedError') {
        setCopyStatus('unsupported');
        setTimeout(() => setCopyStatus('idle'), 3000);
      }
    } finally {
      setCopying(false);
    }
  }, []);

  if (!isOpen) return null;

  const scaleRatio = Math.min(
    0.75 * window.innerHeight / CARD_H,
    0.9 * window.innerWidth / CARD_W,
    1,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-3xl flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Mi comprobante</h2>
            <p className="text-sm text-text-muted">Comparte tu predicción del Pick&rsquo;em.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="flex justify-center overflow-auto rounded-xl bg-black/40 p-4">
          <div
            style={{
              width: CARD_W * scaleRatio,
              height: CARD_H * scaleRatio,
              overflow: 'hidden',
              borderRadius: 12,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                transform: `scale(${scaleRatio})`,
                transformOrigin: 'top left',
                width: CARD_W,
                height: CARD_H,
              }}
            >
              <ShareablePredictionCard
                ref={cardRef}
                eventTitle={eventTitle}
                eventLogoUrl={eventLogoUrl}
                creatorLabel={creatorLabel}
                participantName={participantName}
                submittedAt={submittedAt}
                rankedPlayers={rankedPlayers}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" />
                <path d="M7 10L12 15L17 10" />
                <path d="M12 15V3" />
              </svg>
              {downloading ? 'Generando...' : 'Descargar imagen'}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={copying}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-primary px-4 py-2 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" />
              </svg>
              {copying ? 'Copiando...' : 'Copiar imagen'}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        {/* Status messages */}
        {copyStatus === 'copied' && (
          <p className="text-sm text-purple-primary">¡Imagen copiada al portapapeles!</p>
        )}
        {copyStatus === 'unsupported' && (
          <p className="text-sm text-text-muted">
            Tu navegador no permite copiar imágenes. Puedes descargarla.
          </p>
        )}
      </div>
    </div>
  );
}
