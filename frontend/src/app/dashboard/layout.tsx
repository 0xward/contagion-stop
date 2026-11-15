import { MotionProvider } from '@/components/terminal/motion-provider';
import { Win98Shell } from '@/components/win98/win98-shell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ContagionStop — Overview',
  description: 'ContagionStop: cross-chain circuit breaker. One emergencyPause freezes every sibling vault.',
  robots: {
    index: false,
    follow: false
  }
};

/**
 * Windows 98 desktop shell (restyle 15 Nov 2026) — replaces the
 * Terminal sidebar shell. Teal desktop, desktop icons on the left
 * (>= lg), silver menu bar (wordmark + wallet + Motion switch), the
 * recorded-tx ticker as a status strip, the page as one draggable
 * 98.css window, and the taskbar (Start menu + task buttons + clock)
 * fixed at the bottom. The matrix rain is gone (not Win98); the boot
 * sequence is now the retro splash in `Win98BootSplash`.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <Win98Shell>{children}</Win98Shell>
    </MotionProvider>
  );
}
