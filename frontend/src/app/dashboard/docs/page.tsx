import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

/**
 * Documentation page — product documentation for ContagionStop.
 * Everything on this page is verifiable on-chain: contract addresses,
 * transaction hashes, and latency numbers are measured on testnet
 * (14 Nov 2026) and link out to the public explorers.
 */

const CONTRACTS = [
  {
    name: 'SiblingVault A (origin)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5',
    explorer: 'https://sepolia.uniscan.xyz/address/0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5'
  },
  {
    name: 'SiblingVault B',
    chain: 'Base Sepolia (84532)',
    address: '0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a',
    explorer: 'https://sepolia.basescan.org/address/0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a'
  },
  {
    name: 'SiblingVault C',
    chain: 'Unichain Sepolia (1301)',
    address: '0xb07a380104ac093485566cfc964540b04518b354',
    explorer: 'https://sepolia.uniscan.xyz/address/0xb07a380104ac093485566cfc964540b04518b354'
  },
  {
    name: 'ContagionWatcher',
    chain: 'Lasna (5318007)',
    address: '0xb18a213bfa8c1888af39af100d7dd54aa376f7b5',
    explorer: 'https://lasna.reactscan.net/address/0xb18a213bfa8c1888af39af100d7dd54aa376f7b5'
  },
  {
    name: 'SiblingVault D (test-only, unregistered)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x8fB4aae500D914a1876f06FfA7f74fE9A88cEf7a',
    explorer: 'https://sepolia.uniscan.xyz/address/0x8fB4aae500D914a1876f06FfA7f74fE9A88cEf7a'
  },
  {
    name: 'Callback proxy',
    chain: 'Base Sepolia (84532)',
    address: '0x476F44b11F5C942c58f4c8E3d0300E5710743585',
    explorer: 'https://sepolia.basescan.org/address/0x476F44b11F5C942c58f4c8E3d0300E5710743585'
  },
  {
    name: 'Callback proxy',
    chain: 'Unichain Sepolia (1301)',
    address: '0x775c9B990ADe401060B78D0e98684eEf8d2466C1',
    explorer: 'https://sepolia.uniscan.xyz/address/0x775c9B990ADe401060B78D0e98684eEf8d2466C1'
  }
] as const;

const PUBLIC_CONTRACTS = [
  {
    name: 'PublicVault U1 (origin)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x2bd64b3ee79eb1f38191e0b185786cb176d8696c',
    explorer: 'https://sepolia.uniscan.xyz/address/0x2bd64b3ee79eb1f38191e0b185786cb176d8696c'
  },
  {
    name: 'PublicVault U2',
    chain: 'Unichain Sepolia (1301)',
    address: '0xf3475038bc53aa50408272F233F5dF73F6CF8F8c',
    explorer: 'https://sepolia.uniscan.xyz/address/0xf3475038bc53aa50408272F233F5dF73F6CF8F8c'
  },
  {
    name: 'PublicVault B',
    chain: 'Base Sepolia (84532)',
    address: '0x4b44497bAD6c270462D0529FCe4E41A7e092669b',
    explorer: 'https://sepolia.basescan.org/address/0x4b44497bAD6c270462D0529FCe4E41A7e092669b'
  },
  {
    name: 'Public ContagionWatcher',
    chain: 'Lasna (5318007)',
    address: '0x73f6e9989057f060801d1ab7d57f6047ff6c5557',
    explorer: 'https://lasna.reactscan.net/address/0x73f6e9989057f060801d1ab7d57f6047ff6c5557'
  }
] as const;

const PUBLIC_E2E_TXS = [
  {
    step: 'Cycle 1 — trip U1 (TEST-001)',
    chain: 'Unichain Sepolia',
    hash: '0x9cb807fa07c2e29acebc113852f0532bbce3dcf76d7180179d458dbe62827a02',
    shortHash: '0x9cb807fa…7a02',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x9cb807fa07c2e29acebc113852f0532bbce3dcf76d7180179d458dbe62827a02',
    detail: 'Block 67866420 · from a wallet that is not the owner'
  },
  {
    step: 'Cycle 1 — react()',
    chain: 'Lasna',
    hash: '0x5fbbc913603634354b3ba40f10ac170f96b8cebef2fe01072dbc264816bdc7dc',
    shortHash: '0x5fbbc913…7dc',
    explorer: 'https://lasna.reactscan.net/tx/0x5fbbc913603634354b3ba40f10ac170f96b8cebef2fe01072dbc264816bdc7dc',
    detail: 'Block 8382934 · IncidentTripped + 2× PauseRequested'
  },
  {
    step: 'Cycle 1 — callback pause() U2',
    chain: 'Unichain Sepolia',
    hash: '0x7acc95dbfeb696d8195e2878e8902b05be15cee53ff5524b8a265093ab1b13e3',
    shortHash: '0x7acc95db…b13e3',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x7acc95dbfeb696d8195e2878e8902b05be15cee53ff5524b8a265093ab1b13e3',
    detail: 'Block 67866422 · ~2 s after the trip'
  },
  {
    step: 'Cycle 1 — callback pause() B',
    chain: 'Base Sepolia',
    hash: '0x7197499c90d1fdd47b07a5c04acef4bf2c1feb042017a2a0da908b88b4f2bdff',
    shortHash: '0x7197499c…2bdff',
    explorer: 'https://sepolia.basescan.org/tx/0x7197499c90d1fdd47b07a5c04acef4bf2c1feb042017a2a0da908b88b4f2bdff',
    detail: 'Block 58984906 · ~2 s after the trip'
  },
  {
    step: 'Cycle 1 — deposit() to paused U1, reverted',
    chain: 'Unichain Sepolia',
    hash: '0x78129ef96b1a9bb4de664ab81bfa25d14ef78acd8805f3c5ffa39ef0d3b3be0a',
    shortHash: '0x78129ef9…3be0a',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x78129ef96b1a9bb4de664ab81bfa25d14ef78acd8805f3c5ffa39ef0d3b3be0a',
    detail: 'Block 67866582 · status 0x0 (EnforcedPause)'
  },
  {
    step: 'Cycle 1 — deposit() after reopen, confirmed',
    chain: 'Unichain Sepolia',
    hash: '0x662377b0bcc1ed413cfc44051403eeca949675a14ad401d7548dd62fd1d8d7b9',
    shortHash: '0x662377b0…8d7b9',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x662377b0bcc1ed413cfc44051403eeca949675a14ad401d7548dd62fd1d8d7b9',
    detail: 'Block 67866602 · 0.001 ETH accepted'
  },
  {
    step: 'Cycle 2 — trip U1 (TEST-002)',
    chain: 'Unichain Sepolia',
    hash: '0xb4f59a603a8032495c22646c518a8bdfc709e1124acd04bb40eb18a13418a541',
    shortHash: '0xb4f59a60…8541',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xb4f59a603a8032495c22646c518a8bdfc709e1124acd04bb40eb18a13418a541',
    detail: 'Block 67866642 · loop repeated, ~2 s again'
  }
] as const;

const LOOP_TXS = [
  {
    step: '1. emergencyPause (trigger)',
    chain: 'Unichain Sepolia',
    hash: '0xe9f11b6df0c2e2f8efc7929cce4aa0b7910e094c6defc18e1f59ddea427e2257',
    shortHash: '0xe9f11b6d…e2257',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xe9f11b6df0c2e2f8efc7929cce4aa0b7910e094c6defc18e1f59ddea427e2257',
    detail: 'Block 67816030'
  },
  {
    step: '2. react()',
    chain: 'Lasna',
    hash: '0x98dd6dad4b360201ebae842be7280ee0da47051dd4607b6cafac6ef73f21293a',
    shortHash: '0x98dd6dad…f21293a',
    explorer: 'https://lasna.reactscan.net/tx/0x98dd6dad4b360201ebae842be7280ee0da47051dd4607b6cafac6ef73f21293a',
    detail: 'Block 8335436 · 349,263 gas'
  },
  {
    step: '3. Callback pause() — vault B',
    chain: 'Base Sepolia',
    hash: '0xe84c258d1ebc313c7fe19f016bfa0805ba28fe93dd61811e4544627b734c506b',
    shortHash: '0xe84c258d…34c506b',
    explorer: 'https://sepolia.basescan.org/tx/0xe84c258d1ebc313c7fe19f016bfa0805ba28fe93dd61811e4544627b734c506b',
    detail: 'Block 58732960 · 78,314 gas'
  },
  {
    step: '4. Callback pause() — vault C',
    chain: 'Unichain Sepolia',
    hash: '0x60e534047a2e279cf8c3c9dcacc21d949ed396f773a6e9f82c1c8eab444e5912',
    shortHash: '0x60e53404…44e5912',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x60e534047a2e279cf8c3c9dcacc21d949ed396f773a6e9f82c1c8eab444e5912',
    detail: 'Block 67816033 · 78,304 gas'
  },
  {
    step: 'Containment confirmed',
    chain: 'Lasna',
    hash: '0xf73ce63e667c8d6223e4611d6ceed2af0425bd0b69d6e0e1222672c5f74a3d0c',
    shortHash: '0xf73ce63e…5f74a3d0c',
    explorer: 'https://lasna.reactscan.net/tx/0xf73ce63e667c8d6223e4611d6ceed2af0425bd0b69d6e0e1222672c5f74a3d0c',
    detail: 'Block 8335438 · IncidentContained'
  }
] as const;

const FREEZE_PROOFS = [
  {
    chain: 'Base Sepolia',
    hash: '0x47c8e697935b07f03114277ae0f526d1f52e6e10240a631bc048e889ae03db76',
    shortHash: '0x47c8e697…ae03db76',
    explorer: 'https://sepolia.basescan.org/tx/0x47c8e697935b07f03114277ae0f526d1f52e6e10240a631bc048e889ae03db76',
    detail: 'Block 58733692 · status 0x0'
  },
  {
    chain: 'Unichain Sepolia',
    hash: '0xe1b8c9c9b259b28a031208a585a39ed89b1ce31333aa975d53b161726ae0a499',
    shortHash: '0xe1b8c9c9…ae0a499',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xe1b8c9c9b259b28a031208a585a39ed89b1ce31333aa975d53b161726ae0a499',
    detail: 'Block 67816462 · status 0x0'
  }
] as const;

const LATENCY = [
  { metric: 'Full loop, trigger to last sibling paused', value: '3 seconds' },
  { metric: 'Event to react()', value: '0 seconds (same second)' },
  { metric: 'react() to Base Sepolia callback', value: '2 seconds' },
  { metric: 'react() to Unichain Sepolia callback', value: '3 seconds' },
  { metric: 'Time until CONTAINED', value: '2 seconds' },
  { metric: 'Siblings confirmed', value: '2 of 2' },
  { metric: 'Gas, react() (fan-out of 2)', value: '349,263 (limit 900,000)' },
  { metric: 'Gas, callback pause()', value: '78,314 / 78,304 (limit 200,000)' },
  { metric: 'Cost per loop', value: '~0.08–0.11 lREACT per loop (measured), plus about 0.00000061 ETH per callback destination' }
] as const;

const SCENARIOS = [
  {
    title: 'Full loop',
    text: 'Trigger to containment in 3 seconds, 2 of 2 siblings confirmed, and deposits on both siblings revert after the pause.'
  },
  {
    title: 'Retry',
    text: 'An outstanding proxy debt blocks a callback. After covering the debt, funding the sibling, and unpausing a paused-but-unconfirmed sibling, the retry re-emit fans out only to unconfirmed destinations, and trippedAt is unchanged.'
  },
  {
    title: 'Fall-through',
    text: 'An unregistered vault (D) trips and the watcher correctly ignores it: zero watcher events in the 130+ Lasna blocks after the trip.'
  },
  {
    title: 'Idempotency',
    text: 'Exactly 3 IncidentTripped and 3 IncidentContained events across all incidents. pause() called directly by an externally owned account reverts with NotAuthorized.'
  },
  {
    title: 'Manual unpause',
    text: 'All three vaults are unpaused by their owners, deposits work again, and watcher state is unchanged.'
  }
] as const;

const SECURITY_POINTS = [
  {
    title: 'One react(), N callbacks',
    text: 'A fan-out of 2 is proven on testnet. The 900,000 gas cap on react() bounds how many siblings one react() can cover.'
  },
  {
    title: 'Per-destination confirmation',
    text: 'The watcher tracks confirmation per chain and per sibling. Confirmations can arrive in any order — or not arrive at all — and the incident stays visibly unconfirmed until every sibling reports back.'
  },
  {
    title: 'Safe retry',
    text: 'A re-emit is distinguished from a new incident: trippedAt and the reason are never overwritten. Before retrying, the operator must cover outstanding proxy debt, fund the sibling, and unpause any paused-but-unconfirmed sibling first.'
  },
  {
    title: 'Idempotent pause',
    text: 'Calling pause() on an already-paused sibling is a silent no-op and emits no Paused event.'
  },
  {
    title: 'Manual unpause only',
    text: 'unpause() is onlyOwner, per vault. There is no callback path to unpause, no timer, and no automatic reopen — reopening requires an audit, not speed.'
  },
  {
    title: 'No keeper, no oracle, no AI',
    text: 'The trigger is an on-chain event emitted by the protocol itself, and the logic is pure Solidity on Lasna. There is no off-chain service to keep alive and no subscription to pay.'
  },
  {
    title: 'Fail-closed',
    text: 'Any failure ends in a safe state (paused) or a visible state (unconfirmed, waiting for an operator re-emit) — never in a state that looks safe but is open.'
  },
  {
    title: 'Zero cost when idle',
    text: 'No cron, no polling. The watcher pays nothing until an incident trips.'
  }
] as const;

const LIMITATIONS = [
  'Maximum callbacks per react() is unverified beyond a fan-out of 2; expanding to more chains must be tested first.',
  'A chain reorganization can leave a sibling paused from an event that later disappears on the origin chain. This fails closed by design: a wrongly paused sibling costs delayed deposits until a manual unpause; a deployment left open during a real exploit costs its funds.',
  'The watcher does not subscribe to unpause events. Unpausing is a per-deployment human decision and the watcher has no action to take on it.'
] as const;

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noreferrer'
      className='inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline'
    >
      {children}
      <Icons.externalLink className='size-3.5 shrink-0' />
    </a>
  );
}

function DocTable({ children }: { children: React.ReactNode }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>{children}</table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <PageContainer
      pageTitle='Documentation'
      pageDescription='How ContagionStop works, the deployed contracts, and how to verify every claim on-chain.'
    >
      <div className='flex flex-1 flex-col gap-4'>
        <Card>
          <CardHeader>
            <div className='flex flex-wrap items-center gap-2'>
              <CardTitle>What is ContagionStop</CardTitle>
              <Badge variant='outline' className='border-primary/40 text-primary'>
                <Icons.circleCheck className='mr-1 size-3.5' />
                RECORDED RUN — TESTNET
              </Badge>
              <Badge variant='outline'>
                <Icons.warning className='mr-1 size-3.5' />
                TESTNET ONLY — NOT AUDITED
              </Badge>
            </div>
            <CardDescription>
              A cross-chain circuit breaker for multi-chain DeFi protocols.
              Testnet only. Do not use with real funds.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-3 text-sm leading-relaxed'>
            <p>
              ContagionStop is a cross-chain circuit breaker for protocols
              that deploy the same vault on several chains. When a
              vulnerability is found in one deployment, an attacker can replay
              the same exploit against the sibling deployments while the team
              is still organizing a manual pause — a multisig that needs hours
              to gather members across time zones, reach quorum, and sign one
              transaction per chain.
            </p>
            <p>
              ContagionStop removes the human from the execution path. When
              the security team pauses one deployment, a reactive contract on
              the Reactive Network (Lasna) detects the on-chain event and
              requests a pause callback to every sibling deployment on other
              chains. No funds move: only deposits, borrows, and mints freeze
              on each sibling. Measured on testnet, the full loop — from the
              trigger transaction to the last sibling paused — takes 3
              seconds.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>
              One event, one react(), one callback per sibling — and a
              confirmation for each.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4 text-sm leading-relaxed'>
            <ol className='flex list-decimal flex-col gap-3 pl-5'>
              <li>
                <span className='font-medium'>Setup.</span> Three
                SiblingVault contracts are deployed and funded, and the
                ContagionWatcher on Lasna is registered and active. Each vault
                accepts deposits.
              </li>
              <li>
                <span className='font-medium'>Trigger.</span> The security
                team (owner of vault A) calls{' '}
                <code className='font-mono text-xs'>emergencyPause(reason)</code>{' '}
                on Unichain Sepolia. Vault A pauses itself and emits{' '}
                <code className='font-mono text-xs'>EmergencyPaused</code>. No
                funds move.
              </li>
              <li>
                <span className='font-medium'>React.</span> The watcher
                receives the LogRecord on Lasna. Its{' '}
                <code className='font-mono text-xs'>react()</code> records the
                incident (trippedAt, reason, active), marks the origin
                confirmed, and requests two{' '}
                <code className='font-mono text-xs'>pause()</code> callbacks:
                to vault B on Base Sepolia and vault C on Unichain Sepolia.
                One react() fans out to two callbacks.
              </li>
              <li>
                <span className='font-medium'>Execute.</span> The Reactive
                network sends both callbacks through each chain&apos;s
                callback proxy. <code className='font-mono text-xs'>pause()</code>{' '}
                on B and C passes its guards, pauses the vault, and emits{' '}
                <code className='font-mono text-xs'>Paused</code>. Deposits on
                B and C now revert.
              </li>
              <li>
                <span className='font-medium'>Confirm.</span> The watcher
                receives a <code className='font-mono text-xs'>Paused</code>{' '}
                LogRecord from each sibling and marks it confirmed. When all
                siblings are confirmed, the incident is CONTAINED.
              </li>
              <li>
                <span className='font-medium'>Close (manual).</span> After an
                audit, the owner of each vault calls{' '}
                <code className='font-mono text-xs'>unpause()</code> on that
                vault directly. The watcher is not involved and records
                nothing.
              </li>
            </ol>
            <p className='text-muted-foreground'>
              Between the trigger transaction and the callbacks, no transaction
              is signed by a human — only the react() transaction executed by
              Reactive validators. The dashboard never calls pause() directly;
              only the watcher contract&apos;s callback does, after a real
              EmergencyPaused LogRecord.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Measured latency</CardTitle>
            <CardDescription>
              Incident 1 (reason EXPLOIT-001), 14 Nov 2026. Latencies are
              block timestamps from the explorers, with 1-second granularity;
              cross-chain clocks can differ by plus or minus 1 second.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocTable>
              <tbody>
                {LATENCY.map((row) => (
                  <tr key={row.metric} className='border-b last:border-b-0'>
                    <td className='py-2 pr-4'>{row.metric}</td>
                    <td className='py-2 font-mono text-xs font-medium tabular-nums'>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DocTable>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contract addresses</CardTitle>
            <CardDescription>
              All four production contracts are Sourcify-verified
              (exact_match, creation and runtime).
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-6'>
            <DocTable>
              <thead>
                <tr className='border-b text-left text-muted-foreground'>
                  <th className='py-2 pr-4 font-medium'>Contract</th>
                  <th className='py-2 pr-4 font-medium'>Chain</th>
                  <th className='py-2 font-medium'>Address</th>
                </tr>
              </thead>
              <tbody>
                {CONTRACTS.map((contract) => (
                  <tr key={contract.address} className='border-b align-top last:border-b-0'>
                    <td className='py-2 pr-4 font-medium'>{contract.name}</td>
                    <td className='py-2 pr-4 whitespace-nowrap'>{contract.chain}</td>
                    <td className='py-2'>
                      <ExternalLink href={contract.explorer}>
                        <span className='font-mono text-xs break-all'>
                          {contract.address}
                        </span>
                      </ExternalLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DocTable>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                Public test deployment — anyone can trip and reopen these
              (Sourcify exact_match, all four)
              </p>
              <DocTable>
                <tbody>
                  {PUBLIC_CONTRACTS.map((contract) => (
                    <tr key={contract.address} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{contract.name}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{contract.chain}</td>
                      <td className='py-2'>
                        <ExternalLink href={contract.explorer}>
                          <span className='font-mono text-xs break-all'>
                            {contract.address}
                          </span>
                        </ExternalLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to verify</CardTitle>
            <CardDescription>
              The full loop of incident 1, transaction by transaction. Every
              hash below links to its explorer.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-6'>
            <DocTable>
              <thead>
                <tr className='border-b text-left text-muted-foreground'>
                  <th className='py-2 pr-4 font-medium'>Step</th>
                  <th className='py-2 pr-4 font-medium'>Chain</th>
                  <th className='py-2 pr-4 font-medium'>Transaction</th>
                  <th className='py-2 font-medium'>Detail</th>
                </tr>
              </thead>
              <tbody>
                {LOOP_TXS.map((tx) => (
                  <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                    <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                    <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                    <td className='py-2 pr-4'>
                      <ExternalLink href={tx.explorer}>
                        <span className='font-mono text-xs'>{tx.shortHash}</span>
                      </ExternalLink>
                    </td>
                    <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                      {tx.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DocTable>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                Proof of freezing — deposit() after the pause reverts
              </p>
              <p className='text-sm text-muted-foreground'>
                Both attempts were mined with status 0x0, which is the
                on-chain proof that deposits are frozen once a vault is
                paused.
              </p>
              <DocTable>
                <tbody>
                  {FREEZE_PROOFS.map((proof) => (
                    <tr key={proof.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{proof.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={proof.explorer}>
                          <span className='font-mono text-xs'>{proof.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {proof.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
            <div className='flex flex-col gap-3'>
              <p className='text-sm font-medium'>
                Five scenarios, all passing (14 Nov 2026)
              </p>
              <ul className='flex flex-col gap-3'>
                {SCENARIOS.map((scenario) => (
                  <li key={scenario.title} className='flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0'>
                    <span className='flex items-center gap-2 text-sm font-medium'>
                      <Icons.circleCheck className='size-4 shrink-0 text-primary' />
                      {scenario.title}
                    </span>
                    <span className='text-sm text-muted-foreground'>
                      {scenario.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Try it live — public test deployment</CardTitle>
            <CardDescription>
              Test the full loop yourself with any wallet. The public vaults
              are permissionless by design; the main deployment above is
              owner-only.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4 text-sm leading-relaxed'>
            <ol className='flex list-decimal flex-col gap-3 pl-5'>
              <li>
                <span className='font-medium'>Connect a wallet</span> (top
                right). Any wallet works — no owner role is needed on the
                public instance. You need a little testnet ETH on Unichain
                Sepolia and/or Base Sepolia for gas, plus the network switched
                to the vault&apos;s chain (the page offers a switch button
                when you are on the wrong chain).
              </li>
              <li>
                <span className='font-medium'>Trip.</span> On the Overview
                page, in &ldquo;Try it live&rdquo;, pick a vault (U1 is the
                origin used in the recorded runs) and press{' '}
                <span className='font-medium'>Trip incident</span>. Confirm
                the transaction in your wallet. Expect: the trip transaction
                confirms within a few seconds, and the page shows
                &ldquo;Trip confirmed — callbacks expected, not yet
                confirmed&rdquo;.
              </li>
              <li>
                <span className='font-medium'>Wait ~2 seconds.</span> The
                public watcher on Lasna reacts and requests a pause callback
                to each of the other two vaults. Expect: all three vault cards
                flip to PAUSED. Press{' '}
                <span className='font-medium'>Refresh live state</span> if
                the cards have not updated yet — the page re-reads paused(),
                balance, and totalDeposited() from chain.
              </li>
              <li>
                <span className='font-medium'>Verify on the explorer.</span>{' '}
                Open the trip transaction hash from the confirmation box and
                check its status. Then open the watcher on Reactscan and the
                two callback transactions: the recorded cycle 1 hashes are
                listed below, and your own run produces the same pattern
                (trip → react → 2 callbacks → contained).
              </li>
              <li>
                <span className='font-medium'>Reopen.</span> Press{' '}
                <span className='font-medium'>Reopen</span> on each vault
                (any wallet can do this here) and confirm. Expect: each vault
                returns to ACTIVE. Reopen on an already-active vault is
                disabled — it would revert.
              </li>
              <li>
                <span className='font-medium'>Test deposit.</span> Press{' '}
                <span className='font-medium'>Test deposit() — 0.001 ETH</span>{' '}
                on a vault. Expect: the deposit confirms and totalDeposited()
                rises by 0.001 ETH. While a vault is paused the button is
                disabled — a deposit then would revert (EnforcedPause), which
                is the freeze proof, not a bug. A test deposit stays in the
                public vault: withdraw is owner-only, so send only testnet
                dust you do not need back.
              </li>
            </ol>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                What you can and cannot do
              </p>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>
                  On the public test deployment: trip, reopen, and deposit
                  with any wallet. On the main deployment: the same actions
                  are enabled only for the vault owner wallet — visitors can
                  inspect the live state (paused, balances, owner) but cannot
                  trigger actions.
                </li>
                <li>
                  Without a wallet, the Overview page still shows the recorded
                  run: incident 1, the measured latency, and the transaction
                  hashes.
                </li>
                <li>
                  Every number on the Overview page is labeled where it comes
                  from: LIVE reads (vault paused state, balances, watcher
                  balance) or the RECORDED run #1 (incident, timeline,
                  history). The recorded-run switch only changes which
                  recorded snapshot is shown; it sends no transaction and
                  changes no live state.
                </li>
                <li>
                  One full loop costs ~0.08–0.11 lREACT (measured). The
                  public watcher is funded for about 20 loops from its
                  handover balance; each vault holds ~0.001 ETH for callback
                  fees.
                </li>
              </ul>
            </div>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                Recorded public test runs — cycle 1 and cycle 2 (15 Nov 2026)
              </p>
              <p className='text-sm text-muted-foreground'>
                Both cycles were run from a wallet that is not the owner, trip
                → react → 2 callbacks → contained, each full loop ~2 s. Cycle
                2 used reason TEST-002 and repeated the same pattern. Verify
                every hash on its explorer; all four public contracts are
                Sourcify exact_match (check any address at{' '}
                <code className='font-mono text-xs'>sourcify.dev</code> by
                chain ID + address).
              </p>
              <DocTable>
                <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                    <th className='py-2 pr-4 font-medium'>Step</th>
                    <th className='py-2 pr-4 font-medium'>Chain</th>
                    <th className='py-2 pr-4 font-medium'>Transaction</th>
                    <th className='py-2 font-medium'>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {PUBLIC_E2E_TXS.map((tx) => (
                    <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={tx.explorer}>
                          <span className='font-mono text-xs'>{tx.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {tx.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Architecture and security model</CardTitle>
            <CardDescription>
              How the system stays safe when chains fail, callbacks fail, or
              events arrive late.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>
            <ul className='flex flex-col gap-3'>
              {SECURITY_POINTS.map((point) => (
                <li key={point.title} className='flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0'>
                  <span className='flex items-center gap-2 text-sm font-medium'>
                    <Icons.lock className='size-4 shrink-0 text-primary' />
                    {point.title}
                  </span>
                  <span className='text-sm text-muted-foreground'>{point.text}</span>
                </li>
              ))}
            </ul>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>Known limitations</p>
              <ul className='flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground'>
                {LIMITATIONS.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
            <p className='text-sm text-muted-foreground'>
              Stack: Solidity 0.8.29, Foundry, reactive-lib-omni v0.1.0,
              OpenZeppelin v5 (Pausable, Ownable). Callback gas limit 200,000
              per callback; react() gas limit 900,000.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
            <CardDescription>
              Source code, the live site, and the explorers used above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className='flex flex-col gap-2 text-sm'>
              <li>
                <ExternalLink href='https://github.com/0xward/contagion-stop'>
                  GitHub repository
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href='https://contagion-stop.vercel.app'>
                  Live site
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href='https://sepolia.basescan.org'>
                  Base Sepolia explorer (BaseScan)
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href='https://sepolia.uniscan.xyz'>
                  Unichain Sepolia explorer (Uniscan)
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href='https://lasna.reactscan.net'>
                  Lasna explorer (Reactscan)
                </ExternalLink>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
