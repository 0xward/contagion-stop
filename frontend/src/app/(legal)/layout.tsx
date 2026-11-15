import { MotionProvider } from '@/components/terminal/motion-provider';
import { Win98Shell } from '@/components/win98/win98-shell';

/**
 * Layout for the top-level legal routes (/faq, /privacy, /terms,
 * /cookies). Same Win98 desktop shell as the dashboard, so the legal
 * pages live inside the same window, header, footer, and taskbar.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <Win98Shell>{children}</Win98Shell>
    </MotionProvider>
  );
}
