import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LegalExternalLink, LegalInternalLink, LegalSection } from '@/components/legal/legal-shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about ContagionStop — how the cross-chain circuit breaker works, what testnet tokens are involved, and what its limits are.'
};

/**
 * Frequently asked questions — transcribed from the reviewed draft.
 * Every answer describes the testnet deployment at
 * contagion-stop.vercel.app. Full technical detail: Docs.
 */

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'What is ContagionStop?',
    answer:
      'ContagionStop is a cross-chain circuit breaker for DeFi vaults. When one deployment of a protocol is paused because an exploit was found, a reactive contract on Lasna pauses the sibling deployments on other chains within seconds, without waiting for a multisig to gather. No funds move: only deposits (and, for lending-style vaults, borrowing and minting) freeze on each sibling.'
  },
  {
    question: 'How does a loop work, step by step?',
    answer:
      'The security team (the vault owner) calls emergencyPause(reason) on one vault. The vault pauses itself and emits an EmergencyPaused event. The ContagionWatcher on Lasna (chain 5318007) receives the event log and runs react(), which requests a pause() callback to every registered sibling vault. Each sibling pauses and emits a Paused log; the watcher counts these confirmations. Once every sibling has confirmed, the incident is CONTAINED. Measured on testnet, the full loop takes about 3 seconds for the v1 set, and 2-8 seconds for the v2 vaults.'
  },
  {
    question: 'Is this mainnet? Does it involve real money?',
    answer:
      'No. ContagionStop runs only on testnets - Unichain Sepolia, Base Sepolia, and Lasna. All tokens involved (testnet ETH, testnet USDC, lREACT) have no real-world value. The contracts are not audited. Never send real funds to any address shown on this site.'
  },
  {
    question: 'What do I need to try it?',
    answer:
      'A wallet that can connect through the button in the header (for example MetaMask or Coinbase Wallet, or a mobile wallet via WalletConnect). No account and no password are needed; the site never asks for a seed phrase or a private key. You also need a small amount of testnet ETH on the chain of the vault you want to try, for gas. Free sources are listed in the Judge quickstart on the Overview page. You must be on the vault’s chain before pressing Trip or Deposit - switch networks in the wallet modal. You can look at everything - live vault state, recorded runs, and every transaction hash - without connecting a wallet at all.'
  },
  {
    question: 'What happens when a vault is paused?',
    answer:
      'deposit() reverts on-chain while a vault is paused. That freeze has been proven with mined, reverted transactions. No funds move during a pause, and pausing one vault never moves funds in any other vault.'
  },
  {
    question: 'How do I get my funds out of a paused vault?',
    answer:
      'In the v2 vaults, withdrawals stay open while paused - the breaker freezes deposits, not exits. In the public test instance, test deposits are owner-only to withdraw, so only send testnet dust you do not need back. In v1 vaults, withdrawal is owner-only.'
  },
  {
    question: 'Who can trigger a pause? Who can unpause?',
    answer:
      'Only the owner of a vault can trip it with emergencyPause() - except the public test instance, which anyone can trip so the loop can be tried without owning a vault. Unpausing is manual only, per vault, by its owner. There is no callback, timer, or automatic reopen: reopening is a human decision that follows an audit, not speed.'
  },
  {
    question: 'What is the watcher, and what is lREACT? What does a loop cost?',
    answer:
      'The watcher is the reactive contract on Lasna that listens for pause events and pays for the cross-chain callbacks. It pays in lREACT (Lasna’s testnet REACT). One full loop costs about 0.08-0.11 lREACT (measured), plus about 0.00000061 testnet ETH per callback destination, charged to that vault’s balance. The watcher only spends when a loop runs; when idle it costs nothing. If a watcher’s lREACT runs out, or proxy debt is outstanding, callbacks stop until the watcher is funded and the debt is covered with coverDebt().'
  },
  {
    question: 'Can I deploy my own vault?',
    answer:
      'Yes. Open Deploy your own in the navigation, pick a chain and an asset (ETH or USDC), and the page shows the predicted vault address before you send the transaction. Vaults are minimal-proxy clones of the audited-template implementation, created by a public factory. After creation you register the vault with a watcher, fund it, and it can join a loop.'
  },
  {
    question: 'Where is the on-chain proof?',
    answer:
      'Every claim on this site links to a public explorer: Uniscan (Unichain Sepolia), BaseScan (Base Sepolia), and Reactscan (Lasna). The Docs page lists the loop transactions - origin event, react(), callbacks, and containment - with block numbers, timestamps, and gas. The contracts are verified on Sourcify (exact_match).'
  },
  {
    question: 'What are the known limitations and risks?',
    answer:
      'The contracts are not audited and the deployment is a testnet demonstration. A chain reorganization can leave a sibling paused from an event that later disappears on the origin chain; this fails closed by design. On the v1 main set and the main v2 vaults, tripping a second origin before the first incident reaches CONTAINED can leave the incident stuck until manual intervention (unpause, then trip again) - do not trip a second origin until the first incident is CONTAINED. The fix is already in the repository code and live in the new public instance. The watcher does not subscribe to unpause events - unpausing is a per-deployment human decision. A full loop needs the watcher to hold lREACT; the live watcher balances are shown on the Overview page.'
  },
  {
    question:
      'My wallet asks me to disconnect before switching networks or depositing. What do I do?',
    answer:
      'Some WalletConnect wallets (notably OKX Wallet) tie the session to the network that was active when you connected, and may refuse to switch networks - or to send a transaction on another network - until you disconnect the dApp. Disconnect this site in your wallet, then connect again from this site and approve all chains offered. If the target network is not in your wallet at all, add it manually as a custom network first: Base Sepolia - chain ID 84532, RPC https://sepolia.base.org, currency ETH, explorer https://sepolia.basescan.org; Unichain Sepolia - chain ID 1301, RPC https://sepolia.unichain.org, currency ETH, explorer https://sepolia.uniscan.xyz; Lasna - chain ID 5318007, RPC https://lasna-rpc.rnk.dev/, currency lREACT, explorer https://lasna.reactscan.net. Then reconnect from this site.'
  }
];

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };

  return (
    <PageContainer
      pageTitle='Frequently Asked Questions'
      pageDescription='Answers about how ContagionStop works, what you need to try it, and what its limits are.'
    >
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className='flex flex-1 flex-col gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Last updated: 15 November 2026. All answers describe the testnet deployment at{' '}
              <LegalExternalLink href='https://contagion-stop.vercel.app'>
                contagion-stop.vercel.app
              </LegalExternalLink>
              . Full technical detail: <LegalInternalLink href='/dashboard/docs'>Docs</LegalInternalLink>.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-6 text-sm leading-relaxed'>
            <LegalSection number='1' title='What is ContagionStop?'>
              <p>
                ContagionStop is a cross-chain circuit breaker for DeFi vaults. When one deployment of a
                protocol is paused because an exploit was found, a reactive contract on Lasna pauses the
                sibling deployments on other chains within seconds — without waiting for a multisig to
                gather. No funds move: only deposits (and, for lending-style vaults, borrowing and minting)
                freeze on each sibling. See <LegalInternalLink href='/dashboard/docs'>Docs</LegalInternalLink>.
              </p>
            </LegalSection>

            <LegalSection number='2' title='How does a loop work, step by step?'>
              <ol className='flex list-decimal flex-col gap-2 pl-5'>
                <li>
                  The security team (the vault owner) calls{' '}
                  <code className='font-mono text-xs'>emergencyPause(reason)</code> on one vault — for
                  example vault A on Unichain Sepolia. Vault A pauses itself and emits an{' '}
                  <code className='font-mono text-xs'>EmergencyPaused</code> event.
                </li>
                <li>
                  The ContagionWatcher on Lasna (chain 5318007) receives the event log and runs{' '}
                  <code className='font-mono text-xs'>react()</code>, which requests a{' '}
                  <code className='font-mono text-xs'>pause()</code> callback to every registered sibling
                  vault.
                </li>
                <li>
                  Each sibling pauses and emits a <code className='font-mono text-xs'>Paused</code> log;
                  the watcher counts these confirmations.
                </li>
                <li>
                  Once every sibling has confirmed, the incident is CONTAINED. Measured on testnet, the
                  full loop takes about 3 seconds for the v1 set, and 2–8 seconds for the v2 vaults.
                </li>
              </ol>
            </LegalSection>

            <LegalSection number='3' title='Is this mainnet? Does it involve real money?'>
              <p>
                No. ContagionStop runs <strong>only on testnets</strong> — Unichain Sepolia, Base Sepolia,
                and Lasna. All tokens involved (testnet ETH, testnet USDC, lREACT) have{' '}
                <strong>no real-world value</strong>. The contracts are <strong>not audited</strong>. Never
                send real funds to any address shown on this site.
              </p>
            </LegalSection>

            <LegalSection number='4' title='What do I need to try it?'>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>
                  A wallet that can connect through the button in the header (for example MetaMask or
                  Coinbase Wallet, or a mobile wallet via WalletConnect). No account and no password are
                  needed; the site never asks for a seed phrase or a private key.
                </li>
                <li>
                  A small amount of testnet ETH on the chain of the vault you want to try, for gas. Free
                  sources are listed in the Judge quickstart on the Overview page (Superchain faucet,
                  Alchemy, CDP, and Circle&apos;s faucet for testnet USDC).
                </li>
                <li>
                  You must be on the vault&apos;s chain before pressing Trip or Deposit — switch networks
                  in the wallet modal. The site does not switch chains for you.
                </li>
                <li>
                  You can look at everything — live vault state, recorded runs, and every transaction
                  hash — without connecting a wallet at all.
                </li>
              </ul>
            </LegalSection>

            <LegalSection number='5' title='What happens when a vault is paused?'>
              <p>
                <code className='font-mono text-xs'>deposit()</code> reverts on-chain while a vault is
                paused. That freeze has been proven with mined, reverted transactions — see the freezing
                proof in <LegalInternalLink href='/dashboard/docs'>Docs</LegalInternalLink>. No funds move
                during a pause, and pausing one vault never moves funds in any other vault.
              </p>
            </LegalSection>

            <LegalSection number='6' title='How do I get my funds out of a paused vault?'>
              <p>
                In the v2 vaults, withdrawals stay open while paused — the breaker freezes deposits, not
                exits. In the public test instance, test deposits are owner-only to withdraw, so only
                send testnet dust you do not need back. In v1 vaults, withdrawal is owner-only.
              </p>
            </LegalSection>

            <LegalSection number='7' title='Who can trigger a pause? Who can unpause?'>
              <p>
                Only the owner of a vault can trip it with{' '}
                <code className='font-mono text-xs'>emergencyPause()</code> — except the public test
                instance, which anyone can trip so the loop can be tried without owning a vault.
                Unpausing is manual only, per vault, by its owner. There is no callback, timer, or
                automatic reopen: reopening is a human decision that follows an audit, not speed.
              </p>
            </LegalSection>

            <LegalSection number='8' title='What is the watcher, and what is lREACT? What does a loop cost?'>
              <p>
                The watcher is the reactive contract on Lasna that listens for pause events and pays for
                the cross-chain callbacks. It pays in lREACT (Lasna&apos;s testnet REACT). One full loop
                costs about 0.08–0.11 lREACT (measured), plus about 0.00000061 testnet ETH per callback
                destination, charged to that vault&apos;s balance. The watcher only spends when a loop
                runs; when idle it costs nothing. If a watcher&apos;s lREACT runs out, or proxy debt is
                outstanding, callbacks stop until the watcher is funded and the debt is covered with{' '}
                <code className='font-mono text-xs'>coverDebt()</code> — that failure mode is documented
                honestly in <LegalInternalLink href='/dashboard/docs'>Docs</LegalInternalLink>.
              </p>
            </LegalSection>

            <LegalSection number='9' title='Can I deploy my own vault?'>
              <p>
                Yes. Open <strong>Deploy your own</strong> in the navigation, pick a chain and an asset
                (ETH or USDC), and the page shows the predicted vault address before you send the
                transaction. Vaults are minimal-proxy clones of the audited-template implementation,
                created by a public factory. After creation you register the vault with a watcher, fund
                it, and it can join a loop. A full walkthrough is in{' '}
                <LegalInternalLink href='/dashboard/docs'>Docs</LegalInternalLink>.
              </p>
            </LegalSection>

            <LegalSection number='10' title='Where is the on-chain proof?'>
              <p>
                Every claim on this site links to a public explorer: Uniscan (Unichain Sepolia), BaseScan
                (Base Sepolia), and Reactscan (Lasna). The{' '}
                <LegalInternalLink href='/dashboard/docs'>Docs</LegalInternalLink> page lists the loop
                transactions — origin event, <code className='font-mono text-xs'>react()</code>,
                callbacks, and containment — with block numbers, timestamps, and gas. The contracts are
                verified on Sourcify (<code className='font-mono text-xs'>exact_match</code>).
              </p>
            </LegalSection>

            <LegalSection number='11' title='What are the known limitations and risks?'>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>
                  The contracts are <strong>not audited</strong> and the deployment is a testnet
                  demonstration.
                </li>
                <li>
                  A chain reorganization can leave a sibling paused from an event that later disappears
                  on the origin chain. This fails closed by design: a wrongly paused sibling costs
                  delayed deposits until a manual unpause.
                </li>
                <li>
                  On the v1 main set and the main v2 vaults, tripping a second origin before the first
                  incident reaches CONTAINED can leave the incident stuck until manual intervention
                  (unpause, then trip again). Do not trip a second origin until the first incident is
                  CONTAINED. The fix is already in the repository code and live in the new public
                  instance.
                </li>
                <li>
                  The watcher does not subscribe to unpause events — unpausing is a per-deployment human
                  decision and the watcher takes no action on it.
                </li>
                <li>
                  A full loop needs the watcher to hold lREACT. The live watcher balances are shown on
                  the Overview page, so a loop that cannot be paid for is visible before you try it.
                </li>
              </ul>
            </LegalSection>

            <LegalSection
              number='12'
              title='My wallet asks me to disconnect before switching networks or depositing. What do I do?'
            >
              <p>
                Some WalletConnect wallets (notably OKX Wallet) tie the session to the network that was
                active when you connected, and may refuse to switch networks — or to send a transaction
                on another network — until you disconnect the dApp. Disconnect this site in your wallet,
                then connect again from this site and approve all chains offered.
              </p>
              <p>
                If the target network is not in your wallet at all, add it manually as a custom network
                first:
              </p>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>
                  <strong>Base Sepolia</strong> — chain ID{' '}
                  <code className='font-mono text-xs'>84532</code>, RPC{' '}
                  <code className='font-mono text-xs'>https://sepolia.base.org</code>, currency ETH,
                  explorer{' '}
                  <code className='font-mono text-xs'>https://sepolia.basescan.org</code>
                </li>
                <li>
                  <strong>Unichain Sepolia</strong> — chain ID{' '}
                  <code className='font-mono text-xs'>1301</code>, RPC{' '}
                  <code className='font-mono text-xs'>https://sepolia.unichain.org</code>, currency ETH,
                  explorer{' '}
                  <code className='font-mono text-xs'>https://sepolia.uniscan.xyz</code>
                </li>
                <li>
                  <strong>Lasna</strong> — chain ID{' '}
                  <code className='font-mono text-xs'>5318007</code>, RPC{' '}
                  <code className='font-mono text-xs'>https://lasna-rpc.rnk.dev/</code>, currency
                  lREACT, explorer{' '}
                  <code className='font-mono text-xs'>https://lasna.reactscan.net</code>
                </li>
              </ul>
              <p>Then reconnect from this site.</p>
            </LegalSection>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
