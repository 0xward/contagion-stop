import { type Address } from 'viem';
import {
  BASE_SEPOLIA_CHAIN_ID,
  CALLBACK_PROXIES,
  LASNA_CHAIN_ID,
  UNICHAIN_SEPOLIA_CHAIN_ID
} from './contracts';

/**
 * Alamat kontrak ContagionStop — LIVE (testnet, ter-deploy 14 Nov 2026).
 *
 * Alamat di bawah ini adalah alamat deploy NYATA (lihat DEPLOY-PLAN.md /
 * VERIFICATION.md — terverifikasi on-chain via cast code + receipt).
 * `LIVE` = true: owner/balance dibaca live via wagmi dan tombol aksi
 * mengirim transaksi nyata. Data incident/timeline/history di dashboard
 * adalah SNAPSHOT TEREKAM dari run testnet #1–#3 (nilai ukur nyata, bukan
 * live-polling) — lihat `mock-data.ts`.
 */
export const LIVE = true;

export interface ContractEntry {
  /** Peran kontrak di dalam loop ContagionStop. */
  role: string;
  /** Chain tempat kontrak di-deploy. */
  chainId: number;
  chainName: string;
  /** Alamat kontrak — alamat deploy nyata (testnet, 14 Nov 2026). */
  address: Address;
}

export const CONTRACTS: Record<'watcher' | 'vaultA' | 'vaultB' | 'vaultC', ContractEntry> = {
  watcher: {
    role: 'ContagionWatcher — origin Lasna, memantau EmergencyPaused lalu fan-out callback pause',
    chainId: 5318007,
    chainName: 'Lasna',
    address: '0xb18a213bfa8c1888af39af100d7dd54aa376f7b5'
  },
  vaultA: {
    role: 'Vault A — Origin (Unichain Sepolia). emergencyPause di sini memicu loop.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5'
  },
  vaultB: {
    role: 'Vault B — Sibling (Base Sepolia). Di-pause lewat callback watcher.',
    chainId: 84532,
    chainName: 'Base Sepolia',
    address: '0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a'
  },
  vaultC: {
    role: 'Vault C — Sibling (Unichain Sepolia). Di-pause lewat callback watcher.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0xb07a380104ac093485566cfc964540b04518b354'
  }
};

/** Explorer per chain (dipakai untuk link alamat / tx hash). */
export const EXPLORERS: Record<number, { name: string; url: string }> = {
  1301: { name: 'Uniscan', url: 'https://sepolia.uniscan.xyz' },
  84532: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  5318007: { name: 'Reactscan', url: 'https://lasna.reactscan.net' }
};

/** Batas gas callback pause() per tujuan (ux-ui-notes §4c). */
export const CALLBACK_GAS_LIMIT = 200_000;

/** Batas gas react() watcher (ux-ui-notes §4c). */
export const REACT_GAS_LIMIT = 900_000;

/**
 * Patokan latensi pesaing track Every Second Counts (ux-ui-notes §4c).
 * Data STATIS berlabel — angka ini BUKAN hasil ukur ContagionStop.
 * Konteks wajib: ketiganya loop 1 chain (stop-loss), sementara loop
 * ContagionStop fan-out ke 2 chain — bandingkan per tujuan, bukan headline.
 */
export const LATENCY_BENCHMARKS = [
  {
    name: 'Tripwire',
    valueMs: 1400,
    label: 'Median 1,4 dtk',
    context: 'Loop 1 chain (stop-loss)'
  },
  {
    name: 'SnapGuard',
    valueMs: 2000,
    label: '~2 dtk',
    context: 'Loop 1 chain (stop-loss)'
  },
  {
    name: 'OmniStop',
    valueMs: 2000,
    label: '2.000 ms',
    context: 'Loop 1 chain (sinyal stop-loss)'
  }
] as const;

export const APP_NAME = 'ContagionStop';

/* ------------------------------------------------------------------ */
/* Merged from staging config (2026-11-14) — new exports only.        */
/* Existing exports above (CONTRACTS, LIVE, EXPLORERS,                 */
/* CALLBACK_GAS_LIMIT, REACT_GAS_LIMIT, LATENCY_BENCHMARKS, APP_NAME)  */
/* are untouched.                                                      */
/* ------------------------------------------------------------------ */

/** Chain metadata per destination (explorer URL from EXPLORERS above). */
export const CHAINS = {
  unichainSepolia: {
    id: UNICHAIN_SEPOLIA_CHAIN_ID,
    name: 'Unichain Sepolia',
    rpcUrl: 'https://sepolia.unichain.org',
    explorerUrl: EXPLORERS[UNICHAIN_SEPOLIA_CHAIN_ID].url,
    callbackProxy: CALLBACK_PROXIES[UNICHAIN_SEPOLIA_CHAIN_ID]
  },
  baseSepolia: {
    id: BASE_SEPOLIA_CHAIN_ID,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: EXPLORERS[BASE_SEPOLIA_CHAIN_ID].url,
    callbackProxy: CALLBACK_PROXIES[BASE_SEPOLIA_CHAIN_ID]
  },
  lasna: {
    id: LASNA_CHAIN_ID,
    name: 'Lasna',
    rpcUrl: 'https://lasna-rpc.rnk.dev/',
    explorerUrl: EXPLORERS[LASNA_CHAIN_ID].url,
    /** The watcher lives on Lasna; there is no callback proxy here. */
    callbackProxy: null
  }
} as const;

/** Wagmi chain config uses these three chains (Base Sepolia + Unichain Sepolia + Lasna). */
export const SUPPORTED_CHAIN_IDS = [
  UNICHAIN_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
  LASNA_CHAIN_ID
] as const;

/** Network gas limits (design.md §3.5/§7e) — shown next to gas numbers. */
export const GAS_LIMITS = {
  react: 900000,
  callback: 200000
} as const;

/** Palette "ContagionStop Light — Nous Mono" (restyle 14 Nov 2026). Monokrom
 * terang: near-black di atas near-white; status dibedakan teks + border,
 * bukan warna. */
export const PALETTE = {
  background: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F5F4',
  border: '#E5E5E5',
  textPrimary: '#0A0A0A',
  textSecondary: '#525252',
  accent: '#0A0A0A',
  accentText: '#0A0A0A',
  success: '#0A0A0A',
  danger: '#0A0A0A',
  warning: '#525252',
  info: '#737373'
} as const;
