import Link from 'next/link';
import { Icons } from '@/components/icons';

/**
 * Judge quickstart — what is needed to evaluate the loop, and where the
 * test tokens come from. Shared by the "Try it live" section and the
 * Docs page so the two never drift apart.
 *
 * Facts only, verified 15 Nov 2026 from the providers' own pages:
 * - Superchain faucet (Optimism console): 0.01 test ETH every 24 hours,
 *   networks listed on the page include Base Sepolia and Unichain
 *   Sepolia — https://console.optimism.io/faucet
 * - Circle faucet: test USDC — https://faucet.circle.com
 * - Alchemy faucet, Base Sepolia page: 0.1 ETH every 24 hours, no
 *   account; the wallet needs at least 0.001 ETH on Ethereum mainnet
 *   plus mainnet activity — https://www.alchemy.com/faucets/base-sepolia
 * - Coinbase Developer Platform faucet (CDP Portal): Base Sepolia ETH
 *   and USDC, CDP account required — https://portal.cdp.coinbase.com/products/faucet
 * No Alchemy page for Unichain Sepolia was verified, so none is linked;
 * the Superchain faucet covers Unichain Sepolia. Faucet limits change —
 * each faucet's own page is the final word.
 */
export function JudgeQuickstart() {
  return (
    <div className='flex flex-col gap-2 rounded-none border p-3 text-sm leading-relaxed'>
      <p className='font-semibold'>Judge quickstart — what you need</p>
      <p>
        <span className='font-medium'>No wallet needed to look.</span> The
        dashboard is read-only without a wallet: live vault balances and
        paused state, the recorded runs, and every transaction hash can be
        inspected as-is.
      </p>
      <p>
        <span className='font-medium'>To press the interactive buttons</span>{' '}
        (Trip incident, Test deposit, Deploy your own), connect a wallet
        holding testnet ETH on the vault&apos;s chain — Unichain Sepolia
        (1301) or Base Sepolia (84532) — for gas. Trying a USDC vault also
        needs testnet USDC on that chain. Testnet tokens have no value.
      </p>
      <p className='font-medium'>Free faucets</p>
      <ul className='flex list-disc flex-col gap-2 pl-5'>
        <li>
          <a
            href='https://console.optimism.io/faucet'
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:underline'
          >
            Superchain faucet
            <Icons.externalLink className='size-3' />
          </a>{' '}
          — test ETH for Unichain Sepolia and Base Sepolia, 0.01 test ETH
          every 24 hours (sign-in required; verifying onchain identity
          unlocks more).
        </li>
        <li>
          <a
            href='https://faucet.circle.com'
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:underline'
          >
            Circle faucet
            <Icons.externalLink className='size-3' />
          </a>{' '}
          — test USDC, 20 USDC per claim.
        </li>
        <li>
          <a
            href='https://www.alchemy.com/faucets/base-sepolia'
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:underline'
          >
            Alchemy faucet (Base Sepolia)
            <Icons.externalLink className='size-3' />
          </a>{' '}
          — 0.1 test ETH every 24 hours, no account; the wallet needs at
          least 0.001 ETH on Ethereum mainnet plus mainnet activity.
        </li>
        <li>
          <a
            href='https://portal.cdp.coinbase.com/products/faucet'
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:underline'
          >
            Coinbase Developer Platform faucet
            <Icons.externalLink className='size-3' />
          </a>{' '}
          — test ETH and USDC for Base Sepolia (0.0001 ETH per claim, up to
          1,000 claims per 24 hours; 1 USDC per claim, up to 10 per 24
          hours); free CDP account required.
        </li>
      </ul>
      <p className='text-muted-foreground text-xs'>
        Faucet limits and requirements change — the faucet&apos;s own page is
        the final word. No faucet needs your seed phrase, only your public
        wallet address.
      </p>
      <p>
        Questions about how it works, what it costs, or what can go wrong?{' '}
        <Link href='/faq' className='text-primary underline underline-offset-2 hover:underline'>
          Read the FAQ
        </Link>
        .
      </p>
    </div>
  );
}
