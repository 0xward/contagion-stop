'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/icons';
import { TERMINAL_NAV_LINKS } from '@/components/layout/dashboard-nav';
import { useMotionPreference } from '@/components/terminal/motion-provider';
import { cn } from '@/lib/utils';

/** Live taskbar clock — client-only (renders after mount so the server
 * HTML never mismatches). Format matches the Win98 tray: `4:26 PM`. */
function TaskbarClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const label = now
    ? new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(now)
    : '--:--';

  return (
    <span className='win98-taskbar-clock' aria-label={`Current time, ${label}`}>
      {label}
    </span>
  );
}

export interface Win98TaskbarProps {
  /** The main page window is currently visible. */
  mainOpen: boolean;
  /** Restore the main page window (after Close / Minimize). */
  onRestoreMain: () => void;
}

/**
 * Windows 98 taskbar (fixed to the bottom, silver, bevel top edge):
 * Start button + Start menu (Overview / Vaults / History / Docs,
 * Motion switch, Shut Down…), one task button per open section, live
 * clock in the tray. On phones the Start button, the active task and
 * the clock stay usable; inactive task buttons hide below `sm`.
 */
export function Win98Taskbar({ mainOpen, onRestoreMain }: Win98TaskbarProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [shutdownOpen, setShutdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { motionOn, toggleMotion } = useMotionPreference();

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // Close the Start menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <div className='win98-taskbar fixed inset-x-0 bottom-0 z-50 flex h-10 items-center gap-1 px-1'>
        <div className='relative shrink-0' ref={menuRef}>
          <button
            type='button'
            className='win98-start-button flex items-center gap-1.5'
            aria-expanded={menuOpen}
            aria-haspopup='menu'
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span
              aria-hidden='true'
              className='inline-block size-3.5 shrink-0 bg-[#000080]'
              style={{
                boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff'
              }}
            />
            Start
          </button>
          {menuOpen ? (
            <div
              role='menu'
              aria-label='Start menu'
              className='window win98-start-menu absolute bottom-11 left-0 z-50 p-[3px]'
            >
              <div className='title-bar'>
                <div className='title-bar-text'>ContagionStop</div>
              </div>
              <div className='window-body flex flex-col gap-0.5 !m-1'>
                {TERMINAL_NAV_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      role='menuitem'
                      className='win98-start-menu-item'
                      onClick={() => {
                        setMenuOpen(false);
                        onRestoreMain();
                      }}
                    >
                      <Icon className='size-4 shrink-0' />
                      {link.label}
                    </Link>
                  );
                })}
                <div aria-hidden='true' className='my-1 border-t border-[#808080]' />
                <button
                  type='button'
                  role='menuitem'
                  className='win98-start-menu-item'
                  onClick={() => {
                    toggleMotion();
                    setMenuOpen(false);
                  }}
                >
                  <Icons.activity className='size-4 shrink-0' />
                  Motion: {motionOn ? 'On' : 'Off'}
                </button>
                <button
                  type='button'
                  role='menuitem'
                  className='win98-start-menu-item'
                  onClick={() => {
                    setMenuOpen(false);
                    setShutdownOpen(true);
                  }}
                >
                  <Icons.power className='size-4 shrink-0' />
                  Shut Down…
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div
          aria-hidden='true'
          className='mx-1 h-6 w-px shrink-0 bg-[#808080] shadow-[1px_0_0_#fff]'
        />

        {/* Task buttons: one per section; the active one stays pressed. */}
        <nav
          className='flex min-w-0 flex-1 items-center gap-1 overflow-hidden'
          aria-label='Open windows'
        >
          {TERMINAL_NAV_LINKS.map((link) => {
            const [path, anchor] = link.href.split('#');
            const active =
              pathname === path && (anchor ? hash === `#${anchor}` : hash === '');
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  if (active) onRestoreMain();
                }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'win98-task-button',
                  !active && 'max-sm:hidden',
                  'flex items-center gap-1.5 px-2 py-1 text-[11px] text-black no-underline'
                )}
                data-active={active && mainOpen ? 'true' : 'false'}
                style={{
                  background: 'silver',
                  boxShadow:
                    active && mainOpen
                      ? 'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey'
                      : 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf'
                }}
              >
                <Icon className='size-3.5 shrink-0' />
                <span className='truncate'>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <TaskbarClock />
      </div>

      {/* Shut Down… dialog — classic "It is now safe to turn off your
          computer." Nothing actually shuts down; OK dismisses it. */}
      {shutdownOpen ? (
        <div
          className='fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4'
          role='dialog'
          aria-modal='true'
          aria-label='Shut down'
          onClick={() => setShutdownOpen(false)}
        >
          <div
            className='window w-full max-w-sm'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='title-bar'>
              <div className='title-bar-text'>Shut Down ContagionStop</div>
              <div className='title-bar-controls'>
                <button
                  type='button'
                  aria-label='Close'
                  onClick={() => setShutdownOpen(false)}
                />
              </div>
            </div>
            <div className='window-body'>
              <p className='text-[12px]'>
                It is now safe to turn off your computer.
              </p>
              <p className='mt-2 text-[12px] text-[#404040]'>
                Closing this window changes nothing on-chain. The watcher
                contract stays as deployed on Lasna and reacts only to
                on-chain events.
              </p>
              <div className='mt-4 flex justify-center'>
                <button type='button' onClick={() => setShutdownOpen(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
