'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { chains, getChainName } from '@/lib/wagmi';
import { useChainId, useSwitchChain } from 'wagmi';

/**
 * Logo resmi tiap chain — file di frontend/public/icons/.
 * Unichain: ikon jaringan resmi Unichain (putih di atas pink, sesuai
 * brand kit unichain.org) via registri ethereum-lists/chains
 * (icon "unichain-testnet" untuk chain 1301).
 * Base: "The Square" biru dari brand kit resmi base-org/brand-kit
 * (logo/TheSquare/Digital/Base_square_blue.svg).
 * Lasna: simbol Reactive Network (cincin + petir biru) dari
 * ava-labs/builders-hub (public/images/Symbol_ColorBlack_H32.png,
 * diajukan di PR penambahan integrasi Reactive Network).
 */
const CHAIN_ICON: Record<number, string> = {
  1301: '/icons/chain-unichain.png',
  84532: '/icons/chain-base.svg',
  5318007: '/icons/chain-lasna.png'
};

/** Chain yang bisa dipilih — urutan mengikuti lib/wagmi.ts. */
const SWITCHABLE_CHAINS: { id: number; name: string; icon: string }[] =
  chains.flatMap((c) => {
    const icon = CHAIN_ICON[Number(c.id)];
    return icon === undefined
      ? []
      : [{ id: Number(c.id), name: c.name, icon }];
  });

/**
 * Badge chain aktif sebagai tombol switch chain.
 * Tampilan: dot navy + nama chain + panah ▾, gaya tombol Win98
 * (shadcn Button di dalam .win98-scope mendapat bevel raised/pressed
 * dari 98.css). Nama chain disembunyikan di layar sangat kecil (<sm)
 * agar header tidak overflow — dot + panah saja cukup sebagai penanda.
 * Klik membuka dropdown Win98 (pola yang sama dengan Start menu di
 * taskbar: container `.window` + baris `.win98-start-menu-item`),
 * berisi ketiga testnet dengan logo + centang pada chain aktif.
 * Pindah chain memakai wagmi useSwitchChain: bila wallet terhubung,
 * wallet diminta pindah chain; bila belum terhubung, wagmi hanya
 * memperbarui chainId aktif aplikasi (cabang tanpa koneksi di
 * @wagmi/core switchChain: config.setState), sehingga badge dan
 * bacaan yang mengikuti useChainId() ikut berpindah.
 * Dipakai di header dashboard, di samping tombol Connect Wallet
 * (juga di sidebar via HeaderWallet orientation="column").
 */
export default function ChainBadge() {
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar / tekan Escape — sama seperti
  // Start menu di taskbar.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleSelect = async (targetId: number) => {
    if (targetId === chainId || isSwitching) {
      setMenuOpen(false);
      return;
    }
    try {
      await switchChain({ chainId: targetId });
      setMenuOpen(false);
    } catch {
      // Wallet menolak pindah chain (atau konektor tidak mendukung) —
      // biarkan menu tetap terbuka supaya pengguna bisa mencoba lagi
      // atau memilih chain lain.
    }
  };

  return (
    <div className='relative shrink-0' ref={menuRef}>
      <Button
        type='button'
        variant='outline'
        size='sm'
        title='Switch network'
        aria-label={`Switch network — current chain: ${getChainName(chainId)}`}
        aria-haspopup='menu'
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
        className='gap-1.5 px-2 font-mono tabular-nums'
      >
        <span
          className='inline-block size-2 shrink-0 rounded-full bg-primary'
          aria-hidden='true'
        />
        <span className='hidden sm:inline'>{getChainName(chainId)}</span>
        <svg
          aria-hidden='true'
          viewBox='0 0 8 6'
          className='size-2 shrink-0'
        >
          <polygon points='0,0 8,0 4,6' fill='currentColor' />
        </svg>
      </Button>
      {menuOpen ? (
        <div
          role='menu'
          aria-label='Switch network'
          className='window win98-start-menu absolute top-[calc(100%+4px)] left-0 z-50 p-[3px]'
        >
          <div className='window-body !m-1 flex flex-col gap-0.5'>
            {SWITCHABLE_CHAINS.map((c) => {
              const active = c.id === chainId;
              return (
                <button
                  key={c.id}
                  type='button'
                  role='menuitemradio'
                  aria-checked={active}
                  aria-label={`Switch to ${c.name}`}
                  disabled={isSwitching}
                  onClick={() => void handleSelect(c.id)}
                  className='win98-start-menu-item'
                >
                  <img
                    src={c.icon}
                    alt=''
                    width={20}
                    height={20}
                    className='size-5 shrink-0'
                  />
                  <span className='min-w-0 flex-1 truncate'>{c.name}</span>
                  <span
                    aria-hidden='true'
                    className='w-4 shrink-0 text-center font-bold'
                  >
                    {active ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
