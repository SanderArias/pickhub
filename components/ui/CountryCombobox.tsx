'use client';

import { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { COUNTRIES, normalizeCountrySearch, getFlagEmoji } from '@/lib/countries';

interface CountryComboboxProps {
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (countryCode: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

const NONE_OPTION = { code: null as string | null, name: 'Sin país', flag: '' };

export function CountryCombobox({
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  disabled = false,
  compact = false,
}: CountryComboboxProps) {
  const id = useId();
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string | null>(
    defaultValue ?? null,
  );
  const selectedCode = isControlled ? (controlledValue ?? null) : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allOptions = useMemo(
    () => [NONE_OPTION, ...COUNTRIES],
    [],
  );

  const selectedOpt = useMemo(
    () => allOptions.find((o) => o.code === selectedCode) ?? NONE_OPTION,
    [allOptions, selectedCode],
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return allOptions;
    const q = normalizeCountrySearch(searchQuery);
    return allOptions.filter((opt) => {
      if (!opt.code) return false;
      return (
        normalizeCountrySearch(opt.name).includes(q) ||
        opt.code.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, allOptions]);

  const safeFocusedIndex = useMemo(
    () => Math.min(focusedIndex, Math.max(0, filteredOptions.length - 1)),
    [focusedIndex, filteredOptions.length],
  );

  const filteredOptionsRef = useRef(filteredOptions);
  const safeFocusedIndexRef = useRef(safeFocusedIndex);

  useEffect(() => {
    filteredOptionsRef.current = filteredOptions;
    safeFocusedIndexRef.current = safeFocusedIndex;
  });

  const handleSelect = useCallback(
    (code: string | null) => {
      if (!isControlled) setInternalValue(code);
      setIsOpen(false);
      setSearchQuery('');
      onChange?.(code);
    },
    [isControlled, onChange],
  );

  const handleSelectRef = useRef(handleSelect);
  useEffect(() => {
    handleSelectRef.current = handleSelect;
  });

  const toggleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => {
      if (!prev) {
        setSearchQuery('');
        setFocusedIndex(0);
      }
      return !prev;
    });
  }, [disabled]);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spacing = 4;
    const estimatedHeight = 420;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow >= estimatedHeight
        ? rect.bottom + spacing
        : Math.max(spacing, rect.top - estimatedHeight);
    setMenuStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${Math.max(8, rect.left)}px`,
      minWidth: `${Math.max(rect.width, compact ? 200 : 260)}px`,
    });
  }, [compact]);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const opts = filteredOptionsRef.current;
      const sfi = safeFocusedIndexRef.current;

      if (e.key === 'Tab') {
        setIsOpen(false);
        setSearchQuery('');
        return;
      }

      if (e.key.length === 1 && /^[\p{L}0-9]$/u.test(e.key)) {
        setSearchQuery((prev) => prev + e.key);
        return;
      }

      if (e.key === 'Backspace') {
        setSearchQuery((prev) => prev.slice(0, -1));
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, opts.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (opts.length > 0) {
          const idx = Math.min(sfi, opts.length - 1);
          handleSelectRef.current(opts[idx].code);
        }
        return;
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const buttonLabel = compact
    ? `${selectedOpt.flag ? selectedOpt.flag + ' ' : ''}${selectedOpt.code ?? ''}`
    : selectedOpt.name;

  return (
    <div className="relative inline-flex">
      {name && (
        <input type="hidden" name={name} value={selectedCode ?? ''} />
      )}

      <button
        ref={buttonRef}
        id={`${id}-button`}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        aria-haspopup="listbox"
        aria-activedescendant={
          isOpen ? `${id}-option-${safeFocusedIndex}` : undefined
        }
        onClick={toggleOpen}
        disabled={disabled}
        className={[
          'flex items-center gap-2 text-left',
          'rounded-lg border bg-bg',
          'hover:border-border-hover',
          'focus:border-purple-primary focus:outline-none',
          'disabled:opacity-50',
          compact
            ? 'border-border px-2 py-1 text-xs text-text-muted'
            : 'border-border px-3 py-2 text-sm text-text-primary',
          isOpen ? 'border-purple-primary' : 'border-border',
          selectedCode ? 'text-text-primary' : '',
        ].join(' ')}
      >
        {compact && selectedCode ? (
          <span className="text-base leading-none">{getFlagEmoji(selectedCode)}</span>
        ) : selectedOpt.flag ? (
          <span className="shrink-0 text-base leading-none">{selectedOpt.flag}</span>
        ) : null}
        <span className="flex-1 truncate">{buttonLabel || 'Sin país'}</span>
        <svg
          className={[
            'size-3 shrink-0 transition-transform',
            compact ? 'text-text-muted/60' : 'text-text-muted',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={listRef}
            style={menuStyle}
            className="z-[9999] flex flex-col rounded-lg border border-border bg-surface shadow-lg"
          >
            <div className="border-b border-border px-2 py-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                placeholder="Buscar país..."
                className="w-full rounded-md border border-border bg-bg px-2 py-1 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-purple-primary"
              />
            </div>
            <ul
              id={`${id}-listbox`}
              role="listbox"
              className="pickhub-scrollbar max-h-[420px] overflow-auto"
              aria-label="Países"
              {...(compact ? { 'data-compact': '' as string } : {})}
            >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-text-muted">Sin resultados</li>
            ) : (
              filteredOptions.map((opt, index) => (
                <li
                  key={opt.code ?? '__none'}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={opt.code === selectedCode}
                  className={[
                    'flex cursor-pointer items-center gap-2 transition-colors',
                    compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
                    index === safeFocusedIndex
                      ? 'bg-surface-hover text-text-primary'
                      : 'text-text-secondary',
                    opt.code === selectedCode ? 'text-purple-primary' : '',
                  ].join(' ')}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt.code);
                  }}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  {opt.flag && (
                    <span className="shrink-0 text-base leading-none">{opt.flag}</span>
                  )}
                  {compact ? (
                    <>
                      <span className="font-medium text-text-primary">{opt.code}</span>
                      <span className="truncate text-text-secondary">{opt.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="truncate">{opt.name}</span>
                      {opt.code && (
                        <span className="ml-auto shrink-0 text-[10px] text-text-muted">{opt.code}</span>
                      )}
                    </>
                  )}
                </li>
              ))
            )}
          </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
