'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { ReceiptCard, CARD_W, getReceiptDimensions } from './ReceiptCard';
import type { ReceiptTemplate } from '@/lib/receipt-templates';

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
  subtitle?: string;
  eventLogoUrl?: string | null;
  participantName: string;
  rankedPlayers: RankedPlayer[];
  receiptTemplate?: ReceiptTemplate;
}

export function ReceiptModal({
  isOpen,
  onClose,
  eventTitle,
  eventSlug,
  subtitle,
  eventLogoUrl,
  participantName,
  rankedPlayers,
  receiptTemplate = 'classic',
}: ReceiptModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'unsupported'>('idle');
  const [scale, setScale] = useState(1);

  const { width: canvasW, height: canvasH } = getReceiptDimensions(rankedPlayers.length);

  const calcScale = useCallback(() => {
    if (!previewRef.current) return;
    const { clientWidth: w, clientHeight: h } = previewRef.current;
    if (w <= 0 || h <= 0) return;
    const { width: cw, height: ch } = getReceiptDimensions(rankedPlayers.length);
    const aw = w - 40;
    const ah = h - 24;
    const s = Math.min(aw / cw, ah / ch, 1);
    setScale(s);
  }, [rankedPlayers.length]);

  useEffect(() => {
    if (!previewRef.current) return;
    const el = previewRef.current;
    const ro = new ResizeObserver(calcScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [calcScale]);

  useEffect(() => {
    if (!isOpen) {
      setCopyStatus('idle');
      return;
    }
    calcScale();
  }, [isOpen, calcScale]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const previewW = canvasW * scale;
  const previewH = canvasH * scale;

  const waitForAssets = useCallback(async () => {
    await document.fonts.ready;
    if (!cardRef.current) return;
    const images = cardRef.current.querySelectorAll('img');
    if (images.length === 0) return;
    await Promise.all(Array.from(images).map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }));
  }, []);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      await waitForAssets();
      const { width: ew, height: eh } = getReceiptDimensions(rankedPlayers.length);
      const dataUrl = await toPng(cardRef.current, {
        width: ew,
        height: eh,
        pixelRatio: 2,
        cacheBust: true,
        imagePlaceholder: '',
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
  }, [eventSlug, participantName, waitForAssets, rankedPlayers.length]);

  const handleCopy = useCallback(async () => {
    if (!cardRef.current) return;
    setCopying(true);
    try {
      await waitForAssets();
      const { width: ew, height: eh } = getReceiptDimensions(rankedPlayers.length);
      const blob = await toBlob(cardRef.current, {
        width: ew,
        height: eh,
        pixelRatio: 2,
        cacheBust: true,
        imagePlaceholder: '',
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
  }, [waitForAssets, rankedPlayers.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2.5 backdrop-blur-[1px] sm:p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-[#09090b] shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
        style={{
          maxWidth: 920,
          maxHeight: 880,
          height: 'calc(100dvh - 32px)',
          width: 'calc(100vw - 40px)',
        }}
      >
        <div className="flex h-full flex-col" style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto' }}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white">Mi comprobante</h2>
              <p className="mt-0.5 text-sm text-text-muted">Comparte tu predicci&oacute;n del Pick&rsquo;em.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar comprobante"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            ref={previewRef}
            className="flex min-h-0 items-center justify-center overflow-hidden px-5 py-3 max-sm:overflow-y-auto max-sm:items-start"
          >
            <div
              style={{
                width: previewW,
                height: previewH,
                overflow: 'hidden',
                borderRadius: 16,
                flexShrink: 0,
                boxShadow: '0 8px 60px rgba(0,0,0,0.6)',
              }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: canvasW,
                  height: canvasH,
                }}
              >
                <ReceiptCard
                  ref={cardRef}
                  template={receiptTemplate}
                  eventTitle={eventTitle}
                  subtitle={subtitle}
                  eventLogoUrl={eventLogoUrl}
                  participantName={participantName}
                  rankedPlayers={rankedPlayers}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-[#0d0d0f] px-5 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex h-[38px] items-center gap-1.5 rounded-lg bg-purple-primary px-4 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
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
                className="inline-flex h-[38px] items-center gap-1.5 rounded-lg border border-purple-primary px-4 text-sm font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white disabled:opacity-50"
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
              className="inline-flex h-[38px] items-center rounded-lg border border-border px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-white/5"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {copyStatus === 'copied' && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-purple-primary/20 px-4 py-2 text-sm text-purple-primary">
          &iexcl;Imagen copiada al portapapeles!
        </p>
      )}
      {copyStatus === 'unsupported' && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-surface px-4 py-2 text-sm text-text-muted">
          Tu navegador no permite copiar im&aacute;genes. Puedes descargarla.
        </p>
      )}
    </div>
  );
}
