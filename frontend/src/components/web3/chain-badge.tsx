'use client';

import { Badge } from '@/components/ui/badge';
import { getChainName } from '@/lib/wagmi';
import { useChainId } from 'wagmi';

/**
 * Badge chain aktif (dot violet + nama chain).
 * Terminal violet: dot selalu ungu #8b5cf6, bukan warna per chain.
 * Nama chain disembunyikan di layar sangat kecil (<sm) agar header tidak
 * overflow — dot saja cukup sebagai penanda.
 * Dipakai di header dashboard, di samping tombol Connect Wallet.
 */
export default function ChainBadge() {
  const chainId = useChainId();

  return (
    <Badge variant='outline' className='font-mono tabular-nums'>
      <span
        className='mr-1.5 inline-block size-2 rounded-full bg-primary'
        aria-hidden='true'
      />
      <span className='hidden sm:inline'>{getChainName(chainId)}</span>
    </Badge>
  );
}
