'use client';

import { useState } from 'react';
import type { Address } from 'viem';
import { useReadContract } from 'wagmi';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Win98Window } from '@/components/win98/win98-window';
import { Win98Taskbar } from '@/components/win98/taskbar';
import { DesktopIcons } from '@/components/win98/desktop-icons';
import { Win98BootSplash } from '@/components/win98/boot-splash';
import { TxMarquee } from '@/components/terminal/tx-marquee';
import { MotionToggle } from '@/components/terminal/motion-toggle';
import HeaderWallet from '@/components/web3/header-wallet';
import { CONTRACTS } from '@/lib/config';
import { CONTAGION_WATCHER_ABI } from '@/lib/contracts';

/**
 * Windows 98 desktop shell (replaces the Terminal sidebar shell):
 * teal desktop, desktop icons on the left (>= lg), a silver menu bar
 * (wordmark + system-armed + wallet + Motion switch), the tx ticker
 * restyled as a status strip, the page itself as one draggable 98.css
 * window, and the taskbar with Start menu + clock at the bottom.
 * The main window can be minimized / maximized / closed from its
 * title bar; the taskbar restores it. The header watcher status is a
 * real read of the main watcher paused() on Lasna — not a static dot.
 */
/**
 * Header watcher status — reads the MAIN watcher paused() live on Lasna.
 * Text only, no pulsing dot: ACTIVE means paused() == false (the watcher
 * reacts to EmergencyPaused events); PAUSED means the watcher itself is
 * paused (react() falls through); unknown while the read resolves.
 */
function WatcherStatus() {
  const { data: paused } = useReadContract({
    address: CONTRACTS.watcher.address as Address,
    abi: CONTAGION_WATCHER_ABI,
    functionName: 'paused',
    chainId: CONTRACTS.watcher.chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const label =
    paused === false ? 'Watcher: active' : paused === true ? 'Watcher: paused' : 'Watcher: —';
  const color =
    paused === false ? '#008000' : paused === true ? '#c00000' : '#404040';
  return (
    <span
      className='hidden items-center gap-2 text-[11px] tracking-[0.14em] uppercase sm:flex'
      style={{ color }}
    >
      {label}
    </span>
  );
}

export function Win98Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mainOpen, setMainOpen] = useState(true);
  const [maximized, setMaximized] = useState(false);

  const title =
    pathname === '/dashboard/docs'
      ? 'ContagionStop — Docs'
      : pathname === '/dashboard/deploy'
        ? 'ContagionStop — Deploy'
        : pathname === '/faq'
          ? 'ContagionStop — FAQ'
          : pathname === '/privacy'
            ? 'ContagionStop — Privacy Policy'
            : pathname === '/terms'
              ? 'ContagionStop — Terms of Use'
              : pathname === '/cookies'
                ? 'ContagionStop — Cookie Policy'
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

      {/* ---- Menu bar (wordmark + wallet) — full width, starts at x=0 (round 5) ---- */}
      <header className='sticky top-0 z-20 border-b border-[#808080] bg-[#c0c0c0] px-3 py-2 shadow-[inset_0_-1px_#0a0a0a,inset_0_-2px_grey]'>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
          <Link
            href='/dashboard/overview'
            className='shrink-0 no-underline'
            aria-label='ContagionStop — home'
          >
            <img
              src='/icons/contagion-stop-logo.svg'
              alt='CONTAGION-STOP'
              className='h-[30px] w-auto'
            />
          </Link>
          <span className='hidden text-[11px] tracking-[0.14em] text-[#404040] uppercase md:inline'>
            Cross-chain circuit breaker
          </span>
          <div className='ml-auto flex min-w-0 flex-wrap items-center gap-2 sm:gap-3'>
            <WatcherStatus />
            <HeaderWallet />
            <div className='hidden w-32 shrink-0 lg:block'>
              <MotionToggle />
            </div>
          </div>
        </div>
      </header>

      {/* ---- Tx ticker strip (recorded hashes, pausable) — full width ---- */}
      <TxMarquee />

      <div className='flex min-w-0 flex-1'>
        <DesktopIcons />

        <div className='flex min-w-0 flex-1 flex-col pb-14'>
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
              <nav
                aria-label='Legal'
                className='flex flex-wrap items-center gap-x-2 gap-y-1 normal-case'
              >
                <Link href='/faq' className='text-white underline underline-offset-2'>
                  FAQ
                </Link>
                <span aria-hidden='true'>·</span>
                <Link href='/privacy' className='text-white underline underline-offset-2'>
                  Privacy
                </Link>
                <span aria-hidden='true'>·</span>
                <Link href='/terms' className='text-white underline underline-offset-2'>
                  Terms
                </Link>
                <span aria-hidden='true'>·</span>
                <Link href='/cookies' className='text-white underline underline-offset-2'>
                  Cookies
                </Link>
                <span aria-hidden='true'>·</span>
                <a
                  href='https://github.com/0xward/contagion-stop'
                  target='_blank'
                  rel='noreferrer'
                  className='text-white underline underline-offset-2'
                >
                  GitHub
                </a>
              </nav>
              <span className='hidden md:inline'>One pause freezes every sibling</span>
            </footer>
          </main>
        </div>
      </div>

      <Win98Taskbar mainOpen={mainOpen} onRestoreMain={() => setMainOpen(true)} />
    </div>
  );
}
