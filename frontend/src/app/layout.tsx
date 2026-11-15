import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import { DEFAULT_THEME } from '@/components/themes/theme.config';
import ThemeProvider from '@/components/themes/theme-provider';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '../styles/98-scoped.css';
import '../styles/globals.css';

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_APP_URL
    ? { metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL) }
    : {}),
  title: {
    default: 'ContagionStop — Cross-Chain Circuit Breaker',
    template: '%s | ContagionStop'
  },
  description:
    'ContagionStop: cross-chain circuit breaker. One emergencyPause on the origin vault pauses every sibling vault via Reactive (Lasna).',
  openGraph: {
    title: 'ContagionStop — Cross-Chain Circuit Breaker',
    description:
      'ContagionStop: cross-chain circuit breaker. One emergencyPause on the origin vault pauses every sibling vault via Reactive (Lasna).',
    siteName: 'ContagionStop',
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title: 'ContagionStop — Cross-Chain Circuit Breaker',
    description:
      'ContagionStop: cross-chain circuit breaker. One emergencyPause on the origin vault pauses every sibling vault via Reactive (Lasna).'
  }
};

export const viewport: Viewport = {
  themeColor: '#008080'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  // Win98 is the only theme (round 2, 15 Nov 2026): a stale
  // `active_theme=contagionstop-terminal` cookie from before the redesign
  // used to override the default and render every token-driven panel
  // dark on returning visitors' browsers. Only an explicit Win98 cookie
  // is honoured; anything else (Terminal, unknown) falls back to Win98.
  // The client provider then overwrites the stale cookie with Win98, so
  // the bad value heals itself on the first visit after this change.
  const isValidTheme = activeThemeValue === DEFAULT_THEME;
  const themeToApply = isValidTheme ? activeThemeValue! : DEFAULT_THEME;

  return (
    <html lang='en' suppressHydrationWarning data-theme={themeToApply}>
      <body className={cn('bg-background overflow-x-hidden overscroll-none font-sans antialiased')}>
        <NextTopLoader color='var(--primary)' showSpinner={false} />
        <NuqsAdapter>
          <ThemeProvider
            attribute='class'
            defaultTheme='light'
            enableSystem={false}
            forcedTheme='light'
            disableTransitionOnChange
            enableColorScheme
          >
            <Providers activeThemeValue={themeToApply}>
              <Toaster />
              {children}
            </Providers>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
