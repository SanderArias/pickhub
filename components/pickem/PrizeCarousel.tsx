'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { Prize } from '@/app/actions/participant';
import { CompactPrizeCard } from './CompactPrizeCard';

export function PrizeCarousel({
  generalPrizes,
  subPrizes,
  stackingPolicy,
}: {
  generalPrizes: Prize[];
  subPrizes: Prize[];
  stackingPolicy: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const allPrizes = [...generalPrizes, ...subPrizes];

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => el.removeEventListener('scroll', checkScroll);
  }, [checkScroll]);

  if (allPrizes.length === 0) return null;

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 146;
    el.scrollBy({
      left: dir === 'left' ? -cardWidth : cardWidth,
      behavior: 'smooth',
    });
  }

  const showArrows = allPrizes.length > 3;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Premios</h2>
        <span className="text-xs text-text-muted">
          {allPrizes.length} premio{allPrizes.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative group">
        {/* Left arrow */}
        {showArrows && canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Desplazar premios a la izquierda"
            className="absolute -left-2.5 top-1/2 z-10 -translate-y-1/2 flex size-7 items-center justify-center rounded-full border border-border bg-surface text-text-secondary shadow-sm hover:text-text-primary transition-opacity"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {generalPrizes.map((p, i) => (
            <CompactPrizeCard key={p.id} prize={p} position={i + 1} isSub={false} />
          ))}
          {subPrizes.map((p, i) => (
            <CompactPrizeCard key={p.id} prize={p} position={i + 1} isSub={true} />
          ))}
        </div>

        {/* Right arrow */}
        {showArrows && canScrollRight && (
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Desplazar premios a la derecha"
            className="absolute -right-2.5 top-1/2 z-10 -translate-y-1/2 flex size-7 items-center justify-center rounded-full border border-border bg-surface text-text-secondary shadow-sm hover:text-text-primary transition-opacity"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* Policy note */}
      {subPrizes.length > 0 && (
        <p className="text-xs text-text-muted">
          {stackingPolicy === 'allow_multiple_prizes'
            ? 'Los suscriptores también compiten por los premios generales.'
            : 'Si un suscriptor gana un premio general, el beneficio exclusivo pasa al siguiente suscriptor.'}
        </p>
      )}
    </section>
  );
}
