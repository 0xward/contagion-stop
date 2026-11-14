import HeaderWallet from '@/components/web3/header-wallet';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ContagionStop — Overview',
  description: 'ContagionStop: pemutus sirkuit lintas-chain. Satu emergencyPause menjeda semua sibling vault.',
  robots: {
    index: false,
    follow: false
  }
};

/**
 * Minimal shell (Nous-style, restyle 14 Nov 2026) — menggantikan chrome
 * dashboard shadcn (sidebar + header + KBar + info-sidebar).
 * Satu kolom tengah lega (max-w-5xl), border tipis 1px, tanpa shadow,
 * tanpa gradient. Header ramping: wordmark + nav + wallet; membungkus
 * (flex-wrap) di layar kecil agar tidak overflow horizontal.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <a
        href='#main-content'
        className='bg-background ring-ring sr-only px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:ring-2'
      >
        Skip to content
      </a>
      <header className='sticky top-0 z-20 border-b bg-background'>
        <div className='mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 md:px-6'>
          <Link
            href='/dashboard/overview'
            className='font-mono text-sm font-bold tracking-[0.22em] uppercase'
          >
            ContagionStop
          </Link>
          <nav
            className='flex items-center gap-4 font-mono text-xs tracking-[0.14em] uppercase'
            aria-label='Sections'
          >
            <Link href='/dashboard/overview' className='text-muted-foreground hover:text-foreground'>
              Overview
            </Link>
            <Link href='/dashboard/docs' className='text-muted-foreground hover:text-foreground'>
              Docs
            </Link>
          </nav>
          <div className='ml-auto'>
            <HeaderWallet />
          </div>
        </div>
      </header>
      <main id='main-content' className='mx-auto w-full max-w-5xl flex-1 py-6 md:py-10' tabIndex={-1}>
        {children}
      </main>
      <footer className='border-t'>
        <div className='mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase md:px-6'>
          <span>ContagionStop — testnet only</span>
          <span>Reactive Omni Buildathon</span>
        </div>
      </footer>
    </div>
  );
}
