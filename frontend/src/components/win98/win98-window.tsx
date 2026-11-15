'use client';

import { useState } from 'react';
import { useDraggableWindow } from '@/components/win98/use-draggable-window';
import { cn } from '@/lib/utils';

export interface Win98WindowProps {
  /** Text in the navy title bar. */
  title: string;
  /** Window content. */
  children: React.ReactNode;
  /** Extra classes for the outer `.window` element. */
  className?: string;
  /** Called when the Close button is pressed. When omitted the window
   * hides itself (parent can restore it, e.g. via the taskbar). */
  onClose?: () => void;
  /** When false the window renders nothing (controlled visibility). */
  open?: boolean;
  /** When false the Minimize / Maximize / Close buttons are hidden
   * (e.g. small helper windows). Defaults to true. */
  showControls?: boolean;
  /** When true the window takes the full available width. */
  maximized?: boolean;
  /** Called when the Maximize button toggles. */
  onMaximizedChange?: (maximized: boolean) => void;
}

/**
 * A Windows 98 window: 98.css `.window` chrome (navy gradient title
 * bar + Min/Max/Close), draggable by its title bar on desktop
 * (>= 900px), stacked in flow below that. Minimize collapses the body
 * to the title bar; Maximize toggles full width; Close hides the window
 * (or calls `onClose`). Mount plays the short open animation from
 * `win98.css` (gated by reduced-motion / Motion off).
 */
export function Win98Window({
  title,
  children,
  className,
  onClose,
  open = true,
  showControls = true,
  maximized = false,
  onMaximizedChange
}: Win98WindowProps) {
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { windowRef, offset, dragging, dragEnabled, titleBarHandlers } =
    useDraggableWindow();

  if (!open || hidden) return null;

  const handleClose = () => {
    if (onClose) onClose();
    else setHidden(true);
  };

  return (
    <section
      ref={windowRef}
      aria-label={title}
      className={cn('window win98-window-enter', dragging && 'win98-window-dragging', className)}
      style={{
        transform:
          offset.x !== 0 || offset.y !== 0
            ? `translate(${offset.x}px, ${offset.y}px)`
            : undefined,
        width: maximized ? '100%' : undefined
      }}
    >
      <div
        className='title-bar win98-window-titlebar'
        data-draggable={dragEnabled ? 'true' : 'false'}
        {...titleBarHandlers}
      >
        <div className='title-bar-text'>{title}</div>
        {showControls ? (
          <div className='title-bar-controls'>
            <button
              type='button'
              aria-label='Minimize'
              title='Minimize'
              aria-pressed={minimized}
              onClick={() => setMinimized((prev) => !prev)}
            />
            <button
              type='button'
              aria-label={maximized ? 'Restore' : 'Maximize'}
              title={maximized ? 'Restore' : 'Maximize'}
              onClick={() => onMaximizedChange?.(!maximized)}
            />
            <button type='button' aria-label='Close' title='Close' onClick={handleClose} />
          </div>
        ) : null}
      </div>
      {minimized ? null : <div className='window-body'>{children}</div>}
    </section>
  );
}
