'use client';

import { Button } from '@/components/ui/button';
import ChainBadge from '@/components/web3/chain-badge';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

/**
 * Header wallet group: active-chain badge + connect button.
 * Opens the Reown AppKit modal. When disconnected the button reads
 * "Connect Wallet"; when connected it shows the truncated address.
 * The modal's account view handles disconnect and network switching.
 * Client component — used by `src/components/layout/header.tsx`.
 */
export default function HeaderWallet() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  const label =
    isConnected && address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : 'Connect Wallet';

  return (
    <div className='flex items-center gap-2'>
      <ChainBadge />
      <Button onClick={() => open()} className='font-mono'>
        {label}
      </Button>
    </div>
  );
}
