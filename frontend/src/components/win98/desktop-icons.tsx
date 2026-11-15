'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import { TERMINAL_NAV_LINKS } from '@/components/layout/dashboard-nav';

/**
 * Desktop icons (visible >= lg only): one shortcut per section —
 * Overview, Vaults, History, Docs — icon glyph in a silver bevel box
 * with the label underneath, like Win98 desktop shortcuts. Single
 * click opens the section (double-click works too — same handler).
 * Hidden on smaller screens, where the Start menu + taskbar take over.
 */
export function DesktopIcons() {
  return (
    <div
      className='hidden w-24 shrink-0 pt-3 lg:block'
      aria-label='Desktop shortcuts'
    >
      <div className='sticky top-3 flex flex-col items-center gap-4'>
      {TERMINAL_NAV_LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className='win98-desktop-icon no-underline'
            aria-label={`Open ${link.label}`}
          >
            <span className='win98-desktop-icon-glyph' aria-hidden='true'>
              <Icon className='size-5' />
            </span>
            <span className='win98-desktop-icon-label'>{link.label}</span>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
