import DashboardNav from '@/components/layout/dashboard-nav';
import HeaderWallet from '@/components/web3/header-wallet';
import { LiveDot } from '@/components/terminal/live-dot';
import { MatrixRain } from '@/components/terminal/matrix-rain';
import { TxMarquee } from '@/components/terminal/tx-marquee';
import { MotionProvider } from '@/components/terminal/motion-provider';
import { MotionToggle } from '@/components/terminal/motion-toggle';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ContagionStop — Overview',
  description: 'ContagionStop: cross-chain circuit breaker. One emergencyPause freezes every sibling vault.',
  robots: {
    index: false,
    follow: false
  }
};

/**
 * Terminal shell (restyle 15 Nov 2026) — replaces the single-column Nous
 * shell. Left sidebar on desktop (≥lg, like the reference portfolio
 * dashboard): wordmark, nav Overview / Vaults / History / Docs, wallet
 * status + chain badge and the Motion switch at the bottom. On mobile the
 * sidebar collapses into a sticky top bar (wordmark + wallet on row one,
 * horizontal nav on row two). Main column is a card grid (max-w-6xl).
 * Radius 0, 1px borders, no shadows — terminal flat.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <div className='flex min-h-screen bg-background text-foreground'>
        <MatrixRain />
        <a
          href='#main-content'
          className='bg-background ring-ring sr-only px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:ring-2'
        >
          Skip to content
        </a>

        {/* ---- Sidebar (desktop) ---- */}
        <aside className='sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex'>
          <div className='border-b border-sidebar-border px-5 py-4'>
            <Link
              href='/dashboard/overview'
              className='font-mono text-sm font-bold tracking-[0.22em] text-primary uppercase'
            >
              ContagionStop
            </Link>
            <p className='mt-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase'>
              Cross-chain circuit breaker
            </p>
          </div>
          <nav className='flex-1 px-3 py-4' aria-label='Sections'>
            <DashboardNav orientation='vertical' />
          </nav>
          <div className='flex flex-col gap-3 border-t border-sidebar-border px-4 py-4'>
            <span className='flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-success uppercase'>
              <LiveDot />
              System armed
            </span>
            <span className='font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase'>
              Wallet
            </span>
            <HeaderWallet orientation='column' />
            <MotionToggle />
            <p className='font-mono text-[11px] leading-relaxed text-muted-foreground'>
              Testnet only — Reactive Omni Buildathon
            </p>
          </div>
        </aside>

        {/* ---- Main column ---- */}
        <div className='flex min-w-0 flex-1 flex-col'>
          {/* Mobile header (sidebar replacement below lg) */}
          <header className='sticky top-0 z-20 border-b bg-background lg:hidden'>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3'>
              <Link
                href='/dashboard/overview'
                className='font-mono text-sm font-bold tracking-[0.22em] text-primary uppercase'
              >
                ContagionStop
              </Link>
              <div className='ml-auto'>
                <HeaderWallet />
              </div>
            </div>
            <div className='overflow-x-auto px-4 pb-3'>
              <DashboardNav orientation='horizontal' />
            </div>
          </header>

          {/* Tx ticker strip (recorded hashes, pausable) */}
          <TxMarquee />

          <main
            id='main-content'
            className='mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8'
            tabIndex={-1}
          >
            {children}
          </main>
          <footer className='border-t'>
            <div className='mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase md:px-6'>
              <span>ContagionStop — testnet only</span>
              <span>Reactive Omni Buildathon</span>
            </div>
          </footer>
        </div>
      </div>
    </MotionProvider>
  );
}
