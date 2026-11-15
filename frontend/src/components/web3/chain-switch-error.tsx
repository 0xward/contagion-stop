'use client';

import { useAppKit } from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { getChainName } from '@/lib/wagmi';
import type { SwitchChainFailure } from '@/lib/switch-chain';

/**
 * Guidance shown when a wallet refuses a chain switch — Win98 box, same
 * shape as the other inline notices on the vault cards.
 *
 * The message is deliberately general: a WalletConnect session only
 * carries the chains the wallet approved when the session started, so a
 * switch to any other chain can be refused (some wallets answer by
 * asking the user to disconnect the dApp first). It is not specific to
 * one chain — the failed switch that prompted this was between two
 * standard chains (Unichain Sepolia → Base Sepolia).
 *
 * "Disconnect & reconnect" ends the current wallet session and reopens
 * the AppKit modal, so the user can connect again and approve every
 * chain offered in the fresh session.
 */
export default function ChainSwitchError({
  failure,
  onDismiss
}: {
  failure: SwitchChainFailure;
  onDismiss: () => void;
}) {
  const { disconnectAsync } = useDisconnect();
  const { open } = useAppKit();
  const chainName = getChainName(failure.chainId);
  const notApproved = failure.kind === 'chain-not-approved';

  async function handleReconnect() {
    try {
      await disconnectAsync();
    } catch {
      // A failing disconnect must not block the reconnect — the modal
      // still lets the user connect again from the site.
    }
    onDismiss();
    open();
  }

  return (
    <div
      className='flex flex-col gap-2 rounded-none border border-foreground/40 bg-muted p-2 text-xs'
      role='alert'
    >
      <p className='flex items-start gap-1.5 font-medium'>
        <Icons.warning className='mt-0.5 size-3.5 shrink-0' aria-hidden='true' />
        <span>Could not switch to {chainName}.</span>
      </p>
      <p>
        {notApproved
          ? 'Your wallet has not approved this chain in the current session, so it cannot switch to it now.'
          : 'The chain switch failed.'}
      </p>
      <p>
        To fix it: disconnect this site in your wallet, then connect again
        from this site and approve all chains offered.
      </p>
      <div className='flex flex-wrap gap-2'>
        <Button variant='default' size='sm' onClick={() => void handleReconnect()}>
          Disconnect &amp; reconnect
        </Button>
        <Button variant='outline' size='sm' onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
