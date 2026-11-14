'use client';

import { Badge } from '@/components/ui/badge';
import { getChainName } from '@/lib/wagmi';
import { useChainId } from 'wagmi';

/**
 * Badge chain aktif (dot hitam + nama chain).
 * Monokrom (Nous Mono): dot selalu hitam, bukan warna per chain.
 * Nama chain disembunyikan di layar sangat kecil (<sm) agar header tidak
 * overflow — dot saja cukup sebagai penanda.
 * Dipakai di header dashboard, di samping ConnectButton.
 */
export default function ChainBadge() {
  const chainId = useChainId();

  return (
    <Badge variant='outline' className='font-mono tabular-nums'>
      <span
        className='mr-1.5 inline-block size-2 rounded-full bg-foreground'
        aria-hidden='true'
      />
      <span className='hidden sm:inline'>{getChainName(chainId)}</span>
    </Badge>
  );
}
