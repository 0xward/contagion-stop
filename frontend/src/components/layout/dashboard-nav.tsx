'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Nav seksi dashboard (Overview / Docs). Link aktif memakai biru Nous
 * (#0000f2); yang tidak aktif abu-abu dengan hover biru. Client component
 * kecil — layout dashboard tetap server component.
 */
export default function DashboardNav() {
  const pathname = usePathname();
  const links = [
    { href: '/dashboard/overview', label: 'Overview' },
    { href: '/dashboard/docs', label: 'Docs' }
  ];

  return (
    <nav
      className='flex items-center gap-4 font-mono text-xs tracking-[0.14em] uppercase'
      aria-label='Sections'
    >
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              active
                ? 'font-semibold text-primary'
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
