import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LegalExternalLink,
  LegalInternalLink,
  LegalSection,
  LegalTable
} from '@/components/legal/legal-shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for ContagionStop — what the site collects (almost nothing), what your browser stores, and what happens when you connect a wallet.'
};

/**
 * Privacy Policy — transcribed from the reviewed draft.
 * Verified against the code at draft time: no analytics, no backend,
 * no accounts; two functional first-party cookies; Sentry SDK present
 * but no DSN configured on the live deployment (re-verified at install:
 * no DSN value exists anywhere in the repo and no .env file is present).
 */
export default function PrivacyPage() {
  return (
    <PageContainer
      pageTitle='Privacy Policy'
      pageDescription='What this site collects, what your browser stores, and what happens when you connect a wallet.'
    >
      <div className='flex flex-1 flex-col gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>
              Last updated: 15 November 2026. Plain-English summary: this site collects almost nothing.
              There are no accounts, no names, no emails, no analytics, and no advertising. Your browser
              stores two small preference cookies and a few local settings. Connecting a wallet shares
              your public wallet address with the app in your browser so it can build transactions.
              Anything you write to a blockchain is public and permanent — that is a property of
              blockchains, not a choice of this site.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-6 text-sm leading-relaxed'>
            <LegalSection number='1' title='Who we are and what this policy covers'>
              <p>
                ContagionStop is an open-source testnet project. Its code is published at{' '}
                <LegalExternalLink href='https://github.com/0xward/contagion-stop'>
                  github.com/0xward/contagion-stop
                </LegalExternalLink>{' '}
                and its interface is hosted at{' '}
                <LegalExternalLink href='https://contagion-stop.vercel.app'>
                  contagion-stop.vercel.app
                </LegalExternalLink>
                . There is no company, no registered entity, and no customer support desk behind it. This
                policy covers the website only. It does not cover the blockchains the site reads and
                writes (Unichain Sepolia, Base Sepolia, Lasna), the wallet you connect, or any
                third-party site linked from the interface — each has its own policy.
              </p>
            </LegalSection>

            <LegalSection number='2' title='What we do not collect'>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>No accounts, no usernames, no passwords.</li>
                <li>
                  No names, email addresses, phone numbers, or government identifiers. The site never asks
                  for any of them.
                </li>
                <li>
                  No private keys or seed phrases. The site never asks for them, and you should never
                  enter them anywhere in connection with this project.
                </li>
                <li>
                  No analytics, no advertising trackers, no session recording, and no fingerprinting. The
                  site loads no analytics or advertising script.
                </li>
                <li>
                  No server-side database of users. The site has no backend of its own: it is a static
                  frontend that talks directly to public blockchains and public RPC endpoints.
                </li>
              </ul>
            </LegalSection>

            <LegalSection number='3' title='What your browser stores'>
              <p>
                The site stores small preferences in your own browser. None of this leaves your device
                except as described in section 4, and none of it is used to identify you.
              </p>
              <LegalTable
                headers={['Name', 'Where', 'Purpose', 'Lifetime']}
                rows={[
                  ['active_theme', 'Cookie', 'Remembers your theme preference', '1 year'],
                  ['sidebar_state', 'Cookie', 'Remembers whether the sidebar is open', '7 days'],
                  ['terminal-motion', 'localStorage', 'Remembers your motion on/off preference', 'Until you clear it'],
                  ['Boot splash / boot log flags', 'sessionStorage', 'Shows the boot splash once per session', 'Until the tab closes']
                ]}
              />
              <p>
                Both cookies are first-party, functional cookies. They are never sent to third parties.
                See the <LegalInternalLink href='/cookies'>Cookie Policy</LegalInternalLink> for detail,
                including how to clear or block them. Wallet software you connect may store its own
                session data so a connection can be restored; that is covered by your wallet&apos;s own
                policy.
              </p>
            </LegalSection>

            <LegalSection number='4' title='What happens when you connect a wallet'>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>
                  Connecting a wallet shares your <strong>public wallet address</strong> with the app in
                  your browser, so the app can read your balances and build the transactions you request.
                  Your address is public on the blockchain by design.
                </li>
                <li>
                  If you connect a mobile wallet through <strong>WalletConnect (by Reown)</strong>, the
                  connection session is relayed through Reown&apos;s relay servers. The relay carries
                  encrypted session traffic and can see connection metadata such as your IP address. See
                  Reown / WalletConnect&apos;s own privacy notice for detail.
                </li>
                <li>
                  The app reads chain data from <strong>public RPC endpoints</strong> (Unichain Sepolia,
                  Base Sepolia, Lasna). Those RPC operators receive your requests — the addresses and
                  contract calls you look up — and can see the IP address the request comes from.
                </li>
                <li>
                  We never see or handle your private keys. Every transaction is signed inside your own
                  wallet.
                </li>
              </ul>
            </LegalSection>

            <LegalSection number='5' title='Error reporting'>
              <p>
                The site&apos;s code includes the Sentry error-reporting SDK, but{' '}
                <strong>no Sentry DSN is configured on the live deployment</strong>, so no error data is
                sent anywhere. If error reporting is ever enabled, this policy will be updated first to
                say what is sent and where it goes.
              </p>
            </LegalSection>

            <LegalSection number='6' title='Hosting'>
              <p>
                The site is hosted on Vercel. Like any web host, Vercel keeps ordinary server access logs
                (for example IP address, time, and requested path). Those logs are governed by
                Vercel&apos;s own privacy policy, not by this page.
              </p>
            </LegalSection>

            <LegalSection number='7' title='On-chain data is public and permanent'>
              <p>
                Anything you write to a blockchain — a deposit, a pause, a vault creation, a transaction
                — is recorded on a public ledger. It is visible to anyone through a block explorer
                (Uniscan, BaseScan, Reactscan), and it cannot be edited or deleted by us or by anyone
                else. Never put personal information in an on-chain field.
              </p>
            </LegalSection>

            <LegalSection number='8' title='Third-party links'>
              <p>
                The interface links out to block explorers, testnet faucets (Superchain, Circle, CDP,
                Alchemy), and the public GitHub repository. Following those links takes you to services
                we do not control; their privacy policies apply from that point.
              </p>
            </LegalSection>

            <LegalSection number='9' title="Children's privacy">
              <p>
                This site is a technical tool for testing a cross-chain circuit breaker on testnets. It
                is not directed at children, and we do not knowingly collect information from anyone
                under 18.
              </p>
            </LegalSection>

            <LegalSection number='10' title='Changes to this policy'>
              <p>
                If what the site stores or sends changes, this page will be updated and the
                &ldquo;Last updated&rdquo; date above will change. Continued use of the site after a
                change means you accept the updated policy.
              </p>
            </LegalSection>

            <LegalSection number='11' title='Contact'>
              <p>
                There is no support email. Questions about the project or this policy can be raised as an
                issue on the public repository:{' '}
                <LegalExternalLink href='https://github.com/0xward/contagion-stop'>
                  github.com/0xward/contagion-stop
                </LegalExternalLink>
                .
              </p>
            </LegalSection>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
