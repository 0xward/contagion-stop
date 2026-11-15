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
 * Alamat di bawah ini adalah alamat deploy NYATA (lihat VERIFICATION.md —
 * terverifikasi on-chain via cast code + receipt). `LIVE` = true: owner,
 * paused(), balance, dan totalDeposited() dibaca live via wagmi dan tombol
 * aksi mengirim transaksi nyata. Data incident/timeline/history di dashboard
 * adalah SNAPSHOT TEREKAM dari run testnet #1–#3 (nilai ukur nyata, bukan
 * live-polling) — lihat `recorded-run-data.ts`. Angka pendanaan watcher di
 * seksi funding health adalah snapshot terekam 14 Nov 2026, kecuali saldo
 * watcher yang dibaca live.
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

/** Biaya satu loop penuh, terukur di public test instance (2 siklus,
 * 15 Nov 2026): siklus 1 = 0,1020317 lREACT, siklus 2 = 0,0838159 lREACT.
 * Dipakai di semua tempat yang menyebut biaya loop — satu angka, satu
 * sumber. */
export const LOOP_COST_LREACT = '~0.08–0.11 lREACT per loop (measured)' as const;

export const APP_NAME = 'ContagionStop';

/* ------------------------------------------------------------------ */
/* Public test deployment — siapa saja bisa trip/reopen (15 Nov 2026) */
/* PublicVault = SiblingVault + trip(bytes32) + reopen() permissionless */
/* (repo/src/PublicVault.sol). E2E 2 siklus penuh dari wallet          */
/* bukan-owner sudah lolos (loop penuh ~2 dtk); bukti lengkap di       */
/* ../public-deploy-log.md. Instance ditinggalkan AKTIF (paused false).*/
/* ------------------------------------------------------------------ */

export interface PublicContractEntry {
  role: string;
  chainId: number;
  chainName: string;
  address: Address;
}

/** Tiga public vault + public watcher (Sourcify exact_match keempatnya). */
export const PUBLIC_CONTRACTS: Record<'vaultU1' | 'vaultU2' | 'vaultB' | 'watcher', PublicContractEntry> = {
  vaultU1: {
    role: 'PublicVault U1 — Origin (Unichain Sepolia). trip() di sini memicu loop.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0x2bd64b3ee79eb1f38191e0b185786cb176d8696c'
  },
  vaultU2: {
    role: 'PublicVault U2 — Sibling (Unichain Sepolia). Paused via watcher callback.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0xf3475038bc53aa50408272F233F5dF73F6CF8F8c'
  },
  vaultB: {
    role: 'PublicVault B — Sibling (Base Sepolia). Paused via watcher callback.',
    chainId: 84532,
    chainName: 'Base Sepolia',
    address: '0x4b44497bAD6c270462D0529FCe4E41A7e092669b'
  },
  watcher: {
    role: 'Public ContagionWatcher — Lasna, watches for EmergencyPaused then fans out pause callbacks',
    chainId: 5318007,
    chainName: 'Lasna',
    address: '0x73f6e9989057f060801d1ab7d57f6047ff6c5557'
  }
};

/** Saldo watcher public saat instance diserahkan (15 Nov 2026, terukur):
 * 1,9141524 lREACT — sekitar 20 loop lagi pada ~0,09 lREACT/loop. Angka
 * ini adalah snapshot serah-terima; saldo live dibaca via wagmi. */
export const PUBLIC_WATCHER_BALANCE_AT_HANDOVER_LREACT = '1.9141524' as const;

/** Tx hash kunci E2E public instance (siklus 1, 15 Nov 2026) — tautan
 * verifikasi di Docs. */
export const PUBLIC_E2E_CYCLE_1 = {
  trip: '0x9cb807fa07c2e29acebc113852f0532bbce3dcf76d7180179d458dbe62827a02',
  react: '0x5fbbc913603634354b3ba40f10ac170f96b8cebef2fe01072dbc264816bdc7dc',
  callbackU2: '0x7acc95dbfeb696d8195e2878e8902b05be15cee53ff5524b8a265093ab1b13e3',
  callbackB: '0x7197499c90d1fdd47b07a5c04acef4bf2c1feb042017a2a0da908b88b4f2bdff',
  depositRevert: '0x78129ef96b1a9bb4de664ab81bfa25d14ef78acd8805f3c5ffa39ef0d3b3be0a',
  depositOk: '0x662377b0bcc1ed413cfc44051403eeca949675a14ad401d7548dd62fd1d8d7b9',
  tripCycle2: '0xb4f59a603a8032495c22646c518a8bdfc709e1124acd04bb40eb18a13418a541'
} as const;

/* ------------------------------------------------------------------ */
/* Vaults v2 — ERC-20 shares (15 Nov 2026).                           */
/* Deployed + Sourcify-verified exact_match (implementation + factory  */
/* on both chains); see ../v2-deploy-log.md and                       */
/* ../v2-erc20-deploy-log.md. The v2 watcher (Lasna) watches both    */
/* the v2 ETH vaults and the v2 USDC vaults. The USDC vaults are      */
/* UNFUNDED (totalAssets 0) — funding is a manual step, not done.     */
/* ------------------------------------------------------------------ */

export interface V2ContractEntry {
  role: string;
  chainId: number;
  chainName: string;
  address: Address;
}

/** Watcher v2 (Lasna) — one watcher for the whole v2 set. */
export const WATCHER_V2: V2ContractEntry = {
  role: 'ContagionWatcher v2 — Lasna, watches the v2 ETH vaults and the v2 USDC vaults',
  chainId: 5318007,
  chainName: 'Lasna',
  address: '0xF5ad04cBbA9458b634a4cfc8668FCC2A254C7D4B'
};

/** USDC token per vault chain (canonical USDC, 6 decimals). */
export const USDC_ADDRESSES: Record<number, Address> = {
  1301: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
};

/** v2 ETH vaults (ContagionVault, shares ERC-20, ETH-native). */
export const V2_ETH_VAULTS: Record<'unichain' | 'base', V2ContractEntry> = {
  unichain: {
    role: 'ContagionVault v2 — origin (Unichain Sepolia), ETH shares',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0xEe9a24C80460069877e9b9F28143ee4D138Cf5d8'
  },
  base: {
    role: 'ContagionVault v2 — sibling (Base Sepolia), ETH shares',
    chainId: 84532,
    chainName: 'Base Sepolia',
    address: '0xB86060EE2332BD6b3DC9310E88371AE8cA1382b0'
  }
};

/** v2 USDC vaults (ContagionVaultERC20, shares ERC-20, asset USDC). */
export const V2_USDC_VAULTS: Record<'unichain' | 'base', V2ContractEntry> = {
  unichain: {
    role: 'ContagionVaultERC20 — USDC vault (Unichain Sepolia), share CSUSDC',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0xb1404336db799285787bfb8a61f91e2d93e1bbdd'
  },
  base: {
    role: 'ContagionVaultERC20 — USDC vault (Base Sepolia), share CSUSDC',
    chainId: 84532,
    chainName: 'Base Sepolia',
    address: '0xd476AFBE349FB7b07110dda8E167095B2A3cee39'
  }
};

/** Factories + implementations v2, per chain. */
export const V2_FACTORIES: Record<'unichain' | 'base', {
  factoryEth: V2ContractEntry;
  factoryErc20: V2ContractEntry;
  implementationEth: V2ContractEntry;
  implementationErc20: V2ContractEntry;
}> = {
  unichain: {
    factoryEth: {
      role: 'VaultFactory — creates ContagionVault (ETH) clones',
      chainId: 1301,
      chainName: 'Unichain Sepolia',
      address: '0x8c48B129a6Fd000e43448830Df6834b0a5BAe7A3'
    },
    factoryErc20: {
      role: 'VaultFactoryERC20 — creates ContagionVaultERC20 (USDC) clones',
      chainId: 1301,
      chainName: 'Unichain Sepolia',
      address: '0xe7c4A7Cc927a2afd332B07A7f73A50EFd036F032'
    },
    implementationEth: {
      role: 'ContagionVault implementation (ETH)',
      chainId: 1301,
      chainName: 'Unichain Sepolia',
      address: '0xE732a6e1D7F70Dc9502f9e4eDEb026451d911661'
    },
    implementationErc20: {
      role: 'ContagionVaultERC20 implementation (USDC)',
      chainId: 1301,
      chainName: 'Unichain Sepolia',
      address: '0xb50ABF8959097f7c8Da476671e97f6F30d781daA'
    }
  },
  base: {
    factoryEth: {
      role: 'VaultFactory — creates ContagionVault (ETH) clones',
      chainId: 84532,
      chainName: 'Base Sepolia',
      address: '0xE7bd21cB41c0475650069A19b6207a48cAe0F9E6'
    },
    factoryErc20: {
      role: 'VaultFactoryERC20 — creates ContagionVaultERC20 (USDC) clones',
      chainId: 84532,
      chainName: 'Base Sepolia',
      address: '0xE16b002789590e1a8aFD3a4cE119d16b49ABDe77'
    },
    implementationEth: {
      role: 'ContagionVault implementation (ETH)',
      chainId: 84532,
      chainName: 'Base Sepolia',
      address: '0x8809f72C2ce8Af6081D6540Ea7f1C3269F155968'
    },
    implementationErc20: {
      role: 'ContagionVaultERC20 implementation (USDC)',
      chainId: 84532,
      chainName: 'Base Sepolia',
      address: '0xB394E38c8aeb4d8ea1244faE0c229e05089A7edD'
    }
  }
};

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
  border: '#5F5F5F',
  textPrimary: '#000000',
  textSecondary: '#404040',
  accent: '#000080',
  accentText: '#000080',
  success: '#008000',
  danger: '#C00000',
  warning: '#808000',
  info: '#000080'
} as const;
