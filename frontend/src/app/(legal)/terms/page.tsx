import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LegalExternalLink, LegalInternalLink, LegalSection } from '@/components/legal/legal-shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'Terms of Use for ContagionStop — a testnet demonstration, provided as-is, with no real money, no warranty, and no promises.'
};

/**
 * Terms of Use — transcribed from the reviewed draft.
 * NOTE: the draft's §9 (Governing law — needs review) is deliberately
 * NOT published here: no jurisdiction has been decided by the project
 * owner. The draft's §10 (Contact) is renumbered to §9. The governing-law
 * section must be added only after the owner decides a jurisdiction.
 */
export default function TermsPage() {
  return (
    <PageContainer
      pageTitle='Terms of Use'
      pageDescription='The terms for using this testnet demonstration — as-is, with no real money and no warranty.'
    >
      <div className='flex flex-1 flex-col gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Terms of Use</CardTitle>
            <CardDescription>
              Last updated: 15 November 2026. Short version: this is a testnet demonstration, provided
              as-is, with no real money, no warranty, and no promises. Use it to learn and to test. Do
              not rely on it to protect real funds.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-6 text-sm leading-relaxed'>
            <LegalSection number='1' title='Acceptance and scope'>
              <p>
                By using{' '}
                <LegalExternalLink href='https://contagion-stop.vercel.app'>
                  contagion-stop.vercel.app
                </LegalExternalLink>{' '}
                (the &ldquo;Site&rdquo;), you accept these Terms of Use. If you do not accept them, do
                not use the Site. The Site is an interface to smart contracts deployed on test networks
                only — Unichain Sepolia, Base Sepolia, and Lasna. It is not a financial service, not a
                wallet, and not an exchange.
              </p>
            </LegalSection>

            <LegalSection number='2' title='Testnet only — no real funds, no financial advice'>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>
                  All tokens on this Site (testnet ETH, testnet USDC, lREACT) have{' '}
                  <strong>no real-world value</strong>. Never send real funds, real tokens, or real assets
                  to any address shown on the Site.
                </li>
                <li>Nothing on the Site is financial, investment, legal, or tax advice.</li>
                <li>
                  The smart contracts are <strong>not audited</strong>. They may contain bugs. They are
                  published open-source so anyone can read them before interacting.
                </li>
              </ul>
            </LegalSection>

            <LegalSection number='3' title='As-is, no warranty, limited liability'>
              <p>
                The Site and the contracts are provided <strong>&ldquo;as is&rdquo; and &ldquo;as
                available&rdquo;</strong>, without warranty of any kind, express or implied — including
                warranties of merchantability, fitness for a particular purpose, and non-infringement. In
                particular:
              </p>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>
                  We do not warrant that the Site will be available, uninterrupted, error-free, or secure.
                </li>
                <li>
                  We do not warrant that a pause will happen, will happen in time, or will prevent any
                  loss. A circuit breaker is a mitigation tool, not a guarantee.
                </li>
                <li>
                  To the maximum extent permitted by law, we are not liable for any loss or damage arising
                  from use of the Site or the contracts — including loss of testnet assets, missed
                  actions, or reliance on displayed data.
                </li>
                <li>
                  Displayed data (balances, loop costs, watcher funding, recorded runs) is read live from
                  public chains and can be delayed, stale, or wrong if a public RPC is slow or
                  unreachable. The on-chain state is the source of truth, not the interface.
                </li>
              </ul>
            </LegalSection>

            <LegalSection number='4' title='What you are responsible for'>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>
                  <strong>Your wallet and your keys.</strong> You are solely responsible for the wallet
                  you connect. Never share a seed phrase or private key with anyone, including anyone
                  claiming to be associated with this project. The Site will never ask for them.
                </li>
                <li>
                  <strong>Verifying before you sign.</strong> Every transaction is shown to you by your
                  wallet before you sign it. Check the chain, the contract address, and the amounts. A
                  signed transaction on a public chain cannot be undone.
                </li>
                <li>
                  <strong>Testnet dust only.</strong> Only use amounts you can afford to lose — in
                  practice, small testnet amounts. In the public test instance, test deposits are
                  owner-only to withdraw, so only send testnet dust you do not need back.
                </li>
                <li>
                  <strong>Lawful use.</strong> Do not use the Site or the contracts to break the law, to
                  attack other people&apos;s deployments, or to spam the public test instance (for example
                  by tripping it repeatedly to drain its watcher). The public instance has a cooldown
                  between trips; deliberately working around it is a breach of these terms.
                </li>
              </ul>
            </LegalSection>

            <LegalSection number='5' title='On-chain actions are public and permanent'>
              <p>
                Anything you do through the Site that writes to a chain — creating a vault, depositing,
                tripping, unpausing — is recorded on a public ledger, visible to anyone, and cannot be
                deleted. See the <LegalInternalLink href='/privacy'>Privacy Policy</LegalInternalLink> for
                detail.
              </p>
            </LegalSection>

            <LegalSection number='6' title='Third-party services'>
              <p>
                The Site depends on services we do not control: public RPC endpoints, block explorers,
                WalletConnect / Reown, testnet faucets, and the hosting provider (Vercel). Their
                availability and their terms are their own. If one of them is down, slow, or wrong, the
                Site may show stale data or fail — that is not something we can fix from here.
              </p>
            </LegalSection>

            <LegalSection number='7' title='Intellectual property and license'>
              <p>
                The project&apos;s source code is published under the MIT license in the public repository
                (
                <LegalExternalLink href='https://github.com/0xward/contagion-stop'>
                  github.com/0xward/contagion-stop
                </LegalExternalLink>
                ); the license file in the repository governs the code. The name &ldquo;ContagionStop&rdquo;
                and the interface design are part of the project; do not present a copy of the Site as the
                original, and do not use the project&apos;s identity to mislead others.
              </p>
            </LegalSection>

            <LegalSection number='8' title='Changes'>
              <p>
                We may update these terms and the Site at any time. The &ldquo;Last updated&rdquo; date
                above will change when the terms change. Continued use of the Site after a change means
                you accept the updated terms.
              </p>
            </LegalSection>

            <LegalSection number='9' title='Contact'>
              <p>
                There is no support email or support desk. Questions can be raised as an issue on the
                public repository:{' '}
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
