import type { CSSProperties } from 'react';

export interface ChainHeaderStyle {
  /** Inline style for the vault card header: Win98/Win3.1 title-bar gradient + text color. */
  style: CSSProperties;
  /** True when the header uses dark text (Lasna gray) instead of white. */
  darkText: boolean;
}

/**
 * Win98/Win3.1 title-bar gradient per chain, for vault card headers.
 *
 * The gradient is always dark enough for its text color — contrast
 * dihitung (WCAG):
 * - Unichain pink: putih di #D10068 = 5.37:1, di #8F0050 = 9.20:1.
 *   Brand pink #FF007A (3.80:1) TIDAK dipakai sebagai stop gradien —
 *   terlalu terang untuk teks putih.
 * - Base biru: putih di #0052FF = 5.75:1, di #002FA8 = 10.65:1.
 * - Ethereum biru muda: putih di #4A5BD6 = 5.59:1, di #3342B8 = 8.04:1.
 *   Brand #627EEA (3.69:1) TIDAK dipakai sebagai stop gradien.
 * - Lasna ABU-ABU (keputusan pengguna 15 Nov 2026 — BUKAN biru Reactive
 *   #2756FC): teks HITAM tebal ala title bar Win98 yang tidak aktif.
 *   Hitam di #808080 = 5.32:1, di #C0C0C0 = 11.54:1.
 *
 * Tidak ada card Ethereum di situs saat ini (hanya Unichain/Base/Lasna)
 * — mapping Ethereum tetap ada supaya helper siap bila chain itu muncul.
 */
export function chainHeaderStyle(chainId: number): ChainHeaderStyle {
  switch (chainId) {
    case 1301: // Unichain Sepolia — pink
      return {
        style: {
          background: 'linear-gradient(90deg, #8f0050, #d10068)',
          color: '#ffffff'
        },
        darkText: false
      };
    case 84532: // Base Sepolia — biru
      return {
        style: {
          background: 'linear-gradient(90deg, #002fa8, #0052ff)',
          color: '#ffffff'
        },
        darkText: false
      };
    case 5318007: // Lasna — ABU-ABU (bukan biru Reactive)
      return {
        style: {
          background: 'linear-gradient(90deg, #808080, #c0c0c0)',
          color: '#000000'
        },
        darkText: true
      };
    case 1:
    case 11155111: // Ethereum — biru muda
      return {
        style: {
          background: 'linear-gradient(90deg, #3342b8, #4a5bd6)',
          color: '#ffffff'
        },
        darkText: false
      };
    default: // fallback: title bar Win98 klasik (navy)
      return {
        style: {
          background: 'linear-gradient(90deg, #000080, #1084d0)',
          color: '#ffffff'
        },
        darkText: false
      };
  }
}
