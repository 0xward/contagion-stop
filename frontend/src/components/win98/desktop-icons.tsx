'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import { TERMINAL_NAV_LINKS } from '@/components/layout/dashboard-nav';

/**
 * Desktop icons (visible >= 1812px only): one shortcut per section —
 * Overview, Vaults, History, Docs — icon glyph in a silver bevel box
 * with the label underneath, like Win98 desktop shortcuts. Single
 * click opens the section (double-click works too — same handler).
 * Hidden on smaller screens, where the Start menu + taskbar take over.
 *
 * Positioning (round 4 + 5, fixed round 6): the icons live OUTSIDE the
 * layout flow. The outer div is an empty 144px spacer in the content
 * flex row, so the main window stays centred where it was in round 2.
 * (Round 5: the header + marquee are full-width rows above that flex
 * row, so they start at x=0.) The icon list itself is `fixed` at left
 * 290px / top 96px: at the red line the user drew, below the header +
 * marquee, and always visible while scrolling (like the old sticky
 * column). NEVER move the icons by widening this column or adding
 * margin / padding — that shifts the header and the main window
 * (round 3 did exactly that: header went to x=402, window to x=585).
 *
 * Round 6 (W5): the centred window's left edge moves in as the viewport
 * narrows — at 1440px it starts around x=216, so the icons at x=290
 * sat ON TOP of the window. The icons are therefore hidden below
 * 1812px (the widest viewport where the window edge, ~402px, still
 * clears the 290px icon column); below that the Start menu + taskbar
 * are the navigation. The 144px spacer is kept unchanged so the
 * window does not shift when the icons hide.
 */
export function DesktopIcons() {
  return (
    <div className='hidden w-36 shrink-0 min-[1812px]:block' aria-label='Desktop shortcuts'>
      <div className='fixed left-[290px] top-24 flex flex-col items-center gap-4'>
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
              <Icon className='size-8' />
            </span>
            <span className='win98-desktop-icon-label'>{link.label}</span>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
