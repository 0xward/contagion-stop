'use client';

import { Button } from '@/components/ui/button';
import ChainBadge from '@/components/web3/chain-badge';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { cn } from '@/lib/utils';

/**
 * Header wallet group: active-chain badge + connect button.
 * Opens the Reown AppKit modal. When disconnected the button reads
 * "Connect Wallet"; when connected it shows the truncated address.
 * The modal's account view handles disconnect and network switching.
 * `orientation="column"` stacks badge + full-width button for the sidebar.
 * Client component — used by the dashboard layout (header + sidebar).
 */
export default function HeaderWallet({
  orientation = 'row'
}: {
  orientation?: 'row' | 'column';
}) {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  const label =
    isConnected && address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : 'Connect Wallet';

  return (
    <div
      className={cn(
        'flex gap-2',
        orientation === 'column' ? 'flex-col items-stretch' : 'items-center'
      )}
    >
      <ChainBadge />
      <Button onClick={() => open()} className='font-mono'>
        {label}
      </Button>
    </div>
  );
}
