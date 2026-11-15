import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LegalSection, LegalTable } from '@/components/legal/legal-shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'Cookie Policy for ContagionStop — every cookie and browser-storage entry the site sets, what each one does, and how to control them.'
};

/**
 * Cookie Policy — transcribed from the reviewed draft.
 * The site sets two small functional first-party cookies and a few local
 * preferences. No advertising cookies, no tracking cookies, and no
 * third-party cookies set by this site itself.
 */
export default function CookiesPage() {
  return (
    <PageContainer
      pageTitle='Cookie Policy'
      pageDescription='Every cookie and browser-storage entry this site sets, and how to control them.'
    >
      <div className='flex flex-1 flex-col gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Cookie Policy</CardTitle>
            <CardDescription>Last updated: 15 November 2026.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-6 text-sm leading-relaxed'>
            <LegalSection number='1' title='What this page covers'>
              <p>
                This page lists every cookie and browser-storage entry the ContagionStop website sets,
                what each one does, and how long it lasts. The short version: the site sets{' '}
                <strong>two small functional cookies and a few local preferences</strong>. There are{' '}
                <strong>no advertising cookies, no tracking cookies, and no third-party cookies</strong>{' '}
                set by this site itself.
              </p>
            </LegalSection>

            <LegalSection number='2' title='Cookies set by this site'>
              <LegalTable
                headers={['Name', 'Type', 'Purpose', 'Lifetime']}
                rows={[
                  ['active_theme', 'First-party cookie', 'Remembers your theme preference so the site looks the same when you return', '1 year'],
                  ['sidebar_state', 'First-party cookie', 'Remembers whether the sidebar is open or closed', '7 days']
                ]}
              />
              <p>
                Both cookies are set with <code className='font-mono text-xs'>SameSite=Lax</code>, and
                with the <code className='font-mono text-xs'>Secure</code> flag when the page is loaded
                over HTTPS. Neither cookie is sent to any third party, and neither is used to identify you
                or to track you across sites.
              </p>
            </LegalSection>

            <LegalSection number='3' title='Other browser storage'>
              <LegalTable
                headers={['Name', 'Where', 'Purpose', 'Lifetime']}
                rows={[
                  ['terminal-motion', 'localStorage', 'Remembers your motion on/off preference', 'Until you clear site data'],
                  ['Boot splash flag', 'sessionStorage', 'Shows the boot splash once per session', 'Until the tab closes'],
                  ['Boot log flag', 'sessionStorage', 'Marks the boot log as shown once per session', 'Until the tab closes']
                ]}
              />
            </LegalSection>

            <LegalSection number='4' title='Storage set by wallet software and third parties'>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>
                  Wallet software you connect (for example MetaMask, Coinbase Wallet, or a mobile wallet
                  through WalletConnect) may store its own session data so your connection can be
                  restored. That storage is covered by your wallet&apos;s own policy, not by this page.
                </li>
                <li>
                  If you connect through <strong>WalletConnect (by Reown)</strong>, the connection session
                  is relayed through Reown&apos;s relay servers; see Reown / WalletConnect&apos;s own
                  privacy notice.
                </li>
                <li>
                  The hosting provider (Vercel) may set its own security cookies; those are covered by
                  Vercel&apos;s own policy.
                </li>
              </ul>
            </LegalSection>

            <LegalSection number='5' title='How to control cookies'>
              <p>
                You can block or delete cookies in your browser settings at any time. If you block this
                site&apos;s cookies:
              </p>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>your theme preference will reset to the default on each visit;</li>
                <li>the sidebar will reset to its default state;</li>
                <li>
                  wallet connections and on-chain actions are unaffected — they do not depend on these
                  cookies.
                </li>
              </ul>
              <p>
                Clearing site data removes the localStorage and sessionStorage entries above as well as
                the two cookies.
              </p>
            </LegalSection>

            <LegalSection number='6' title='Changes'>
              <p>
                If the site starts using any new cookie or storage entry, this page will be updated and
                the &ldquo;Last updated&rdquo; date above will change.
              </p>
            </LegalSection>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
