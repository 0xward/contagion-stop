'use client';

import ChainBadge from '@/components/web3/chain-badge';
import { ConnectButton } from '@rainbow-me/rainbowkit';

/**
 * Kelompok wallet di header: badge chain aktif + tombol connect RainbowKit.
 * Client component — dipakai oleh `src/components/layout/header.tsx`.
 */
export default function HeaderWallet() {
  return (
    <div className='flex items-center gap-2'>
      <ChainBadge />
      <ConnectButton showBalance={false} />
    </div>
  );
}
