'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface DragOffset {
  x: number;
  y: number;
}

export interface UseDraggableWindowResult {
  /** Attach to the draggable element (the window). */
  windowRef: React.RefObject<HTMLDivElement | null>;
  /** Current translate offset from the window's flow position. */
  offset: DragOffset;
  /** True while a drag is in progress. */
  dragging: boolean;
  /** True only on viewports >= 900px (matchMedia). */
  dragEnabled: boolean;
  /** Attach to the title bar: pointerdown starts, pointermove drags. */
  titleBarHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

/**
 * Hand-rolled window dragging (Pointer Events, ~60 lines): pointerdown
 * on the title bar captures the pointer, moves translate the window by
 * the pointer delta, pointerup releases. Active only at >= 900px
 * (matchMedia `min-width: 900px`); below that the window stays in flow
 * and is not draggable. The window is never taken out of flow — drag
 * only applies a `transform: translate()`, so layout and scrolling keep
 * working and the window can always be dragged back.
 */
export function useDraggableWindow(): UseDraggableWindowResult {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const sync = () => setDragEnabled(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!dragEnabled) return;
      // Title-bar buttons (min/max/close) must not start a drag.
      if ((e.target as HTMLElement).closest('button')) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: offsetRef.current.x,
        originY: offsetRef.current.y
      };
      setDragging(true);
    },
    [dragEnabled]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset({
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY)
    });
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }, []);

  return {
    windowRef,
    offset,
    dragging,
    dragEnabled,
    titleBarHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag
    }
  };
}
