'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export const TERMINAL_NAV_LINKS = [
  { href: '/dashboard/overview', label: 'Overview', icon: Icons.dashboard },
  { href: '/dashboard/overview#vaults', label: 'Vaults', icon: Icons.shieldCheck },
  { href: '/dashboard/overview#history', label: 'History', icon: Icons.history },
  { href: '/dashboard/docs', label: 'Docs', icon: Icons.page }
] as const;

/**
 * Terminal nav (Overview / Vaults / History / Docs). Vaults and History
 * are sections of the Overview page, so they link to its `#vaults` and
 * `#history` anchors. Vertical in the sidebar (violet left bar + tinted
 * background for the active item, like the reference dashboard); horizontal
 * in the mobile header. Active anchor state tracks `location.hash`.
 */
export default function DashboardNav({
  orientation = 'horizontal'
}: {
  orientation?: 'vertical' | 'horizontal';
}) {
  const pathname = usePathname();
  const [hash, setHash] = useState('');

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  return (
    <nav
      className={cn(
        'font-mono text-xs tracking-[0.14em] uppercase',
        orientation === 'vertical' ? 'flex flex-col gap-1' : 'flex items-center gap-4'
      )}
      aria-label='Sections'
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
            aria-current={active ? 'page' : undefined}
            className={cn(
              orientation === 'vertical'
                ? 'flex items-center gap-2.5 border-l-2 px-3 py-2 text-[11px]'
                : '',
              active
                ? orientation === 'vertical'
                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                  : 'font-semibold text-primary'
                : orientation === 'vertical'
                  ? 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                  : 'text-muted-foreground hover:text-primary'
            )}
          >
            {orientation === 'vertical' ? <Icon className='size-4 shrink-0' /> : null}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
