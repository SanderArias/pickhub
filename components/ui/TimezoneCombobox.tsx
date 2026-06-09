'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SUPPORTED_TIMEZONES, REGIONS, getTimezoneInfo } from '@/lib/timezones';

interface TimezoneComboboxProps {
  value: string;
  onChange: (tz: string) => void;
  targetDate?: Date;
}

export function TimezoneCombobox({ value, onChange, targetDate }: TimezoneComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const refDate = targetDate ?? new Date();
  const tzInfo = getTimezoneInfo(value, refDate);

  const filtered = useMemo(() => {
    if (!search) {
      return REGIONS.map((region) => ({
        region,
        zones: SUPPORTED_TIMEZONES.filter((tz) => tz.region === region),
      }));
    }
    const q = search.toLowerCase();
    const matched = SUPPORTED_TIMEZONES.filter(
      (tz) => tz.label.toLowerCase().includes(q) || tz.value.toLowerCase().includes(q) || tz.region.toLowerCase().includes(q),
    );
    const grouped = new Map<string, typeof SUPPORTED_TIMEZONES>();
    for (const tz of matched) {
      const list = grouped.get(tz.region) ?? [];
      list.push(tz);
      grouped.set(tz.region, list);
    }
    return REGIONS.map((region) => ({ region, zones: grouped.get(region) ?? [] }));
  }, [search]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${Math.max(8, rect.left)}px`,
      minWidth: `${Math.max(rect.width, 280)}px`,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        listRef.current && !listRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  function handleSelect(selectedValue: string) {
    onChange(selectedValue);
    setIsOpen(false);
    setSearch('');
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm transition-all hover:border-purple-primary/50"
      >
        <span className="text-base leading-none">{tzInfo.flag}</span>
        <span className="flex-1 truncate text-left text-xs text-text-primary">
          {tzInfo.label}
          <span className="ml-1 text-text-muted">{tzInfo.utcLabel}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-text-muted/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={listRef}
          style={menuStyle}
          className="z-[9999] flex flex-col rounded-lg border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border px-2 py-1.5">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar zona horaria…"
              className="w-full rounded-md border border-border bg-bg px-2 py-1 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-purple-primary"
            />
          </div>
          <div className="pickhub-scrollbar max-h-[320px] overflow-auto">
            {filtered.every((g) => g.zones.length === 0) ? (
              <div className="px-3 py-4 text-center text-xs text-text-muted">Sin resultados</div>
            ) : (
              filtered.map((group) =>
                group.zones.length > 0 ? (
                  <div key={group.region}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      {group.region}
                    </div>
                    {group.zones.map((tz) => {
                      const info = getTimezoneInfo(tz.value, refDate);
                      const selected = value === tz.value;
                      return (
                        <button
                          key={tz.value}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); handleSelect(tz.value); }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                            selected
                              ? 'bg-purple-primary text-white'
                              : 'text-text-secondary hover:bg-purple-primary/20 hover:text-white'
                          }`}
                        >
                          <span className="text-base leading-none">{info.flag}</span>
                          <span className="flex-1">{info.label}</span>
                          <span className={`text-[10px] ${selected ? 'text-white/70' : 'text-text-muted'}`}>
                            {info.utcLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null,
              )
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
