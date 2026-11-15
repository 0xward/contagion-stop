'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Win98Window } from '@/components/win98/win98-window';
import { Win98Taskbar } from '@/components/win98/taskbar';
import { DesktopIcons } from '@/components/win98/desktop-icons';
import { Win98BootSplash } from '@/components/win98/boot-splash';
import { LiveDot } from '@/components/terminal/live-dot';
import { TxMarquee } from '@/components/terminal/tx-marquee';
import { MotionToggle } from '@/components/terminal/motion-toggle';
import HeaderWallet from '@/components/web3/header-wallet';

/**
 * Windows 98 desktop shell (replaces the Terminal sidebar shell):
 * teal desktop, desktop icons on the left (>= lg), a silver menu bar
 * (wordmark + system-armed + wallet + Motion switch), the tx ticker
 * restyled as a status strip, the page itself as one draggable 98.css
 * window, and the taskbar with Start menu + clock at the bottom.
 * The main window can be minimized / maximized / closed from its
 * title bar; the taskbar restores it.
 */
export function Win98Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mainOpen, setMainOpen] = useState(true);
  const [maximized, setMaximized] = useState(false);

  const title =
    pathname === '/dashboard/docs'
      ? 'ContagionStop — Docs'
      : 'ContagionStop — Overview';

  return (
    <div className='win98-scope win98-desktop relative flex min-h-screen flex-col text-foreground'>
      <Win98BootSplash />
      <a
        href='#main-content'
        className='sr-only bg-[#c0c0c0] px-3 py-2 text-sm font-medium text-black focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-[70]'
      >
        Skip to content
      </a>

      <div className='flex min-w-0 flex-1'>
        <DesktopIcons />

        <div className='flex min-w-0 flex-1 flex-col pb-14'>
          {/* ---- Menu bar (wordmark + wallet) ---- */}
          <header className='sticky top-0 z-20 border-b border-[#808080] bg-[#c0c0c0] px-3 py-2 shadow-[inset_0_-1px_#0a0a0a,inset_0_-2px_grey]'>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
              <Link
                href='/dashboard/overview'
                className='text-sm font-bold tracking-[0.18em] text-[#000080] uppercase no-underline'
              >
                ContagionStop
              </Link>
              <span className='hidden text-[11px] tracking-[0.14em] text-[#404040] uppercase md:inline'>
                Cross-chain circuit breaker
              </span>
              <div className='ml-auto flex min-w-0 flex-wrap items-center gap-2 sm:gap-3'>
                <span className='hidden items-center gap-2 text-[11px] tracking-[0.14em] text-[#008000] uppercase sm:flex'>
                  <LiveDot />
                  System armed
                </span>
                <HeaderWallet />
                <div className='hidden w-32 shrink-0 lg:block'>
                  <MotionToggle />
                </div>
              </div>
            </div>
          </header>

          {/* ---- Tx ticker strip (recorded hashes, pausable) ---- */}
          <TxMarquee />

          <main
            id='main-content'
            className='mx-auto w-full max-w-6xl flex-1 px-2 py-3 sm:px-4'
            tabIndex={-1}
          >
            <Win98Window
              title={title}
              open={mainOpen}
              onClose={() => setMainOpen(false)}
              maximized={maximized}
              onMaximizedChange={setMaximized}
            >
              {children}
            </Win98Window>
            <footer className='mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] tracking-[0.14em] text-white uppercase [text-shadow:1px_1px_0_#000]'>
              <span>ContagionStop — testnet only</span>
              <span>One pause freezes every sibling</span>
            </footer>
          </main>
        </div>
      </div>

      <Win98Taskbar mainOpen={mainOpen} onRestoreMain={() => setMainOpen(true)} />
    </div>
  );
}
