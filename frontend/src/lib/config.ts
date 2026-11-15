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
    role: 'ContagionWatcher — Lasna origin, watches for EmergencyPaused then fans out pause callbacks',
    chainId: 5318007,
    chainName: 'Lasna',
    address: '0xb18a213bfa8c1888af39af100d7dd54aa376f7b5'
  },
  vaultA: {
    role: 'Vault A — Origin (Unichain Sepolia). emergencyPause here triggers the loop.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5'
  },
  vaultB: {
    role: 'Vault B — Sibling (Base Sepolia). Paused via watcher callback.',
    chainId: 84532,
    chainName: 'Base Sepolia',
    address: '0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a'
  },
  vaultC: {
    role: 'Vault C — Sibling (Unichain Sepolia). Paused via watcher callback.',
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

export const APP_NAME = 'ContagionStop';

/* ------------------------------------------------------------------ */
/* Merged from staging config (2026-11-14) — new exports only.        */
/* Existing exports above (CONTRACTS, LIVE, EXPLORERS,                 */
/* CALLBACK_GAS_LIMIT, REACT_GAS_LIMIT, APP_NAME) are untouched.       */
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

/** Palette "ContagionStop Windows 98" (restyle 15 Nov 2026, round 2).
 * Silver windows #c0c0c0 on a teal #008080 desktop, navy #000080
 * accent, green #008000 success, red #c00000 danger, olive #808000
 * warning; status is told apart by text + border as well as color.
 * (Unused by components today — the shadcn tokens in
 * styles/themes/contagionstop-win98.css are the source of truth —
 * but kept in sync so no stale Terminal palette lingers anywhere.) */
export const PALETTE = {
  background: '#008080',
  surface: '#C0C0C0',
  surfaceElevated: '#DFDFDF',
  border: '#808080',
  textPrimary: '#000000',
  textSecondary: '#404040',
  accent: '#000080',
  accentText: '#000080',
  success: '#008000',
  danger: '#C00000',
  warning: '#808000',
  info: '#000080'
} as const;
