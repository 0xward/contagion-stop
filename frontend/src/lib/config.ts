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

/** Biaya loop per instance publik (terukur, 15 Nov 2026) — N3: satu
 * konstanta global salah kalibrasi untuk set 5-vault. v1: 3 vault,
 * ~0.08–0.11 (LOOP_COST_LREACT di atas). v2: 5 vault, loop terukur
 * 0.1056 / 0.1210 / 0.0794 (fan-out belum penuh di semua loop) —
 * pembagi konservatif 0.13. v3: 5 vault, loop E2E terukur 0.1514159 —
 * pembagi 0.15. Pembagi dipakai untuk hitung loops-left dari saldo
 * watcher; makin besar pembagi, makin sedikit loop yang ditampilkan. */
export const PUBLIC_V2_LOOP_COST_LREACT = '~0.13 lREACT per loop (measured, 5-vault set)' as const;
export const PUBLIC_V2_LOOP_COST_DIVISOR = 0.13;
export const PUBLIC_V3_LOOP_COST_LREACT = '~0.15 lREACT per loop (measured, 5-vault set)' as const;
export const PUBLIC_V3_LOOP_COST_DIVISOR = 0.15;

export const APP_NAME = 'ContagionStop';

/* ------------------------------------------------------------------ */
/* Public test deployment — siapa saja bisa trip/reopen (15 Nov 2026) */
/* PublicVault = SiblingVault + trip(bytes32) + reopen() permissionless */
/* (repo/src/PublicVault.sol). E2E 2 siklus penuh dari wallet          */
/* bukan-owner sudah lolos (loop penuh ~2 dtk); bukti lengkap di       */
/* ../public-deploy-log.md. Instance ditinggalkan AKTIF (paused false).*/
/* Gelombang 2 (15 Nov 2026): ketiga vault DIGANTI dengan vault baru  */
/* (kode F1+F4) dan didaftarkan ke watcher lama yang sama; vault lama  */
/* di-unregister. Riwayat RECORDED siklus 1 & 2 (vault lama) tetap    */
/* tampil di bawah — jangan hapus.                                     */
/* ------------------------------------------------------------------ */

export interface PublicContractEntry {
  role: string;
  chainId: number;
  chainName: string;
  address: Address;
}

/** Tiga public vault v1 BARU + public watcher lama (Sourcify exact_match keempatnya). */
export const PUBLIC_CONTRACTS: Record<'vaultU1' | 'vaultU2' | 'vaultB' | 'watcher', PublicContractEntry> = {
  vaultU1: {
    role: 'PublicVault U1 — Origin (Unichain Sepolia). trip() di sini memicu loop.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0xe427b13172dc65d9218c6067fc6fd89408b47a1a'
  },
  vaultU2: {
    role: 'PublicVault U2 — Sibling (Unichain Sepolia). Paused via watcher callback.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0xCa5F695215DFE4aB6b96d6FbEAfbC79d57d3DCEe'
  },
  vaultB: {
    role: 'PublicVault B — Sibling (Base Sepolia). Paused via watcher callback.',
    chainId: 84532,
    chainName: 'Base Sepolia',
    address: '0x589770D4F1785b0fD20fF0600727Fc4BC7781d52'
  },
  watcher: {
    role: 'Public ContagionWatcher — Lasna, watches for EmergencyPaused then fans out pause callbacks',
    chainId: 5318007,
    chainName: 'Lasna',
    address: '0x73f6e9989057f060801d1ab7d57f6047ff6c5557'
  }
};

/** Saldo watcher public lama saat serah-terima gelombang 2 (15 Nov 2026,
 * terukur): 2,6584943 lREACT — sekitar 29 loop lagi pada ~0,09 lREACT/loop.
 * Angka ini adalah snapshot serah-terima; saldo live dibaca via wagmi. */
export const PUBLIC_WATCHER_BALANCE_AT_HANDOVER_LREACT = '2.6584943' as const;

/* ------------------------------------------------------------------ */
/* Public test deployment v2 — shares (15 Nov 2026, gelombang 2).     */
/* PublicVaultV2 = ContagionVault + trip(bytes32) + reopen()           */
/* permissionless + cooldown trip 60 dtk (repo/src/PublicVaultV2.sol); */
/* PublicVaultERC20 = ContagionVaultERC20 + trip/reopen permissionless */
/* (repo/src/PublicVaultERC20.sol). Tiga vault ETH + dua vault USDC   */
/* (20 USDC tiap vault) di watcher publik BARU — ini produk v2 yang    */
/* sebenarnya: deposit/withdraw shares, bukan shell v1.               */
/*                                                                     */
/* ⚠️ TABRAKAN ALAMAT ANTAR-CHAIN: watcher publik baru di bawah ini    */
/* (Lasna 5318007) beralamat SAMA PERSIS dengan vault B publik LAMA    */
/* (Base Sepolia 84532) — 0x4b44497bAD6c270462D0529FCe4E41A7e092669b.     */
/* Keduanya punya code; tidak ada tabrakan karena alamat bersifat      */
/* per-chain. Di SEMUA tempat, alamat ini WAJIB tampil berpasangan     */
/* dengan chainId/nama chain — jangan pernah tampilkan tanpa chain.    */
/* ------------------------------------------------------------------ */

/** Lima vault v2 publik + watcher publik baru (Sourcify exact_match: impl + factory kedua chain + watcher). */
export const PUBLIC_V2_CONTRACTS: Record<
  'vaultUni0' | 'vaultUni1' | 'vaultBase0' | 'vaultUsdc' | 'vaultUsdcBase' | 'watcher',
  PublicContractEntry
> = {
  vaultUni0: {
    role: 'PublicVaultV2 Uni #0 — Origin (Unichain Sepolia). trip() di sini memicu loop; deposit() mints shares.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0x1f14825bBCC1727C134B7396BA77A2B4C37A6535'
  },
  vaultUni1: {
    role: 'PublicVaultV2 Uni #1 — Sibling (Unichain Sepolia). Paused via watcher callback.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0x6297D51f2D267aA636C3A0B2C842C118CDBC09be'
  },
  vaultBase0: {
    role: 'PublicVaultV2 Base #0 — Sibling (Base Sepolia). Paused via watcher callback.',
    chainId: 84532,
    chainName: 'Base Sepolia',
    address: '0x405aaB687EE6453161935cCe267d9F2D01eFa540'
  },
  vaultUsdc: {
    role: 'PublicVaultERC20 USDC — Sibling (Unichain Sepolia). deposit(amount, receiver) mints shares CSUSDC; trip() permissionless.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0xa363E9591CC85C4BDcc4F08c5e7711F5A792e043'
  },
  vaultUsdcBase: {
    role: 'PublicVaultERC20 USDC — Sibling (Base Sepolia). deposit(amount, receiver) mints shares CSUSDC; trip() permissionless.',
    chainId: 84532,
    chainName: 'Base Sepolia',
    address: '0x50aDA75e8dba905414d30dAFF46C2692db9fc05c'
  },
  watcher: {
    role: 'Public ContagionWatcher v2 — Lasna (5318007), watches the five v2 public vaults above',
    chainId: 5318007,
    chainName: 'Lasna',
    address: '0x4b44497bAD6c270462D0529FCe4E41A7e092669b'
  }
};

/** Saldo watcher publik baru saat serah-terima gelombang 2 (15 Nov 2026,
 * terukur, setelah E2E v2 + E2E USDC): 1,7701604 lREACT — sekitar 11–12
 * loop lagi (fan-out 5 vault; loop 4-vault terukur ~0,13 lREACT/loop).
 * Angka ini adalah snapshot serah-terima; saldo live dibaca via wagmi. */
export const PUBLIC_V2_WATCHER_BALANCE_AT_HANDOVER_LREACT = '1.7701604' as const;

/** Lima vault v3 publik + watcher publik v3 (15 Nov 2026, gelombang 3 —
 * audit pass 2 N1+N2; Sourcify exact_match: impl + factory kedua chain
 * + watcher). reopen() owner-only; watcher v3 membatasi incident BARU
 * maks 5 per jendela rolling 1 jam. Dana dimigrasi dari set v2
 * (sweepExcess + redeem), tanpa faucet. */
/* ⚠️ Alamat watcher v3 (Lasna 5318007) SAMA PERSIS dengan alamat factory
 * ETH v2 di Base Sepolia (84532): 0xE7bd21cB41c0475650069A19b6207a48cAe0F9E6.
 * Keduanya punya code; tidak ada tabrakan karena alamat bersifat
 * per-chain — selalu tampil berpasangan dengan chain. */
export const PUBLIC_V3_CONTRACTS: Record<
  'vaultUni0' | 'vaultUni1' | 'vaultBase0' | 'vaultUsdc' | 'vaultUsdcBase' | 'watcher',
  PublicContractEntry
> = {
  vaultUni0: {
    role: 'PublicVaultV3 Uni #0 — Origin (Unichain Sepolia). trip() di sini memicu loop; deposit() mints shares.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0x9561235B28aA8609648299928Ce162632851dbeC'
  },
  vaultUni1: {
    role: 'PublicVaultV3 Uni #1 — Sibling (Unichain Sepolia). Paused via watcher callback.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0x89b684B5cb0aCff7Ae33830c9b360ddCee3953E8'
  },
  vaultBase0: {
    role: 'PublicVaultV3 Base #0 — Sibling (Base Sepolia). Paused via watcher callback.',
    chainId: 84532,
    chainName: 'Base Sepolia',
    address: '0x0cf674eb58D3822075eE08A6De0568AF93Af450E'
  },
  vaultUsdc: {
    role: 'PublicVaultERC20V3 USDC — Sibling (Unichain Sepolia). deposit(amount, receiver) mints shares CSUSDC; trip() permissionless.',
    chainId: 1301,
    chainName: 'Unichain Sepolia',
    address: '0x4F10584326e9d96FBB3c65435667e9487C670d8b'
  },
  vaultUsdcBase: {
    role: 'PublicVaultERC20V3 USDC — Sibling (Base Sepolia). deposit(amount, receiver) mints shares CSUSDC; trip() permissionless.',
    chainId: 84532,
    chainName: 'Base Sepolia',
    address: '0xD536266c3595ba4dc9002771f44cDAe65776F9b3'
  },
  watcher: {
    role: 'Public ContagionWatcher v3 — Lasna (5318007), watches the five v3 public vaults above; cap 5 new incidents / rolling hour',
    chainId: 5318007,
    chainName: 'Lasna',
    address: '0xE7bd21cB41c0475650069A19b6207a48cAe0F9E6'
  }
};

/** Owner set v3 publik = deployer (satu-satunya yang bisa reopen). */
export const PUBLIC_V3_OWNER = '0x0FD65c51D9bD790Bf67FDA9BE45A7eB21ed3d99B' as const;

/** Saldo watcher v3 saat serah-terima gelombang 3 (15 Nov 2026, terukur,
 * setelah E2E v3): 0,8485841 lREACT — sekitar 5 loop lagi (loop 5-vault
 * terukur 0,1514159 lREACT/loop). Snapshot serah-terima; saldo live
 * dibaca via wagmi. */
export const PUBLIC_V3_WATCHER_BALANCE_AT_HANDOVER_LREACT = '0.8485841' as const;

/** Tx hash kunci E2E v3 publik (15 Nov 2026, gelombang 3) — tautan
 * verifikasi di Docs. Trip Uni #0 → kelima vault paused, CONTAINED,
 * loop 0,1514159 lREACT; reopen kelimanya oleh deployer. */
export const PUBLIC_V3_E2E = {
  trip: '0xac350def7550963a6992627a3ded74cf5d99f37f72ab9b5dd514d35df02d8a30',
  react: '0x82feb96d2ae197565ccafbf5beacd5da05e06f6473001259a7b44af4ebf021a8',
  reopenUni0: '0x426254bd1449f03f0fecde05bed701dac15fd77ac113da573ce4355162b05dc6',
  reopenUni1: '0x4aa271ebcd895e2c9e8f3bf8eaca0c1f6b83dbf7bac76dd582df7c8315adc12b',
  reopenBase0: '0xcd85f206b8ba17b952a8d41d460c12f4510870b95c278a4af2ee79a82772843b',
  reopenUsdc: '0x5d01058379a80f366b2660d2df8ad7210e13704cd985f577d5d974f4e2281890',
  reopenUsdcBase: '0x49e9a4b9301286bebcd4ac72757ccbc0864ce5677ec4f4462f02c5c3160ebc0b'
} as const;

/** Tx hash kunci E2E v2 publik (15 Nov 2026, gelombang 2) — tautan
 * verifikasi di Docs. Trip Uni #0 → ketiga vault ETH paused, CONTAINED. */
export const PUBLIC_V2_E2E = {
  trip: '0xd7c4c39d385b024bfc43dc6f6425a8e7dc358ea402876e84e668de396cc84a0a',
  reopenUni0: '0x85633025d68695b342f8418d6492d4d9ab48b0a63191d1cfb0fb6b5d7f434f39',
  reopenUni1: '0x2e6c001a4f9513b71dabf74194506deb885de0d858114d80ec894f2946ba1417',
  reopenBase0: '0xdf6e0819d2431ec1784e12503889cf21c1e4783ca92b08f85b88960451a8f327'
} as const;

/** Tx hash kunci E2E USDC publik (15 Nov 2026, gelombang 2) — trip vault
 * USDC → keempat vault watcher baru paused, CONTAINED. */
export const PUBLIC_USDC_E2E = {
  trip: '0xd4f340b468992f6651810de8c6882486c6bd64388d39a96a2e7d54f950389b49',
  deposit: '0x03bd7073489a4518ec634017a8178e85e2d2050400e8d1684135e119b5290e1a',
  reopenUsdc: '0x0899c7dca55f3ce43fd3b178feb6cc00e4485fde41df0f4c0302f612c6d79400'
} as const;

/** Uji live dua-trip (verifikasi F1, 15 Nov 2026, gelombang 2) — dua
 * origin trip berurutan sebelum containment pertama; kedua incident
 * CONTAINED dalam tx Lasna yang sama. Instance: set v1 baru, watcher lama. */
export const TWO_TRIP_F1 = {
  tripU1: '0x02ade27e58f9dedc445d15250dd5479a4e010b11f3c4a18035dc1673d3ef6648',
  tripU2: '0xb1c08933920b0f7d50f3ccfe203157b2aab2f89348cf635e0b7613959971b50d',
  containedBoth: '0xfe667e3e0d499f1bb0570149dd260a100e247274a13edb8c1a232a84802e4b74'
} as const;

/** Uji live coverDebt skenario utang (F8, 15 Nov 2026, gelombang 2) —
 * instance scratch (bukan main set, bukan publik): vault S tanpa dana
 * trip → utang 152.606.850.000 wei → callback terblokir → danai 0,001 ETH
 * → coverDebt → utang 0 → retry emergencyPause → callback jalan lagi,
 * CONTAINED. */
export const F8_COVER_DEBT = {
  tripT: '0x1ae52ec08f4b515734d32e085e6c650df432ffd96fff19f3527a420f474e23a7',
  coverDebt: '0xc559af0511cf8c25778a7d057d61fbb8398cf3402debd424086966dc35cfde10',
  retryPause: '0x835f7c1fcb67e7f4ee13eb54e89096fde91501560733f8e5608b4bdadb083127'
} as const;

/** E2E fresh-wallet untuk /dashboard/deploy (15 Nov 2026, gelombang 3) —
 * wallet segar (bukan deployer) createVault via factory ETH utama →
 * alamat hasil SAMA dengan prediksi deploy page → registerSibling →
 * deposit 0,001 ETH → trip → CONTAINED (5 vault) → semua di-unpause. */
export const FRESH_WALLET_E2E = {
  freshWallet: '0x4c97434A42a74a42b9A3EFfa38247B0B7F124A17',
  vault: '0xe0e566c8AAE37ab7fc33743DE46EC8ace721D5a4',
  fundEth: '0x6f31dedb7cccc47dbd13e758c751a5d4eaf3fb0286fbc7075fd08e04a6c2be32',
  fundUsdc: '0xd154f1d8196e786e43c705003970477644ec42546a4d56b82584a9b974c3144c',
  createVault: '0x00302761c519f27d8b233fde12ba388705110d7c0212b2eede2646a5edd1e7a2',
  registerSibling: '0xb65f38260744eea454152b87326a0300541224a9c6edd656bfb1493acc064963',
  depositEth: '0xe61917e638aa8ba33bd1c57e76c32466a92ecc52bfea60beb570bb5635fd8af0',
  trip: '0xa18fd7e5076eba17a28d10b2647a43b3dd48afed7040a5107871a34bf17dcfac',
  react: '0xac633113b81cca48c17e9738b8991fa00cba707df82feb51e41cbfc36da74dcc',
  contained: '0x1ec9243d0dc00a16822d1adba4dd62e94ccddd869e3a332bf7bc482d9ecda7af',
  approveUsdc: '0xc515ccc1d3539e8a625cd3c5a7eec1a9d19f97746e4821ca44c83d0866782a81',
  depositUsdc: '0x3c38e78c26327990451b1545e1b370a4c4bd56f1755ece9a921e21153b3c3cda'
} as const;

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
/* FUNDED — 20 USDC each (15 Nov 2026); funding was a manual step.    */
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

/** Factories + implementations v2, per chain. Gelombang 3 (15 Nov 2026,
 * audit pass 2 N4): factory + impl BARU dari source repo saat ini
 * (mengandung fix F1 — pause() meng-emit ulang Paused saat sudah paused).
 * Factory lama (impl pra-fix F1) — Uni ETH 0x8c48B129a6Fd000e43448830Df6834b0a5BAe7A3,
 * Base ETH 0xE7bd21cB41c0475650069A19b6207a48cAe0F9E6, Uni ERC20
 * 0xe7c4A7Cc927a2afd332B07A7f73A50EFd036F032, Base ERC20
 * 0xE16b002789590e1a8aFD3a4cE119d16b49ABDe77 — tetap ada on-chain, tapi
 * Deploy page tidak lagi memakainya. */
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
      address: '0xB13bd9d4649d947d599d5c8250eFe1CF67FaA6da'
    },
    factoryErc20: {
      role: 'VaultFactoryERC20 — creates ContagionVaultERC20 (USDC) clones',
      chainId: 1301,
      chainName: 'Unichain Sepolia',
      address: '0xD633d0da6D4c91637d0F3Ff9AD4D0F6378acEA70'
    },
    implementationEth: {
      role: 'ContagionVault implementation (ETH)',
      chainId: 1301,
      chainName: 'Unichain Sepolia',
      address: '0x784Cf3AB7407B221c9387c5FEceD2EaD3Ab14905'
    },
    implementationErc20: {
      role: 'ContagionVaultERC20 implementation (USDC)',
      chainId: 1301,
      chainName: 'Unichain Sepolia',
      address: '0xb6cE574a3D471376FB449017767E736B7A9f2329'
    }
  },
  base: {
    factoryEth: {
      role: 'VaultFactory — creates ContagionVault (ETH) clones',
      chainId: 84532,
      chainName: 'Base Sepolia',
      address: '0x9D9C5f379BC9E35593C49b2949db4dD2f83dC8fb'
    },
    factoryErc20: {
      role: 'VaultFactoryERC20 — creates ContagionVaultERC20 (USDC) clones',
      chainId: 84532,
      chainName: 'Base Sepolia',
      address: '0x1Aa24e0F8d970C6c7b308724617E29b25FBB2Ac2'
    },
    implementationEth: {
      role: 'ContagionVault implementation (ETH)',
      chainId: 84532,
      chainName: 'Base Sepolia',
      address: '0xB4Cd8EBf93aeAE8010c75512BA93Bf5533656725'
    },
    implementationErc20: {
      role: 'ContagionVaultERC20 implementation (USDC)',
      chainId: 84532,
      chainName: 'Base Sepolia',
      address: '0xD6f947E4B7Fc9EC5eD0C2078d982eFedBd5A5652'
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
