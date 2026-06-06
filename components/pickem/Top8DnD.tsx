'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactCountryFlag from 'react-country-flag';

interface PlayerInfo {
  optionId: string;
  playerId: string | null;
  label: string;
  countryCode: string | null;
}

const SLOT_IDS = ['slot-0', 'slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5', 'slot-6', 'slot-7'];

function SortableSlot({
  item,
  index,
  onRemove,
}: {
  item: PlayerInfo | null;
  index: number;
  onRemove: (optionId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: SLOT_IDS[index],
    data: { type: 'top8-slot', slotIndex: index },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
        isDragging
          ? 'z-10 border-purple-primary bg-purple-surface shadow-lg'
          : item
            ? 'border-border bg-surface'
            : 'border-dashed border-border bg-transparent'
      }`}
    >
      {item ? (
        <>
          <button
            type="button"
            className="flex size-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-text-muted hover:text-text-primary active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Arrastrar para reordenar"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="3" r="1.2" fill="currentColor" />
              <circle cx="9" cy="3" r="1.2" fill="currentColor" />
              <circle cx="5" cy="7" r="1.2" fill="currentColor" />
              <circle cx="9" cy="7" r="1.2" fill="currentColor" />
              <circle cx="5" cy="11" r="1.2" fill="currentColor" />
              <circle cx="9" cy="11" r="1.2" fill="currentColor" />
            </svg>
          </button>

          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
            {index + 1}
          </span>

          <span className="flex-1 truncate text-sm text-text-primary">{item.label}</span>

          {item.countryCode && (
            <span className="shrink-0">
              <ReactCountryFlag
                countryCode={item.countryCode}
                svg
                style={{ width: '1.1em', height: '1.1em' }}
                title={item.countryCode}
              />
            </span>
          )}

          <button
            type="button"
            onClick={() => onRemove(item.optionId)}
            className="flex size-5 shrink-0 items-center justify-center rounded text-text-muted hover:text-danger transition-colors"
            aria-label="Quitar jugador"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">
            {index + 1}
          </span>
          <span className="text-xs text-text-muted">
            Arrastra un jugador aquí
          </span>
        </>
      )}
    </div>
  );
}

function DraggablePoolItem({
  item,
  onAdd,
}: {
  item: PlayerInfo;
  onAdd: (optionId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool-${item.optionId}`,
    data: { type: 'pool', optionId: item.optionId },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
        isDragging ? 'opacity-30' : 'border-border bg-surface'
      }`}
    >
      <button
        type="button"
        className="flex size-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-text-muted hover:text-purple-primary active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para agregar"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <circle cx="5" cy="3" r="1.2" fill="currentColor" />
          <circle cx="9" cy="3" r="1.2" fill="currentColor" />
          <circle cx="5" cy="7" r="1.2" fill="currentColor" />
          <circle cx="9" cy="7" r="1.2" fill="currentColor" />
          <circle cx="5" cy="11" r="1.2" fill="currentColor" />
          <circle cx="9" cy="11" r="1.2" fill="currentColor" />
        </svg>
      </button>

      <span className="flex-1 truncate text-text-primary">{item.label}</span>

      {item.countryCode && (
        <span className="shrink-0">
          <ReactCountryFlag
            countryCode={item.countryCode}
            svg
            style={{ width: '1.1em', height: '1.1em' }}
            title={item.countryCode}
          />
        </span>
      )}

      <button
        type="button"
        onClick={() => onAdd(item.optionId)}
        className="shrink-0 rounded-md border border-purple-primary px-2 py-0.5 text-xs font-medium text-purple-primary transition-colors hover:bg-purple-primary hover:text-white"
      >
        + Agregar
      </button>
    </div>
  );
}

export function Top8DnD({
  questionId,
  activePlayers,
  options,
  initialRanked,
  onChange,
}: {
  questionId: string;
  activePlayers: Array<{ id: string; name: string; country_code: string | null }>;
  options: Array<{ id: string; playerId: string | null; label: string }>;
  initialRanked?: string[];
  onChange?: () => void;
}) {
  const playerLookup = useMemo(() => {
    const map = new Map<string, { name: string; country_code: string | null }>();
    for (const p of activePlayers) {
      map.set(p.id, { name: p.name, country_code: p.country_code });
    }
    return map;
  }, [activePlayers]);

  const allItems = useMemo((): PlayerInfo[] => {
    return options.map((o) => {
      let countryCode: string | null = null;
      if (o.playerId) {
        const p = playerLookup.get(o.playerId);
        if (p) countryCode = p.country_code;
      }
      return { optionId: o.id, playerId: o.playerId, label: o.label, countryCode };
    });
  }, [options, playerLookup]);

  const [top8, setTop8] = useState<(PlayerInfo | null)[]>(() => {
    if (initialRanked && initialRanked.length > 0) {
      const arr: (PlayerInfo | null)[] = Array(8).fill(null);
      for (let i = 0; i < Math.min(initialRanked.length, 8); i++) {
        const item = allItems.find((p) => p.optionId === initialRanked[i]);
        if (item) arr[i] = item;
      }
      return arr;
    }
    return Array(8).fill(null);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const rankedCount = useMemo(() => top8.filter(Boolean).length, [top8]);

  const { setNodeRef: poolDroppableRef, isOver: isPoolOver } = useDroppable({
    id: 'pool-area',
    data: { type: 'pool-area' },
  });

  const pool = useMemo(() => {
    const rankedIds = new Set(top8.filter(Boolean).map((p) => p!.optionId));
    return allItems.filter((item) => !rankedIds.has(item.optionId));
  }, [allItems, top8]);

  const filteredPool = useMemo(
    () =>
      pool.filter((item) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          (item.countryCode ?? '').toLowerCase().includes(q)
        );
      }),
    [pool, searchQuery],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAdd = useCallback(
    (optionId: string) => {
      setTop8((prev) => {
        const next = [...prev];
        const emptyIndex = next.findIndex((s) => s === null);
        if (emptyIndex === -1) return prev;
        const item = allItems.find((p) => p.optionId === optionId);
        if (!item) return prev;
        next[emptyIndex] = item;
        return next;
      });
      onChange?.();
    },
    [allItems, onChange],
  );

  const handleRemove = useCallback(
    (optionId: string) => {
      setTop8((prev) => {
        const idx = prev.findIndex((s) => s?.optionId === optionId);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = null;
        return next;
      });
      onChange?.();
    },
    [onChange],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over) return;

      const activeType = active.data.current?.type as string;
      const overId = over.id as string;

      if (activeType === 'pool') {
        const optionId = active.data.current?.optionId as string;
        if (!optionId) return;

        if (over.id === 'pool-area') return;

        const targetIndex = SLOT_IDS.indexOf(overId);
        if (targetIndex === -1) return;

        setTop8((prev) => {
          if (prev[targetIndex] !== null) return prev;
          if (prev.some((s) => s?.optionId === optionId)) return prev;
          const item = allItems.find((p) => p.optionId === optionId);
          if (!item) return prev;
          const next = [...prev];
          next[targetIndex] = item;
          return next;
        });
        onChange?.();
      } else if (activeType === 'top8-slot') {
        const activeIndex = active.data.current?.slotIndex as number;
        const overIndex = SLOT_IDS.indexOf(overId);

        if (overIndex === -1) return;

        if (overId === 'pool-area') {
          setTop8((prev) => {
            if (!prev[activeIndex]) return prev;
            const next = [...prev];
            next[activeIndex] = null;
            return next;
          });
          onChange?.();
        } else {
          setTop8((prev) => arrayMove(prev, activeIndex, overIndex));
          onChange?.();
        }
      }
    },
    [allItems, onChange],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const dragOverlayItem = useMemo(() => {
    if (!activeDragId) return null;
    if (activeDragId.startsWith('pool-')) {
      const optionId = activeDragId.slice(5);
      return allItems.find((i) => i.optionId === optionId) ?? null;
    }
    const index = SLOT_IDS.indexOf(activeDragId);
    if (index === -1) return null;
    return top8[index];
  }, [activeDragId, allItems, top8]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="sm:w-1/2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-text-secondary">Mi Top 8</p>
              <span className="text-xs text-text-muted">(0/8)</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 opacity-40">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-text-muted">{i + 1}</span>
                  <span className="text-xs text-text-muted">—</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sm:w-1/2">
          <div className="rounded-xl border border-border bg-surface p-5 opacity-40">
            <p className="text-xs font-medium text-text-secondary">Jugadores disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Top 8 — always first on mobile */}
        <div className="flex flex-col gap-3 sm:order-2 sm:w-1/2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-text-secondary">Mi Top 8</p>
              <span className="text-xs text-text-muted">({rankedCount}/8)</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <SortableContext items={SLOT_IDS} strategy={verticalListSortingStrategy}>
                {top8.map((item, index) => (
                  <SortableSlot
                    key={SLOT_IDS[index]}
                    item={item}
                    index={index}
                    onRemove={handleRemove}
                  />
                ))}
              </SortableContext>
            </div>
          </div>
        </div>

        {/* Pool */}
        <div
          ref={poolDroppableRef}
          className={`flex flex-col gap-3 sm:order-1 sm:w-1/2 transition-opacity ${
            isPoolOver ? 'opacity-60' : ''
          }`}
        >
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-text-secondary">Jugadores disponibles</p>
              <span className="text-xs text-text-muted">({pool.length})</span>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar jugador..."
              className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-primary focus:outline-none"
            />

            <div className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-1 pickhub-scrollbar">
              {filteredPool.length === 0 && (
                <p className="py-4 text-center text-xs text-text-muted">
                  {searchQuery ? 'Sin resultados' : 'No hay más jugadores disponibles'}
                </p>
              )}
              {filteredPool.map((item) => (
                <DraggablePoolItem
                  key={item.optionId}
                  item={item}
                  onAdd={handleAdd}
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {dragOverlayItem && (
            <div className="flex items-center gap-2 rounded-lg border border-purple-primary bg-purple-surface px-3 py-2.5 text-sm text-purple-primary shadow-lg">
              <span className="text-text-primary">{dragOverlayItem.label}</span>
              {dragOverlayItem.countryCode && (
                <ReactCountryFlag
                  countryCode={dragOverlayItem.countryCode}
                  svg
                  style={{ width: '1.1em', height: '1.1em' }}
                />
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Hidden inputs for form submission */}
      {top8.map((item, index) =>
        item ? (
          <input key={item.optionId} type="hidden" name={`q_${questionId}_${index + 1}`} value={item.optionId} />
        ) : null,
      )}
    </div>
  );
}
