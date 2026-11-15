import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { JudgeQuickstart } from '@/components/contagion/judge-quickstart';

/**
 * Documentation page — product documentation for ContagionStop.
 * Everything on this page is verifiable on-chain: contract addresses,
 * transaction hashes, and latency numbers are measured on testnet
 * (14 Nov 2026) and link out to the public explorers.
 */

const CONTRACTS = [
  {
    name: 'SiblingVault A (origin)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5',
    explorer: 'https://sepolia.uniscan.xyz/address/0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5'
  },
  {
    name: 'SiblingVault B',
    chain: 'Base Sepolia (84532)',
    address: '0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a',
    explorer: 'https://sepolia.basescan.org/address/0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a'
  },
  {
    name: 'SiblingVault C',
    chain: 'Unichain Sepolia (1301)',
    address: '0xb07a380104ac093485566cfc964540b04518b354',
    explorer: 'https://sepolia.uniscan.xyz/address/0xb07a380104ac093485566cfc964540b04518b354'
  },
  {
    name: 'ContagionWatcher',
    chain: 'Lasna (5318007)',
    address: '0xb18a213bfa8c1888af39af100d7dd54aa376f7b5',
    explorer: 'https://lasna.reactscan.net/address/0xb18a213bfa8c1888af39af100d7dd54aa376f7b5'
  },
  {
    name: 'SiblingVault D (test-only, unregistered)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x8fB4aae500D914a1876f06FfA7f74fE9A88cEf7a',
    explorer: 'https://sepolia.uniscan.xyz/address/0x8fB4aae500D914a1876f06FfA7f74fE9A88cEf7a'
  },
  {
    name: 'Callback proxy',
    chain: 'Base Sepolia (84532)',
    address: '0x476F44b11F5C942c58f4c8E3d0300E5710743585',
    explorer: 'https://sepolia.basescan.org/address/0x476F44b11F5C942c58f4c8E3d0300E5710743585'
  },
  {
    name: 'Callback proxy',
    chain: 'Unichain Sepolia (1301)',
    address: '0x775c9B990ADe401060B78D0e98684eEf8d2466C1',
    explorer: 'https://sepolia.uniscan.xyz/address/0x775c9B990ADe401060B78D0e98684eEf8d2466C1'
  }
] as const;

const V2_CONTRACTS = [
  {
    name: 'ContagionWatcher v2',
    chain: 'Lasna (5318007)',
    address: '0xF5ad04cBbA9458b634a4cfc8668FCC2A254C7D4B',
    explorer: 'https://lasna.reactscan.net/address/0xF5ad04cBbA9458b634a4cfc8668FCC2A254C7D4B'
  },
  {
    name: 'ContagionVault v2 — origin (ETH)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xEe9a24C80460069877e9b9F28143ee4D138Cf5d8',
    explorer: 'https://sepolia.uniscan.xyz/address/0xEe9a24C80460069877e9b9F28143ee4D138Cf5d8'
  },
  {
    name: 'ContagionVault v2 — sibling (ETH)',
    chain: 'Base Sepolia (84532)',
    address: '0xB86060EE2332BD6b3DC9310E88371AE8cA1382b0',
    explorer: 'https://sepolia.basescan.org/address/0xB86060EE2332BD6b3DC9310E88371AE8cA1382b0'
  },
  {
    name: 'ContagionVaultERC20 — USDC vault (FUNDED — 20 USDC)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xb1404336db799285787bfb8a61f91e2d93e1bbdd',
    explorer: 'https://sepolia.uniscan.xyz/address/0xb1404336db799285787bfb8a61f91e2d93e1bbdd'
  },
  {
    name: 'ContagionVaultERC20 — USDC vault (FUNDED — 20 USDC)',
    chain: 'Base Sepolia (84532)',
    address: '0xd476AFBE349FB7b07110dda8E167095B2A3cee39',
    explorer: 'https://sepolia.basescan.org/address/0xd476AFBE349FB7b07110dda8E167095B2A3cee39'
  },
  {
    name: 'VaultFactory (ETH)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xB13bd9d4649d947d599d5c8250eFe1CF67FaA6da',
    explorer: 'https://sepolia.uniscan.xyz/address/0xB13bd9d4649d947d599d5c8250eFe1CF67FaA6da'
  },
  {
    name: 'VaultFactory (ETH)',
    chain: 'Base Sepolia (84532)',
    address: '0x9D9C5f379BC9E35593C49b2949db4dD2f83dC8fb',
    explorer: 'https://sepolia.basescan.org/address/0x9D9C5f379BC9E35593C49b2949db4dD2f83dC8fb'
  },
  {
    name: 'VaultFactoryERC20 (USDC)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xD633d0da6D4c91637d0F3Ff9AD4D0F6378acEA70',
    explorer: 'https://sepolia.uniscan.xyz/address/0xD633d0da6D4c91637d0F3Ff9AD4D0F6378acEA70'
  },
  {
    name: 'VaultFactoryERC20 (USDC)',
    chain: 'Base Sepolia (84532)',
    address: '0x1Aa24e0F8d970C6c7b308724617E29b25FBB2Ac2',
    explorer: 'https://sepolia.basescan.org/address/0x1Aa24e0F8d970C6c7b308724617E29b25FBB2Ac2'
  },
  {
    name: 'USDC (asset)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    explorer: 'https://sepolia.uniscan.xyz/address/0x31d0220469e10c4E71834a79b1f276d740d3768F'
  },
  {
    name: 'USDC (asset)',
    chain: 'Base Sepolia (84532)',
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    explorer: 'https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  }
] as const;

const PUBLIC_CONTRACTS = [
  {
    name: 'PublicVault U1 (origin) — v1 baru, 15 Nov 2026',
    chain: 'Unichain Sepolia (1301)',
    address: '0xe427b13172dc65d9218c6067fc6fd89408b47a1a',
    explorer: 'https://sepolia.uniscan.xyz/address/0xe427b13172dc65d9218c6067fc6fd89408b47a1a'
  },
  {
    name: 'PublicVault U2 — v1 baru, 15 Nov 2026',
    chain: 'Unichain Sepolia (1301)',
    address: '0xCa5F695215DFE4aB6b96d6FbEAfbC79d57d3DCEe',
    explorer: 'https://sepolia.uniscan.xyz/address/0xCa5F695215DFE4aB6b96d6FbEAfbC79d57d3DCEe'
  },
  {
    name: 'PublicVault B — v1 baru, 15 Nov 2026',
    chain: 'Base Sepolia (84532)',
    address: '0x589770D4F1785b0fD20fF0600727Fc4BC7781d52',
    explorer: 'https://sepolia.basescan.org/address/0x589770D4F1785b0fD20fF0600727Fc4BC7781d52'
  },
  {
    name: 'Public ContagionWatcher',
    chain: 'Lasna (5318007)',
    address: '0x73f6e9989057f060801d1ab7d57f6047ff6c5557',
    explorer: 'https://lasna.reactscan.net/address/0x73f6e9989057f060801d1ab7d57f6047ff6c5557'
  }
] as const;

/** Set v2 publik (15 Nov 2026, gelombang 2) — produk v2 yang sebenarnya.
 * ⚠️ Alamat watcher v2 di bawah ini (Lasna 5318007) SAMA PERSIS dengan
 * alamat vault B publik LAMA (Base Sepolia 84532):
 * 0x4b44497bAD6c270462D0529FCe4E41A7e092669b. Keduanya punya code; tidak
 * ada tabrakan karena alamat bersifat per-chain — selalu baca alamat ini
 * berpasangan dengan chain-nya. */
const PUBLIC_V2_CONTRACTS = [
  {
    name: 'PublicVaultV2 Uni #0 (origin, ETH shares)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x1f14825bBCC1727C134B7396BA77A2B4C37A6535',
    explorer: 'https://sepolia.uniscan.xyz/address/0x1f14825bBCC1727C134B7396BA77A2B4C37A6535'
  },
  {
    name: 'PublicVaultV2 Uni #1 (ETH shares)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x6297D51f2D267aA636C3A0B2C842C118CDBC09be',
    explorer: 'https://sepolia.uniscan.xyz/address/0x6297D51f2D267aA636C3A0B2C842C118CDBC09be'
  },
  {
    name: 'PublicVaultV2 Base #0 (ETH shares)',
    chain: 'Base Sepolia (84532)',
    address: '0x405aaB687EE6453161935cCe267d9F2D01eFa540',
    explorer: 'https://sepolia.basescan.org/address/0x405aaB687EE6453161935cCe267d9F2D01eFa540'
  },
  {
    name: 'PublicVaultERC20 USDC (FUNDED — 20 USDC + 1 USDC fresh-wallet E2E = 21 USDC)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xa363E9591CC85C4BDcc4F08c5e7711F5A792e043',
    explorer: 'https://sepolia.uniscan.xyz/address/0xa363E9591CC85C4BDcc4F08c5e7711F5A792e043'
  },
  {
    name: 'PublicVaultERC20 USDC (FUNDED — 20 USDC)',
    chain: 'Base Sepolia (84532)',
    address: '0x50aDA75e8dba905414d30dAFF46C2692db9fc05c',
    explorer: 'https://sepolia.basescan.org/address/0x50aDA75e8dba905414d30dAFF46C2692db9fc05c'
  },
  {
    name: 'Public ContagionWatcher v2 — Lasna (5318007)',
    chain: 'Lasna (5318007)',
    address: '0x4b44497bAD6c270462D0529FCe4E41A7e092669b',
    explorer: 'https://lasna.reactscan.net/address/0x4b44497bAD6c270462D0529FCe4E41A7e092669b'
  },
  {
    name: 'PublicVaultV2 implementation (ETH)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xD6f947E4B7Fc9EC5eD0C2078d982eFedBd5A5652',
    explorer: 'https://sepolia.uniscan.xyz/address/0xD6f947E4B7Fc9EC5eD0C2078d982eFedBd5A5652'
  },
  {
    name: 'VaultFactory (public v2, ETH)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x1Aa24e0F8d970C6c7b308724617E29b25FBB2Ac2',
    explorer: 'https://sepolia.uniscan.xyz/address/0x1Aa24e0F8d970C6c7b308724617E29b25FBB2Ac2'
  },
  {
    name: 'PublicVaultV2 implementation (ETH)',
    chain: 'Base Sepolia (84532)',
    address: '0x100efb80D0067F2753C09855ac062A849c29439e',
    explorer: 'https://sepolia.basescan.org/address/0x100efb80D0067F2753C09855ac062A849c29439e'
  },
  {
    name: 'VaultFactory (public v2, ETH)',
    chain: 'Base Sepolia (84532)',
    address: '0xb50ABF8959097f7c8Da476671e97f6F30d781daA',
    explorer: 'https://sepolia.basescan.org/address/0xb50ABF8959097f7c8Da476671e97f6F30d781daA'
  },
  {
    name: 'PublicVaultERC20 implementation (USDC)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xf51Ac3C1b74407E58c5F9f4e91D2cEcC25FFbc08',
    explorer: 'https://sepolia.uniscan.xyz/address/0xf51Ac3C1b74407E58c5F9f4e91D2cEcC25FFbc08'
  },
  {
    name: 'VaultFactoryERC20 (public v2, USDC)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xA22A250522C1CbD76F79AfE5a864bb238Cf05424',
    explorer: 'https://sepolia.uniscan.xyz/address/0xA22A250522C1CbD76F79AfE5a864bb238Cf05424'
  },
  {
    name: 'PublicVaultERC20 implementation (USDC)',
    chain: 'Base Sepolia (84532)',
    address: '0x746eaa86565b13df9ef66a74ad8bb5e6e8ca6dfa',
    explorer: 'https://sepolia.basescan.org/address/0x746eaa86565b13df9ef66a74ad8bb5e6e8ca6dfa'
  },
  {
    name: 'VaultFactoryERC20 (public v2, USDC)',
    chain: 'Base Sepolia (84532)',
    address: '0x9b9eeee0a375a9391fc25c3fcadabe712d3acc2f',
    explorer: 'https://sepolia.basescan.org/address/0x9b9eeee0a375a9391fc25c3fcadabe712d3acc2f'
  }
] as const;

/** Set v3 publik (15 Nov 2026, gelombang 3) — set publik saat ini.
 * reopen() owner-only (N2); watcher v3 membatasi incident BARU maks 5
 * per jendela rolling 1 jam (N1). ⚠️ Alamat watcher v3 (Lasna 5318007)
 * SAMA PERSIS dengan alamat factory ETH v2 di Base Sepolia (84532):
 * 0xE7bd21cB41c0475650069A19b6207a48cAe0F9E6. Keduanya punya code; tidak
 * ada tabrakan karena alamat bersifat per-chain — selalu baca alamat ini
 * berpasangan dengan chain-nya. */
const PUBLIC_V3_CONTRACTS = [
  {
    name: 'PublicVaultV3 Uni #0 (origin, ETH shares)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x9561235B28aA8609648299928Ce162632851dbeC',
    explorer: 'https://sepolia.uniscan.xyz/address/0x9561235B28aA8609648299928Ce162632851dbeC'
  },
  {
    name: 'PublicVaultV3 Uni #1 (ETH shares)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x89b684B5cb0aCff7Ae33830c9b360ddCee3953E8',
    explorer: 'https://sepolia.uniscan.xyz/address/0x89b684B5cb0aCff7Ae33830c9b360ddCee3953E8'
  },
  {
    name: 'PublicVaultV3 Base #0 (ETH shares)',
    chain: 'Base Sepolia (84532)',
    address: '0x0cf674eb58D3822075eE08A6De0568AF93Af450E',
    explorer: 'https://sepolia.basescan.org/address/0x0cf674eb58D3822075eE08A6De0568AF93Af450E'
  },
  {
    name: 'PublicVaultERC20V3 USDC (FUNDED — 20 USDC)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x4F10584326e9d96FBB3c65435667e9487C670d8b',
    explorer: 'https://sepolia.uniscan.xyz/address/0x4F10584326e9d96FBB3c65435667e9487C670d8b'
  },
  {
    name: 'PublicVaultERC20V3 USDC (FUNDED — 20 USDC)',
    chain: 'Base Sepolia (84532)',
    address: '0xD536266c3595ba4dc9002771f44cDAe65776F9b3',
    explorer: 'https://sepolia.basescan.org/address/0xD536266c3595ba4dc9002771f44cDAe65776F9b3'
  },
  {
    name: 'Public ContagionWatcher v3 — Lasna (5318007)',
    chain: 'Lasna (5318007)',
    address: '0xE7bd21cB41c0475650069A19b6207a48cAe0F9E6',
    explorer: 'https://lasna.reactscan.net/address/0xE7bd21cB41c0475650069A19b6207a48cAe0F9E6'
  },
  {
    name: 'PublicVaultV3 implementation (ETH)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xEe319AC96FAb0445ca48D1daa6af4FC312FD21Db',
    explorer: 'https://sepolia.uniscan.xyz/address/0xEe319AC96FAb0445ca48D1daa6af4FC312FD21Db'
  },
  {
    name: 'VaultFactory (public v3, ETH)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xD18B286C73285aef378B054D355dE43f63809111',
    explorer: 'https://sepolia.uniscan.xyz/address/0xD18B286C73285aef378B054D355dE43f63809111'
  },
  {
    name: 'PublicVaultV3 implementation (ETH)',
    chain: 'Base Sepolia (84532)',
    address: '0xE427B13172Dc65D9218C6067fC6fD89408B47A1a',
    explorer: 'https://sepolia.basescan.org/address/0xE427B13172Dc65D9218C6067fC6fD89408B47A1a'
  },
  {
    name: 'VaultFactory (public v3, ETH)',
    chain: 'Base Sepolia (84532)',
    address: '0xCa5F695215DFE4aB6b96d6FbEAfbC79d57d3DCEe',
    explorer: 'https://sepolia.basescan.org/address/0xCa5F695215DFE4aB6b96d6FbEAfbC79d57d3DCEe'
  },
  {
    name: 'PublicVaultERC20V3 implementation (USDC)',
    chain: 'Unichain Sepolia (1301)',
    address: '0x366a79C1E37958F7239d57310dF2c5F94A113bb6',
    explorer: 'https://sepolia.uniscan.xyz/address/0x366a79C1E37958F7239d57310dF2c5F94A113bb6'
  },
  {
    name: 'VaultFactoryERC20 (public v3, USDC)',
    chain: 'Unichain Sepolia (1301)',
    address: '0xEcaF1E5Bbe943D0a5b58D9933ace161C5D2C3e09',
    explorer: 'https://sepolia.uniscan.xyz/address/0xEcaF1E5Bbe943D0a5b58D9933ace161C5D2C3e09'
  },
  {
    name: 'PublicVaultERC20V3 implementation (USDC)',
    chain: 'Base Sepolia (84532)',
    address: '0xb2119fB0A06c8F032Afb1B71C8d270234b9b05B1',
    explorer: 'https://sepolia.basescan.org/address/0xb2119fB0A06c8F032Afb1B71C8d270234b9b05B1'
  },
  {
    name: 'VaultFactoryERC20 (public v3, USDC)',
    chain: 'Base Sepolia (84532)',
    address: '0xC083d0CafbC93aE662BBe0Ac3442Ba61155d21B0',
    explorer: 'https://sepolia.basescan.org/address/0xC083d0CafbC93aE662BBe0Ac3442Ba61155d21B0'
  }
] as const;

const PUBLIC_E2E_TXS = [
  {
    step: 'Cycle 1 — trip U1 (TEST-001)',
    chain: 'Unichain Sepolia',
    hash: '0x9cb807fa07c2e29acebc113852f0532bbce3dcf76d7180179d458dbe62827a02',
    shortHash: '0x9cb807fa…7a02',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x9cb807fa07c2e29acebc113852f0532bbce3dcf76d7180179d458dbe62827a02',
    detail: 'Block 67866420 · from a wallet that is not the owner'
  },
  {
    step: 'Cycle 1 — react()',
    chain: 'Lasna',
    hash: '0x5fbbc913603634354b3ba40f10ac170f96b8cebef2fe01072dbc264816bdc7dc',
    shortHash: '0x5fbbc913…7dc',
    explorer: 'https://lasna.reactscan.net/tx/0x5fbbc913603634354b3ba40f10ac170f96b8cebef2fe01072dbc264816bdc7dc',
    detail: 'Block 8382934 · IncidentTripped + 2× PauseRequested'
  },
  {
    step: 'Cycle 1 — callback pause() U2',
    chain: 'Unichain Sepolia',
    hash: '0x7acc95dbfeb696d8195e2878e8902b05be15cee53ff5524b8a265093ab1b13e3',
    shortHash: '0x7acc95db…b13e3',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x7acc95dbfeb696d8195e2878e8902b05be15cee53ff5524b8a265093ab1b13e3',
    detail: 'Block 67866422 · ~2 s after the trip'
  },
  {
    step: 'Cycle 1 — callback pause() B',
    chain: 'Base Sepolia',
    hash: '0x7197499c90d1fdd47b07a5c04acef4bf2c1feb042017a2a0da908b88b4f2bdff',
    shortHash: '0x7197499c…2bdff',
    explorer: 'https://sepolia.basescan.org/tx/0x7197499c90d1fdd47b07a5c04acef4bf2c1feb042017a2a0da908b88b4f2bdff',
    detail: 'Block 58984906 · ~2 s after the trip'
  },
  {
    step: 'Cycle 1 — deposit() to paused U1, reverted',
    chain: 'Unichain Sepolia',
    hash: '0x78129ef96b1a9bb4de664ab81bfa25d14ef78acd8805f3c5ffa39ef0d3b3be0a',
    shortHash: '0x78129ef9…3be0a',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x78129ef96b1a9bb4de664ab81bfa25d14ef78acd8805f3c5ffa39ef0d3b3be0a',
    detail: 'Block 67866582 · status 0x0 (EnforcedPause)'
  },
  {
    step: 'Cycle 1 — deposit() after reopen, confirmed',
    chain: 'Unichain Sepolia',
    hash: '0x662377b0bcc1ed413cfc44051403eeca949675a14ad401d7548dd62fd1d8d7b9',
    shortHash: '0x662377b0…8d7b9',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x662377b0bcc1ed413cfc44051403eeca949675a14ad401d7548dd62fd1d8d7b9',
    detail: 'Block 67866602 · 0.001 ETH accepted'
  },
  {
    step: 'Cycle 2 — trip U1 (TEST-002)',
    chain: 'Unichain Sepolia',
    hash: '0xb4f59a603a8032495c22646c518a8bdfc709e1124acd04bb40eb18a13418a541',
    shortHash: '0xb4f59a60…8541',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xb4f59a603a8032495c22646c518a8bdfc709e1124acd04bb40eb18a13418a541',
    detail: 'Block 67866642 · loop repeated, ~2 s again'
  }
] as const;

const PUBLIC_V2_E2E_TXS = [
  {
    step: 'E2E v2 — trip Uni #0 (PUB2-E2E1)',
    chain: 'Unichain Sepolia',
    hash: '0xd7c4c39d385b024bfc43dc6f6425a8e7dc358ea402876e84e668de396cc84a0a',
    shortHash: '0xd7c4c39d…84a0a',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xd7c4c39d385b024bfc43dc6f6425a8e7dc358ea402876e84e668de396cc84a0a',
    detail: 'Block 67886881 · ketiga vault ETH paused, CONTAINED'
  },
  {
    step: 'E2E v2 — reopen Uni #0',
    chain: 'Unichain Sepolia',
    hash: '0x85633025d68695b342f8418d6492d4d9ab48b0a63191d1cfb0fb6b5d7f434f39',
    shortHash: '0x85633025…34f39',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x85633025d68695b342f8418d6492d4d9ab48b0a63191d1cfb0fb6b5d7f434f39',
    detail: 'Block 67886916 · permissionless'
  },
  {
    step: 'E2E v2 — reopen Uni #1',
    chain: 'Unichain Sepolia',
    hash: '0x2e6c001a4f9513b71dabf74194506deb885de0d858114d80ec894f2946ba1417',
    shortHash: '0x2e6c001a…ba1417',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x2e6c001a4f9513b71dabf74194506deb885de0d858114d80ec894f2946ba1417',
    detail: 'Block 67886941 · permissionless'
  },
  {
    step: 'E2E v2 — reopen Base #0',
    chain: 'Base Sepolia',
    hash: '0xdf6e0819d2431ec1784e12503889cf21c1e4783ca92b08f85b88960451a8f327',
    shortHash: '0xdf6e0819…8f327',
    explorer: 'https://sepolia.basescan.org/tx/0xdf6e0819d2431ec1784e12503889cf21c1e4783ca92b08f85b88960451a8f327',
    detail: 'Block 59087391 · permissionless'
  }
] as const;

const PUBLIC_USDC_E2E_TXS = [
  {
    step: 'E2E USDC — deposit 20 USDC (funding)',
    chain: 'Unichain Sepolia',
    hash: '0x03bd7073489a4518ec634017a8178e85e2d2050400e8d1684135e119b5290e1a',
    shortHash: '0x03bd7073…290e1a',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x03bd7073489a4518ec634017a8178e85e2d2050400e8d1684135e119b5290e1a',
    detail: 'Block 67887000 · totalAssets 20 USDC'
  },
  {
    step: 'E2E USDC — trip vault USDC (PUBUSDC-E2E)',
    chain: 'Unichain Sepolia',
    hash: '0xd4f340b468992f6651810de8c6882486c6bd64388d39a96a2e7d54f950389b49',
    shortHash: '0xd4f340b4…49b49',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xd4f340b468992f6651810de8c6882486c6bd64388d39a96a2e7d54f950389b49',
    detail: 'Block 67887012 · keempat vault watcher baru paused, CONTAINED'
  },
  {
    step: 'E2E USDC — reopen vault USDC',
    chain: 'Unichain Sepolia',
    hash: '0x0899c7dca55f3ce43fd3b178feb6cc00e4485fde41df0f4c0302f612c6d79400',
    shortHash: '0x0899c7dc…79400',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x0899c7dca55f3ce43fd3b178feb6cc00e4485fde41df0f4c0302f612c6d79400',
    detail: 'Block 67887052 · permissionless'
  }
] as const;

const TWO_TRIP_TXS = [
  {
    step: 'Two-trip — trip U1 (2TRIP-C)',
    chain: 'Unichain Sepolia',
    hash: '0x02ade27e58f9dedc445d15250dd5479a4e010b11f3c4a18035dc1673d3ef6648',
    shortHash: '0x02ade27e…f6648',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x02ade27e58f9dedc445d15250dd5479a4e010b11f3c4a18035dc1673d3ef6648',
    detail: 'Block 67886611 · IncidentTripped Lasna 8401896'
  },
  {
    step: 'Two-trip — trip U2 (2TRIP-D)',
    chain: 'Unichain Sepolia',
    hash: '0xb1c08933920b0f7d50f3ccfe203157b2aab2f89348cf635e0b7613959971b50d',
    shortHash: '0xb1c08933…1b50d',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xb1c08933920b0f7d50f3ccfe203157b2aab2f89348cf635e0b7613959971b50d',
    detail: 'Block 67886612 · IncidentTripped Lasna 8401897 — sebelum containment pertama'
  },
  {
    step: 'Two-trip — containment kedua incident',
    chain: 'Lasna',
    hash: '0xfe667e3e0d499f1bb0570149dd260a100e247274a13edb8c1a232a84802e4b74',
    shortHash: '0xfe667e3e…e4b74',
    explorer: 'https://lasna.reactscan.net/tx/0xfe667e3e0d499f1bb0570149dd260a100e247274a13edb8c1a232a84802e4b74',
    detail: 'Block 8401899 · kedua incident CONTAINED dalam tx yang sama'
  }
] as const;

const F8_TXS = [
  {
    step: 'F8 — trip T (vault S berutang)',
    chain: 'Unichain Sepolia',
    hash: '0x1ae52ec08f4b515734d32e085e6c650df432ffd96fff19f3527a420f474e23a7',
    shortHash: '0x1ae52ec0…4e23a7',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x1ae52ec08f4b515734d32e085e6c650df432ffd96fff19f3527a420f474e23a7',
    detail: 'Block 67887138 · utang S 152.606.850.000 wei; callback terblokir'
  },
  {
    step: 'F8 — coverDebt() S',
    chain: 'Unichain Sepolia',
    hash: '0xc559af0511cf8c25778a7d057d61fbb8398cf3402debd424086966dc35cfde10',
    shortHash: '0xc559af05…cfde10',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xc559af0511cf8c25778a7d057d61fbb8398cf3402debd424086966dc35cfde10',
    detail: 'Block 67887224 · utang S 152.606.850.000 → 0'
  },
  {
    step: 'F8 — retry emergencyPause T',
    chain: 'Unichain Sepolia',
    hash: '0x835f7c1fcb67e7f4ee13eb54e89096fde91501560733f8e5608b4bdadb083127',
    shortHash: '0x835f7c1f…083127',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x835f7c1fcb67e7f4ee13eb54e89096fde91501560733f8e5608b4bdadb083127',
    detail: 'Block 67887240 · S paused=true (callback jalan lagi), CONTAINED'
  }
] as const;

const FRESH_E2E_TXS = [
  {
    step: 'Fresh E2E — createVault (fresh wallet, factory utama)',
    chain: 'Unichain Sepolia',
    hash: '0x00302761c519f27d8b233fde12ba388705110d7c0212b2eede2646a5edd1e7a2',
    shortHash: '0x00302761…d1e7a2',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x00302761c519f27d8b233fde12ba388705110d7c0212b2eede2646a5edd1e7a2',
    detail: 'Block 67891567 · created 0xe0e566c8…D5a4 == predicted'
  },
  {
    step: 'Fresh E2E — registerSibling (deployer, Lasna)',
    chain: 'Lasna',
    hash: '0xb65f38260744eea454152b87326a0300541224a9c6edd656bfb1493acc064963',
    shortHash: '0xb65f3826…4963',
    explorer: 'https://lasna.reactscan.net/tx/0xb65f38260744eea454152b87326a0300541224a9c6edd656bfb1493acc064963',
    detail: 'Block 8406581 · registeredSibling(1301, fresh) = true'
  },
  {
    step: 'Fresh E2E — deposit 0,001 ETH (fresh)',
    chain: 'Unichain Sepolia',
    hash: '0xe61917e638aa8ba33bd1c57e76c32466a92ecc52bfea60beb570bb5635fd8af0',
    shortHash: '0xe61917e6…fd8af0',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xe61917e638aa8ba33bd1c57e76c32466a92ecc52bfea60beb570bb5635fd8af0',
    detail: 'Block 67891608 · totalAssets 0,001 → 0,002 ETH; shares fresh 1e21'
  },
  {
    step: 'Fresh E2E — trip emergencyPause FRESH-E2E1 (fresh)',
    chain: 'Unichain Sepolia',
    hash: '0xa18fd7e5076eba17a28d10b2647a43b3dd48afed7040a5107871a34bf17dcfac',
    shortHash: '0xa18fd7e5…dcfac',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xa18fd7e5076eba17a28d10b2647a43b3dd48afed7040a5107871a34bf17dcfac',
    detail: 'Block 67891623 · kelima vault paused'
  },
  {
    step: 'Fresh E2E — react()',
    chain: 'Lasna',
    hash: '0xac633113b81cca48c17e9738b8991fa00cba707df82feb51e41cbfc36da74dcc',
    shortHash: '0xac633113…4dcc',
    explorer: 'https://lasna.reactscan.net/tx/0xac633113b81cca48c17e9738b8991fa00cba707df82feb51e41cbfc36da74dcc',
    detail: 'Block 8406617 · IncidentTripped origin fresh'
  },
  {
    step: 'Fresh E2E — IncidentContained',
    chain: 'Lasna',
    hash: '0x1ec9243d0dc00a16822d1adba4dd62e94ccddd869e3a332bf7bc482d9ecda7af',
    shortHash: '0x1ec9243d…da7af',
    explorer: 'https://lasna.reactscan.net/tx/0x1ec9243d0dc00a16822d1adba4dd62e94ccddd869e3a332bf7bc482d9ecda7af',
    detail: 'Block 8406620 · incident(fresh).active = false; biaya loop 0,1526463 lREACT'
  },
  {
    step: 'Fresh E2E — deposit 1 USDC ke vault USDC publik (fresh)',
    chain: 'Unichain Sepolia',
    hash: '0x3c38e78c26327990451b1545e1b370a4c4bd56f1755ece9a921e21153b3c3cda',
    shortHash: '0x3c38e78c…3c3cda',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x3c38e78c26327990451b1545e1b370a4c4bd56f1755ece9a921e21153b3c3cda',
    detail: 'Block 67891700 · totalAssets 20 → 21 USDC; shares fresh 1e18'
  }
] as const;

const LOOP_TXS = [
  {
    step: '1. emergencyPause (trigger)',
    chain: 'Unichain Sepolia',
    hash: '0xe9f11b6df0c2e2f8efc7929cce4aa0b7910e094c6defc18e1f59ddea427e2257',
    shortHash: '0xe9f11b6d…e2257',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xe9f11b6df0c2e2f8efc7929cce4aa0b7910e094c6defc18e1f59ddea427e2257',
    detail: 'Block 67816030'
  },
  {
    step: '2. react()',
    chain: 'Lasna',
    hash: '0x98dd6dad4b360201ebae842be7280ee0da47051dd4607b6cafac6ef73f21293a',
    shortHash: '0x98dd6dad…f21293a',
    explorer: 'https://lasna.reactscan.net/tx/0x98dd6dad4b360201ebae842be7280ee0da47051dd4607b6cafac6ef73f21293a',
    detail: 'Block 8335436 · 349,263 gas'
  },
  {
    step: '3. Callback pause() — vault B',
    chain: 'Base Sepolia',
    hash: '0xe84c258d1ebc313c7fe19f016bfa0805ba28fe93dd61811e4544627b734c506b',
    shortHash: '0xe84c258d…34c506b',
    explorer: 'https://sepolia.basescan.org/tx/0xe84c258d1ebc313c7fe19f016bfa0805ba28fe93dd61811e4544627b734c506b',
    detail: 'Block 58732960 · 78,314 gas'
  },
  {
    step: '4. Callback pause() — vault C',
    chain: 'Unichain Sepolia',
    hash: '0x60e534047a2e279cf8c3c9dcacc21d949ed396f773a6e9f82c1c8eab444e5912',
    shortHash: '0x60e53404…44e5912',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x60e534047a2e279cf8c3c9dcacc21d949ed396f773a6e9f82c1c8eab444e5912',
    detail: 'Block 67816033 · 78,304 gas'
  },
  {
    step: 'Containment confirmed',
    chain: 'Lasna',
    hash: '0xf73ce63e667c8d6223e4611d6ceed2af0425bd0b69d6e0e1222672c5f74a3d0c',
    shortHash: '0xf73ce63e…5f74a3d0c',
    explorer: 'https://lasna.reactscan.net/tx/0xf73ce63e667c8d6223e4611d6ceed2af0425bd0b69d6e0e1222672c5f74a3d0c',
    detail: 'Block 8335438 · IncidentContained'
  }
] as const;

const V2_ETH_LOOP_TXS = [
  {
    step: 'Trip — emergencyPause origin (E2E-V2-001)',
    chain: 'Unichain Sepolia',
    hash: '0x7c84025e613083831745d675b88d6bf3c01aeddf207bbe4ea6c0e748f24d40f2',
    shortHash: '0x7c84025e…d40f2',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x7c84025e613083831745d675b88d6bf3c01aeddf207bbe4ea6c0e748f24d40f2',
    detail: 'Block 67871519 · 32,649 gas'
  },
  {
    step: 'react() — fan-out',
    chain: 'Lasna',
    hash: '0x61fc8e180d845c11d95f0e3c75f51bc3220e3212e28a67e94cace846ab2eed35',
    shortHash: '0x61fc8e18…eed35',
    explorer: 'https://lasna.reactscan.net/tx/0x61fc8e180d845c11d95f0e3c75f51bc3220e3212e28a67e94cace846ab2eed35',
    detail: 'Block 8387722 · 325,228 gas · IncidentTripped + PauseRequested (Base)'
  },
  {
    step: 'Callback pause() — sibling (Base)',
    chain: 'Base Sepolia',
    hash: '0xa9325ee9b97ba5d340794f81c69ca39ad6e142d6761baff04f012b99170e6ab6',
    shortHash: '0xa9325ee9…e6ab6',
    explorer: 'https://sepolia.basescan.org/tx/0xa9325ee9b97ba5d340794f81c69ca39ad6e142d6761baff04f012b99170e6ab6',
    detail: 'Block 59010397 · 80,932 gas · ~1 s after the trip'
  },
  {
    step: 'Containment confirmed',
    chain: 'Lasna',
    hash: '0xb1b47ff1a3be386d7eddb47408d15847d2c8316011407f6ce6322aee7deb7b7d',
    shortHash: '0xb1b47ff1…b7b7d',
    explorer: 'https://lasna.reactscan.net/tx/0xb1b47ff1a3be386d7eddb47408d15847d2c8316011407f6ce6322aee7deb7b7d',
    detail: 'Block 8387723 · 170,847 gas · SiblingConfirmed + IncidentContained'
  }
] as const;

/** USDC loops #1 + #2 (15 Nov 2026) — same watcher v2, four vaults. */
const V2_USDC_LOOP_TXS = [
  {
    step: 'Loop #1 — trip, origin ETH v2 (E2E-USDC-01)',
    chain: 'Unichain Sepolia',
    hash: '0xf836639b43ac9befb4fb6cb231632f24cee4038ccabfce5328a21511358053eb',
    shortHash: '0xf836639b…053eb',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xf836639b43ac9befb4fb6cb231632f24cee4038ccabfce5328a21511358053eb',
    detail: 'Block 67877324'
  },
  {
    step: 'Loop #1 — react()',
    chain: 'Lasna',
    hash: '0xf55bf6eac0cd5ef220c19850800e903f520715a64870ad0d099724190e39af22',
    shortHash: '0xf55bf6ea…9af22',
    explorer: 'https://lasna.reactscan.net/tx/0xf55bf6eac0cd5ef220c19850800e903f520715a64870ad0d099724190e39af22',
    detail: 'Block 8393170 · 222,610 gas · IncidentTripped + PauseRequested ×3'
  },
  {
    step: 'Loop #1 — callback pause() USDC vault (Uni)',
    chain: 'Unichain Sepolia',
    hash: '0x93182e78bd4a8f8aedcf8dd4596087325cfc926cd568b77558ce28cb34f16805',
    shortHash: '0x93182e78…16805',
    explorer: 'https://sepolia.uniscan.xyz/tx/0x93182e78bd4a8f8aedcf8dd4596087325cfc926cd568b77558ce28cb34f16805',
    detail: 'Block 67877326 · ~2–3 s after the trip'
  },
  {
    step: 'Loop #1 — callback pause() ETH vault (Base)',
    chain: 'Base Sepolia',
    hash: '0x7d2dd9663c919178f7d3f336fd413298eba8b86a80005b63ff5d5dff1000c814',
    shortHash: '0x7d2dd966…0c814',
    explorer: 'https://sepolia.basescan.org/tx/0x7d2dd9663c919178f7d3f336fd413298eba8b86a80005b63ff5d5dff1000c814',
    detail: 'Block 59039425'
  },
  {
    step: 'Loop #1 — callback pause() USDC vault (Base)',
    chain: 'Base Sepolia',
    hash: '0x8f1537c483faa35785916bef4dd1ac588155e9492f28fd0c1e05e75a5998ae0d',
    shortHash: '0x8f1537c4…8ae0d',
    explorer: 'https://sepolia.basescan.org/tx/0x8f1537c483faa35785916bef4dd1ac588155e9492f28fd0c1e05e75a5998ae0d',
    detail: 'Block 59039428 · cost 0.105642 lREACT'
  },
  {
    step: 'Loop #2 — trip, origin USDC (E2E-USDC-02)',
    chain: 'Unichain Sepolia',
    hash: '0xfe37a2ee5f674c38db96e29764ac89be10e8707a7d6bab5b70b72fa7e7d1a0dd',
    shortHash: '0xfe37a2ee…1a0dd',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xfe37a2ee5f674c38db96e29764ac89be10e8707a7d6bab5b70b72fa7e7d1a0dd',
    detail: 'Block 67877922'
  },
  {
    step: 'Loop #2 — react()',
    chain: 'Lasna',
    hash: '0xe2d4c87d54eb0ae6cd48914e79069b8b1aefbf32072062e3191a8e7095462a14',
    shortHash: '0xe2d4c87d…62a14',
    explorer: 'https://lasna.reactscan.net/tx/0xe2d4c87d54eb0ae6cd48914e79069b8b1aefbf32072062e3191a8e7095462a14',
    detail: 'Block 8393733 · IncidentTripped + PauseRequested ×3'
  },
  {
    step: 'Loop #2 — callback pause() ETH vault (Uni)',
    chain: 'Unichain Sepolia',
    hash: '0xe29e058300cdb3807f554ba5588a86999e424f67c54c08b9111087997b92ab17',
    shortHash: '0xe29e0583…2ab17',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xe29e058300cdb3807f554ba5588a86999e424f67c54c08b9111087997b92ab17',
    detail: 'Block 67877924'
  },
  {
    step: 'Loop #2 — callback pause() ETH vault (Base)',
    chain: 'Base Sepolia',
    hash: '0x4003fc79e76c3df4c20193a4c981eb2386bbec2e9f7f6aa894b747e1ac481064',
    shortHash: '0x4003fc79…81064',
    explorer: 'https://sepolia.basescan.org/tx/0x4003fc79e76c3df4c20193a4c981eb2386bbec2e9f7f6aa894b747e1ac481064',
    detail: 'Block 59042413'
  },
  {
    step: 'Loop #2 — callback pause() USDC vault (Base)',
    chain: 'Base Sepolia',
    hash: '0x7406bc5bdc29640735959c2b29ca55ca12e587d8f16dc595afd00cb3e0266d29',
    shortHash: '0x7406bc5b…66d29',
    explorer: 'https://sepolia.basescan.org/tx/0x7406bc5bdc29640735959c2b29ca55ca12e587d8f16dc595afd00cb3e0266d29',
    detail: 'Block 59042415 · contained in ~8 s · cost 0.1210131 lREACT'
  }
] as const;

const FREEZE_PROOFS = [
  {
    chain: 'Base Sepolia',
    hash: '0x47c8e697935b07f03114277ae0f526d1f52e6e10240a631bc048e889ae03db76',
    shortHash: '0x47c8e697…ae03db76',
    explorer: 'https://sepolia.basescan.org/tx/0x47c8e697935b07f03114277ae0f526d1f52e6e10240a631bc048e889ae03db76',
    detail: 'Block 58733692 · status 0x0'
  },
  {
    chain: 'Unichain Sepolia',
    hash: '0xe1b8c9c9b259b28a031208a585a39ed89b1ce31333aa975d53b161726ae0a499',
    shortHash: '0xe1b8c9c9…ae0a499',
    explorer: 'https://sepolia.uniscan.xyz/tx/0xe1b8c9c9b259b28a031208a585a39ed89b1ce31333aa975d53b161726ae0a499',
    detail: 'Block 67816462 · status 0x0'
  }
] as const;

const LATENCY = [
  { metric: 'Full loop, trigger to last sibling paused', value: '3 seconds' },
  { metric: 'Event to react()', value: '0 seconds (same second)' },
  { metric: 'react() to Base Sepolia callback', value: '2 seconds' },
  { metric: 'react() to Unichain Sepolia callback', value: '3 seconds' },
  { metric: 'Time until CONTAINED', value: '2 seconds' },
  { metric: 'Siblings confirmed', value: '2 of 2' },
  { metric: 'Gas, react() (fan-out of 2)', value: '349,263 (limit 900,000)' },
  { metric: 'Gas, callback pause()', value: '78,314 / 78,304 (limit 200,000)' },
  { metric: 'Cost per loop', value: '~0.08–0.11 lREACT per loop (measured), plus about 0.00000061 ETH per callback destination' }
] as const;

const SCENARIOS = [
  {
    title: 'Full loop',
    text: 'Trigger to containment in 3 seconds, 2 of 2 siblings confirmed, and deposits on both siblings revert after the pause.'
  },
  {
    title: 'Retry',
    text: 'An outstanding proxy debt blocks a callback. After covering the debt, funding the sibling, and unpausing a paused-but-unconfirmed sibling, the retry re-emit fans out only to unconfirmed destinations, and trippedAt is unchanged.'
  },
  {
    title: 'Fall-through',
    text: 'An unregistered vault (D) trips and the watcher correctly ignores it: zero watcher events in the 130+ Lasna blocks after the trip.'
  },
  {
    title: 'Idempotency',
    text: 'Exactly 3 IncidentTripped and 3 IncidentContained events across all incidents. pause() called directly by an externally owned account reverts with NotAuthorized.'
  },
  {
    title: 'Manual unpause',
    text: 'All three vaults are unpaused by their owners, deposits work again, and watcher state is unchanged.'
  }
] as const;

const SECURITY_POINTS = [
  {
    title: 'One react(), N callbacks',
    text: 'A fan-out of 2 is proven on testnet. The 900,000 gas cap on react() bounds how many siblings one react() can cover.'
  },
  {
    title: 'Per-destination confirmation',
    text: 'The watcher tracks confirmation per chain and per sibling. Confirmations can arrive in any order — or not arrive at all — and the incident stays visibly unconfirmed until every sibling reports back.'
  },
  {
    title: 'Safe retry',
    text: 'A re-emit is distinguished from a new incident: trippedAt and the reason are never overwritten. Before retrying, the operator must cover outstanding proxy debt, fund the sibling, and unpause any paused-but-unconfirmed sibling first.'
  },
  {
    title: 'Idempotent pause',
    text: 'Calling pause() on an already-paused sibling is a silent no-op and emits no Paused event — in the main set (bytecode per 14–15 Nov 2026). The fixed build (in the repo and live on the public instances) re-emits Paused when already paused, so a second origin tripping mid-incident still reaches CONTAINED; see Known limitations.'
  },
  {
    title: 'Manual unpause only',
    text: 'unpause() is onlyOwner, per vault. There is no callback path to unpause, no timer, and no automatic reopen — reopening requires an audit, not speed.'
  },
  {
    title: 'No keeper, no oracle, no AI',
    text: 'The trigger is an on-chain event emitted by the protocol itself, and the logic is pure Solidity on Lasna. There is no off-chain service to keep alive and no subscription to pay.'
  },
  {
    title: 'Fail-closed',
    text: 'Any failure ends in a safe state (paused) or a visible state (unconfirmed, waiting for an operator re-emit) — never in a state that looks safe but is open.'
  },
  {
    title: 'Zero cost when idle',
    text: 'No cron, no polling. The watcher pays nothing until an incident trips.'
  }
] as const;

const LIMITATIONS = [
  'Maximum callbacks per react() is unverified beyond a fan-out of 4 (measured live on the v2 4-vault set and the v3 5-vault set, 15 Nov 2026); expanding beyond 5 siblings must be tested first.',
  'A chain reorganization can leave a sibling paused from an event that later disappears on the origin chain. This fails closed by design: a wrongly paused sibling costs delayed deposits until a manual unpause; a deployment left open during a real exploit costs its funds.',
  'The watcher does not subscribe to unpause events. Unpausing is a per-deployment human decision and the watcher has no action to take on it.',
  'Per-vault trip cooldown (60 s) only slows aggregate drain, it does not prevent it: rotating trips across the five public vaults can still drain a watcher in minutes. The v3 public watcher bounds this with an aggregate cap — at most 5 NEW incidents per rolling hour (worst case ~0.75 lREACT/hour at the measured 5-vault loop cost) — and a capped trip is dropped, not queued: the tripping vault paused itself, but the siblings stay open until the window resets and the origin is re-tripped, or the vault owners pause each sibling directly.',
  'A trip that arrives while the watcher itself is paused is lost: there is no queue or replay. After the watcher resumes, the origin must be tripped again (a new incident) for the fan-out to run.',
  'Keterbatasan yang diketahui (main set v1 + vault v2 utama, bytecode per 14–15 Nov 2026): bila dua vault trip berurutan sebelum incident pertama mencapai CONTAINED, konfirmasi Paused dari vault yang sudah paused tidak ter-emit, sehingga incident dapat tersangkut aktif sampai ada intervensi manual (unpause + emergencyPause ulang). Prosedur operator: jangan trip origin kedua sebelum incident pertama berstatus CONTAINED. Perbaikan sudah ada di kode repo (SiblingVault.pause() meng-emit ulang Paused) dan live di instance publik baru. Catatan F6: registerSibling tidak memeriksa code di chain tujuan (tidak mungkin dari Lasna) — verifikasi dilakukan off-chain (checklist app + cast code di chain tujuan sebelum register).'
] as const;

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noreferrer'
      className='inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline'
    >
      {children}
      <Icons.externalLink className='size-3.5 shrink-0' />
    </a>
  );
}

function DocTable({ children }: { children: React.ReactNode }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>{children}</table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <PageContainer
      pageTitle='Documentation'
      pageDescription='How ContagionStop works, the deployed contracts, and how to verify every claim on-chain.'
    >
      <div className='flex flex-1 flex-col gap-4'>
        <Card>
          <CardHeader>
            <div className='flex flex-wrap items-center gap-2'>
              <CardTitle>What is ContagionStop</CardTitle>
              <Badge variant='outline' className='border-primary/40 text-primary'>
                <Icons.circleCheck className='mr-1 size-3.5' />
                RECORDED RUN — TESTNET
              </Badge>
              <Badge variant='outline'>
                <Icons.warning className='mr-1 size-3.5' />
                TESTNET ONLY — NOT AUDITED
              </Badge>
            </div>
            <CardDescription>
              A cross-chain circuit breaker for multi-chain DeFi protocols.
              Testnet only. Do not use with real funds.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-3 text-sm leading-relaxed'>
            <p>
              ContagionStop is a cross-chain circuit breaker for protocols
              that deploy the same vault on several chains. When a
              vulnerability is found in one deployment, an attacker can replay
              the same exploit against the sibling deployments while the team
              is still organizing a manual pause — a multisig that needs hours
              to gather members across time zones, reach quorum, and sign one
              transaction per chain.
            </p>
            <p>
              ContagionStop removes the human from the execution path. When
              the security team pauses one deployment, a reactive contract on
              the Reactive Network (Lasna) detects the on-chain event and
              requests a pause callback to every sibling deployment on other
              chains. No funds move: only deposits, borrows, and mints freeze
              on each sibling. Measured on testnet, the full loop — from the
              trigger transaction to the last sibling paused — takes 3
              seconds.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>
              One event, one react(), one callback per sibling — and a
              confirmation for each.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4 text-sm leading-relaxed'>
            <ol className='flex list-decimal flex-col gap-3 pl-5'>
              <li>
                <span className='font-medium'>Setup.</span> Three
                SiblingVault contracts are deployed and funded, and the
                ContagionWatcher on Lasna is registered and active. Each vault
                accepts deposits.
              </li>
              <li>
                <span className='font-medium'>Trigger.</span> The security
                team (owner of vault A) calls{' '}
                <code className='font-mono text-xs'>emergencyPause(reason)</code>{' '}
                on Unichain Sepolia. Vault A pauses itself and emits{' '}
                <code className='font-mono text-xs'>EmergencyPaused</code>. No
                funds move.
              </li>
              <li>
                <span className='font-medium'>React.</span> The watcher
                receives the LogRecord on Lasna. Its{' '}
                <code className='font-mono text-xs'>react()</code> records the
                incident (trippedAt, reason, active), marks the origin
                confirmed, and requests two{' '}
                <code className='font-mono text-xs'>pause()</code> callbacks:
                to vault B on Base Sepolia and vault C on Unichain Sepolia.
                One react() fans out to two callbacks.
              </li>
              <li>
                <span className='font-medium'>Execute.</span> The Reactive
                network sends both callbacks through each chain&apos;s
                callback proxy. <code className='font-mono text-xs'>pause()</code>{' '}
                on B and C passes its guards, pauses the vault, and emits{' '}
                <code className='font-mono text-xs'>Paused</code>. Deposits on
                B and C now revert.
              </li>
              <li>
                <span className='font-medium'>Confirm.</span> The watcher
                receives a <code className='font-mono text-xs'>Paused</code>{' '}
                LogRecord from each sibling and marks it confirmed. When all
                siblings are confirmed, the incident is CONTAINED.
              </li>
              <li>
                <span className='font-medium'>Close (manual).</span> After an
                audit, the owner of each vault calls{' '}
                <code className='font-mono text-xs'>unpause()</code> on that
                vault directly. The watcher is not involved and records
                nothing.
              </li>
            </ol>
            <p className='text-muted-foreground'>
              Between the trigger transaction and the callbacks, no transaction
              is signed by a human — only the react() transaction executed by
              Reactive validators. The dashboard never calls pause() directly;
              only the watcher contract&apos;s callback does, after a real
              EmergencyPaused LogRecord.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Measured latency</CardTitle>
            <CardDescription>
              Incident 1 (reason EXPLOIT-001), 14 Nov 2026. Latencies are
              block timestamps from the explorers, with 1-second granularity;
              cross-chain clocks can differ by plus or minus 1 second.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocTable>
              <tbody>
                {LATENCY.map((row) => (
                  <tr key={row.metric} className='border-b last:border-b-0'>
                    <td className='py-2 pr-4'>{row.metric}</td>
                    <td className='py-2 font-mono text-xs font-medium tabular-nums'>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DocTable>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contract addresses</CardTitle>
            <CardDescription>
              All four production contracts are Sourcify-verified
              (exact_match, creation and runtime).
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-6'>
            <DocTable>
              <thead>
                <tr className='border-b text-left text-muted-foreground'>
                  <th className='py-2 pr-4 font-medium'>Contract</th>
                  <th className='py-2 pr-4 font-medium'>Chain</th>
                  <th className='py-2 font-medium'>Address</th>
                </tr>
              </thead>
              <tbody>
                {CONTRACTS.map((contract) => (
                  <tr key={contract.address} className='border-b align-top last:border-b-0'>
                    <td className='py-2 pr-4 font-medium'>{contract.name}</td>
                    <td className='py-2 pr-4 whitespace-nowrap'>{contract.chain}</td>
                    <td className='py-2'>
                      <ExternalLink href={contract.explorer}>
                        <span className='font-mono text-xs break-all'>
                          {contract.address}
                        </span>
                      </ExternalLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DocTable>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                Public test deployment — anyone can trip and reopen these
              (Sourcify exact_match, all four)
              </p>
              <DocTable>
                <tbody>
                  {PUBLIC_CONTRACTS.map((contract) => (
                    <tr key={contract.address} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{contract.name}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{contract.chain}</td>
                      <td className='py-2'>
                        <ExternalLink href={contract.explorer}>
                          <span className='font-mono text-xs break-all'>
                            {contract.address}
                          </span>
                        </ExternalLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                Public test deployment v2 — shares (15 Nov 2026, Sourcify
                exact_match: implementations + factories on both chains +
                watcher) — historical, superseded by v3
              </p>
              <p className='text-sm text-muted-foreground'>
                Three ETH vaults (shares CSV) + one USDC vault (shares
                CSUSDC, 20 USDC funded + 1 USDC from the fresh-wallet E2E =
                21 USDC totalAssets) under a new public watcher on Lasna.
                Trip has a 60-second cooldown per vault. The cooldown only
                slows aggregate drain — it does not prevent it (see Known
                limitations). Reopen is permissionless on this set, so a
                visitor could cancel CONTAINED mid-incident; that is why
                v3 makes reopen owner-only. The v2 vaults and watcher are
                still live on-chain, but the current public set is v3
                below. Address note: the
                v2 watcher (Lasna, chain 5318007) shares its address{' '}
                <code className='font-mono text-xs'>
                  0x4b44497bAD6c270462D0529FCe4E41A7e092669b
                </code>{' '}
                with the retired v1 vault B on Base Sepolia (chain 84532).
                Addresses are per-chain, so there is no collision — always
                read the address together with its chain.
              </p>
              <DocTable>
                <tbody>
                  {PUBLIC_V2_CONTRACTS.map((contract) => (
                    <tr key={`${contract.chain}-${contract.address}`} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{contract.name}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{contract.chain}</td>
                      <td className='py-2'>
                        <ExternalLink href={contract.explorer}>
                          <span className='font-mono text-xs break-all'>
                            {contract.address}
                          </span>
                        </ExternalLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                Public test deployment v3 — shares, current (15 Nov 2026,
                Sourcify exact_match: implementations + factories on both
                chains + watcher)
              </p>
              <p className='text-sm text-muted-foreground'>
                Three ETH vaults (shares CSV) + two USDC vaults (shares
                CSUSDC, 20 USDC funded each) under a new public watcher
                v3 on Lasna. Funds were migrated from the v2 set
                (sweepExcess + redeem), no faucet involved. Trip has a
                60-second cooldown per vault, and the watcher caps NEW
                incidents at 5 per rolling hour — a capped trip emits{' '}
                <code className='font-mono text-xs'>IncidentCapHit</code>{' '}
                and requests no callbacks (the tripping vault paused
                itself; the siblings stay open until the window resets).
                Reopen is owner-only on this set. Address note: the
                v3 watcher (Lasna, chain 5318007) shares its address{' '}
                <code className='font-mono text-xs'>
                  0xE7bd21cB41c0475650069A19b6207a48cAe0F9E6
                </code>{' '}
                with the v2 ETH factory on Base Sepolia (chain 84532).
                Addresses are per-chain, so there is no collision — always
                read the address together with its chain.
              </p>
              <DocTable>
                <tbody>
                  {PUBLIC_V3_CONTRACTS.map((contract) => (
                    <tr key={`${contract.chain}-${contract.address}`} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{contract.name}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{contract.chain}</td>
                      <td className='py-2'>
                        <ExternalLink href={contract.explorer}>
                          <span className='font-mono text-xs break-all'>
                            {contract.address}
                          </span>
                        </ExternalLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                Vaults v2 — ERC-20 shares (15 Nov 2026, Sourcify
                exact_match: implementations + factories on both chains)
              </p>
              <p className='text-sm text-muted-foreground'>
                Shares are ERC-20 per vault; the ETH vaults are ETH-native
                (ERC-4626 semantics, no WETH) and the USDC vaults hold
                canonical USDC (share CSUSDC, min deposit 1 USDC). One
                watcher v2 on Lasna watches all four v2 vaults. The USDC
                vaults are funded with 20 USDC each (15 Nov 2026);
                funding is a manual step. The app reads all of these live
                on the Overview page and can create new vaults from the
                factories on the Deploy your own page. The factories
                listed here point at implementations deployed 15 Nov 2026
                from the current repo source, which contains the F1 fix
                (pause() re-emits Paused when already paused). Vaults
                created before 15 Nov 2026 from the previous factories
                use the pre-fix implementation: if two of those vaults
                trip in sequence before the first incident reaches
                CONTAINED, the incident can stay active until manual
                intervention (unpause + emergencyPause again).
              </p>
              <DocTable>
                <tbody>
                  {V2_CONTRACTS.map((contract) => (
                    <tr key={contract.address} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{contract.name}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{contract.chain}</td>
                      <td className='py-2'>
                        <ExternalLink href={contract.explorer}>
                          <span className='font-mono text-xs break-all'>
                            {contract.address}
                          </span>
                        </ExternalLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to verify</CardTitle>
            <CardDescription>
              The full loop of incident 1, transaction by transaction. Every
              hash below links to its explorer.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-6'>
            <DocTable>
              <thead>
                <tr className='border-b text-left text-muted-foreground'>
                  <th className='py-2 pr-4 font-medium'>Step</th>
                  <th className='py-2 pr-4 font-medium'>Chain</th>
                  <th className='py-2 pr-4 font-medium'>Transaction</th>
                  <th className='py-2 font-medium'>Detail</th>
                </tr>
              </thead>
              <tbody>
                {LOOP_TXS.map((tx) => (
                  <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                    <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                    <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                    <td className='py-2 pr-4'>
                      <ExternalLink href={tx.explorer}>
                        <span className='font-mono text-xs'>{tx.shortHash}</span>
                      </ExternalLink>
                    </td>
                    <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                      {tx.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DocTable>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                Proof of freezing — deposit() after the pause reverts
              </p>
              <p className='text-sm text-muted-foreground'>
                Both attempts were mined with status 0x0, which is the
                on-chain proof that deposits are frozen once a vault is
                paused.
              </p>
              <DocTable>
                <tbody>
                  {FREEZE_PROOFS.map((proof) => (
                    <tr key={proof.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{proof.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={proof.explorer}>
                          <span className='font-mono text-xs'>{proof.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {proof.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
            <div className='flex flex-col gap-3'>
              <p className='text-sm font-medium'>
                Five scenarios, all passing (14 Nov 2026)
              </p>
              <ul className='flex flex-col gap-3'>
                {SCENARIOS.map((scenario) => (
                  <li key={scenario.title} className='flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0'>
                    <span className='flex items-center gap-2 text-sm font-medium'>
                      <Icons.circleCheck className='size-4 shrink-0 text-primary' />
                      {scenario.title}
                    </span>
                    <span className='text-sm text-muted-foreground'>
                      {scenario.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className='flex flex-col gap-3'>
              <p className='text-sm font-medium'>
                Vaults v2 loops — ETH + USDC (15 Nov 2026, watcher v2)
              </p>
              <p className='text-sm text-muted-foreground'>
                Three full loops on watcher v2 (Lasna{' '}
                <code className='font-mono text-xs'>0xF5ad04cB…54C7D4B</code>),
                covering all four v2 vaults (2 ETH + 2 USDC). The ETH loop
                cost 0.0793974 lREACT and contained in ~1 s; USDC loop #1
                (origin ETH) cost 0.105642 lREACT and contained in ~2–3 s;
                USDC loop #2 (origin USDC — the watcher reacts to a USDC
                vault exactly like to an ETH vault) cost 0.1210131 lREACT
                and contained in ~8 s. All four vaults were reopened after
                each loop; proxy debt stayed 0 throughout.
              </p>
              <DocTable>
                <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                    <th className='py-2 pr-4 font-medium'>Step</th>
                    <th className='py-2 pr-4 font-medium'>Chain</th>
                    <th className='py-2 pr-4 font-medium'>Transaction</th>
                    <th className='py-2 font-medium'>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {V2_ETH_LOOP_TXS.map((tx) => (
                    <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={tx.explorer}>
                          <span className='font-mono text-xs'>{tx.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {tx.detail}
                      </td>
                    </tr>
                  ))}
                  {V2_USDC_LOOP_TXS.map((tx) => (
                    <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={tx.explorer}>
                          <span className='font-mono text-xs'>{tx.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {tx.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
            <div className='flex flex-col gap-3'>
              <p className='text-sm font-medium'>
                Public v2 E2E — ETH + USDC (15 Nov 2026, new public watcher)
              </p>
              <p className='text-sm text-muted-foreground'>
                Two full loops on the new public watcher (Lasna{' '}
                <code className='font-mono text-xs'>0x4b44497b…669b</code>).
                The ETH loop cost 0.1020317 lREACT; the USDC loop (origin
                USDC vault — the watcher reacts to a USDC vault exactly like
                to an ETH vault) cost 0.1278079 lREACT. All four vaults were
                reopened after each loop (permissionless reopen).
              </p>
              <DocTable>
                <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                    <th className='py-2 pr-4 font-medium'>Step</th>
                    <th className='py-2 pr-4 font-medium'>Chain</th>
                    <th className='py-2 pr-4 font-medium'>Transaction</th>
                    <th className='py-2 font-medium'>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {PUBLIC_V2_E2E_TXS.map((tx) => (
                    <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={tx.explorer}>
                          <span className='font-mono text-xs'>{tx.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {tx.detail}
                      </td>
                    </tr>
                  ))}
                  {PUBLIC_USDC_E2E_TXS.map((tx) => (
                    <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={tx.explorer}>
                          <span className='font-mono text-xs'>{tx.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {tx.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
            <div className='flex flex-col gap-3'>
              <p className='text-sm font-medium'>
                Public v3 E2E — ETH + USDC (15 Nov 2026, watcher v3)
              </p>
              <p className='text-sm text-muted-foreground'>
                One full loop on the v3 public watcher (Lasna{' '}
                <code className='font-mono text-xs'>0xE7bd21cB…cAe0F9E6</code>
                ). Trip Uni #0 (reason V3-E2E-1){' '}
                <ExternalLink href='https://sepolia.uniscan.xyz/tx/0xac350def7550963a6992627a3ded74cf5d99f37f72ab9b5dd514d35df02d8a30'>
                  <span className='font-mono text-xs'>0xac350def…2d8a30</span>
                </ExternalLink>{' '}
                → react{' '}
                <ExternalLink href='https://lasna.reactscan.net/tx/0x82feb96d2ae197565ccafbf5beacd5da05e06f6473001259a7b44af4ebf021a8'>
                  <span className='font-mono text-xs'>0x82feb96d…f021a8</span>
                </ExternalLink>{' '}
                → all five vaults paused, CONTAINED. The loop cost
                0.1514159 lREACT (watcher 1.0 → 0.8485841) and counted as
                incident #1 in the cap window. All five vaults were
                reopened by the deployer afterwards (reopen is owner-only
                on v3); a reopen simulated from any other wallet reverts
                with OwnableUnauthorizedAccount.
              </p>
            </div>
            <div className='flex flex-col gap-3'>
              <p className='text-sm font-medium'>
                Two-trip race (F1 verification, 15 Nov 2026) + coverDebt
                with real proxy debt (F8, 15 Nov 2026)
              </p>
              <p className='text-sm text-muted-foreground'>
                Two origins tripped back-to-back (blocks 67886611 and
                67886612) before the first containment — both incidents
                CONTAINED in the same Lasna transaction. Separately, a vault
                with real proxy debt (152.606.850.000 wei) blocked its
                callback until coverDebt() paid the debt to zero and a retry
                let the callback through. Both runs used scratch / public-v1
                instances, not the main set.
              </p>
              <DocTable>
                <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                    <th className='py-2 pr-4 font-medium'>Step</th>
                    <th className='py-2 pr-4 font-medium'>Chain</th>
                    <th className='py-2 pr-4 font-medium'>Transaction</th>
                    <th className='py-2 font-medium'>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {TWO_TRIP_TXS.map((tx) => (
                    <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={tx.explorer}>
                          <span className='font-mono text-xs'>{tx.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {tx.detail}
                      </td>
                    </tr>
                  ))}
                  {F8_TXS.map((tx) => (
                    <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={tx.explorer}>
                          <span className='font-mono text-xs'>{tx.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {tx.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
            <div className='flex flex-col gap-3'>
              <p className='text-sm font-medium'>
                Fresh-wallet E2E for Deploy your own (15 Nov 2026)
              </p>
              <p className='text-sm text-muted-foreground'>
                A fresh wallet (not the deployer,{' '}
                <code className='font-mono text-xs'>
                  0x4c97434A42a74a42b9A3EFfa38247B0B7F124A17
                </code>
                ) created a vault from the main ETH factory on Unichain
                Sepolia — the created address matched the Deploy page&apos;s
                prediction exactly — then the deployer registered it in
                watcher v2, the fresh wallet funded it (0.001 ETH deposit →
                totalAssets 0.002 ETH, 1e21 shares) and tripped it. All five
                vaults (fresh + four main v2) paused, incident CONTAINED
                (Lasna block 8406620), then all five were unpaused. The same
                wallet also deposited 1 USDC into the public USDC vault
                (totalAssets 20 → 21 USDC, 1e18 shares).
              </p>
              <DocTable>
                <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                    <th className='py-2 pr-4 font-medium'>Step</th>
                    <th className='py-2 pr-4 font-medium'>Chain</th>
                    <th className='py-2 pr-4 font-medium'>Transaction</th>
                    <th className='py-2 font-medium'>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {FRESH_E2E_TXS.map((tx) => (
                    <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={tx.explorer}>
                          <span className='font-mono text-xs'>{tx.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {tx.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Try it live — public test deployment</CardTitle>
            <CardDescription>
              Test the full loop yourself with any wallet. The public vaults
              are permissionless by design; the main deployment above is
              owner-only.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4 text-sm leading-relaxed'>
            <ol className='flex list-decimal flex-col gap-3 pl-5'>
              <li>
                <span className='font-medium'>Connect a wallet</span> (top
                right). Any wallet works — no owner role is needed on the
                public instance. You need a little testnet ETH on Unichain
                Sepolia and/or Base Sepolia for gas, plus the network switched
                to the vault&apos;s chain (the page offers a switch button
                when you are on the wrong chain).
              </li>
              <li>
                <span className='font-medium'>Trip.</span> On the Overview
                page, in &ldquo;Try it live&rdquo;, pick a set (v1 shell,
                v2 shares, or v3 shares — the current set) and a vault (U1
                is the origin used in the recorded v1 runs; Uni #0 is the
                origin of the recorded v2 and v3 runs) and press{' '}
                <span className='font-medium'>Trip incident</span>. Confirm
                the transaction in your wallet. Expect: the trip transaction
                confirms within a few seconds, and the page shows
                &ldquo;Trip confirmed — callbacks expected, not yet
                confirmed&rdquo;. On v2/v3, trip has a 60-second cooldown
                per vault; on v3 the watcher also caps new incidents at 5
                per rolling hour.
              </li>
              <li>
                <span className='font-medium'>Wait ~2 seconds.</span> The
                public watcher on Lasna reacts and requests a pause callback
                to each of the other vaults in the same set. Expect: all
                vault cards in that set flip to PAUSED. Press{' '}
                <span className='font-medium'>Refresh live state</span> if
                the cards have not updated yet — the page re-reads paused(),
                balance, and totalDeposited() from chain.
              </li>
              <li>
                <span className='font-medium'>Verify on the explorer.</span>{' '}
                Open the trip transaction hash from the confirmation box and
                check its status. Then open the watcher on Reactscan and the
                two callback transactions: the recorded cycle 1 hashes are
                listed below, and your own run produces the same pattern
                (trip → react → 2 callbacks → contained).
              </li>
              <li>
                <span className='font-medium'>Reopen.</span> Press{' '}
                <span className='font-medium'>Reopen</span> on each vault
                (any wallet can do this on v1/v2; on v3 reopen is
                owner-only, so the deployer reopens after a test) and
                confirm. Expect: each vault returns to ACTIVE. Reopen on
                an already-active vault is disabled — it would revert.
              </li>
              <li>
                <span className='font-medium'>Test deposit.</span> Press{' '}
                <span className='font-medium'>Test deposit() — 0.001 ETH</span>{' '}
                on an ETH vault. Expect: the deposit confirms and
                totalDeposited() (v1) rises by 0.001 ETH, or shares are
                minted to your wallet (v2). On the USDC vault, approve 1
                USDC first, then press{' '}
                <span className='font-medium'>Deposit 1 USDC</span>. While a
                vault is paused the button is disabled — a deposit then
                would revert (EnforcedPause), which is the freeze proof,
                not a bug. A test deposit to a v1 vault stays in the public
                vault: withdraw is owner-only, so send only testnet dust
                you do not need back.
              </li>
            </ol>
            <JudgeQuickstart />
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                What you can and cannot do
              </p>
              <ul className='flex list-disc flex-col gap-2 pl-5'>
                <li>
                  On the public test deployment v1/v2: trip, reopen, and
                  deposit with any wallet. On v3: trip and deposit with any
                  wallet; reopen is owner-only. On the main deployment: the
                  same actions are enabled only for the vault owner wallet —
                  visitors can inspect the live state (paused, balances,
                  owner) but cannot trigger actions.
                </li>
                <li>
                  Without a wallet, the Overview page still shows the recorded
                  run: incident 1, the measured latency, and the transaction
                  hashes.
                </li>
                <li>
                  Every number on the Overview page is labeled where it comes
                  from: LIVE reads (vault paused state, balances, watcher
                  balance) or the RECORDED run #1 (incident, timeline,
                  history). The recorded-run switch only changes which
                  recorded snapshot is shown; it sends no transaction and
                  changes no live state.
                </li>
                <li>
                  One full loop costs ~0.08–0.11 lREACT (measured, v1
                  3-vault set), ~0.10–0.13 lREACT (v2 4-vault set), and
                  ~0.15 lREACT (v3 5-vault set, measured 0.1514159). Each
                  public watcher&apos;s live balance and loops-left count
                  are shown on the Overview page; each vault holds ~0.001
                  ETH for callback fees.
                </li>
                <li>
                  The v2 public watcher (Lasna) shares its address with the
                  retired v1 vault B on Base Sepolia — same address,
                  different chain. Always read that address together with
                  its chain.
                </li>
              </ul>
            </div>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                Recorded public test runs — cycle 1 and cycle 2 (15 Nov 2026)
              </p>
              <p className='text-sm text-muted-foreground'>
                Both cycles were run from a wallet that is not the owner, trip
                → react → 2 callbacks → contained, each full loop ~2 s. Cycle
                2 used reason TEST-002 and repeated the same pattern. Verify
                every hash on its explorer; all four public contracts are
                Sourcify exact_match (check any address at{' '}
                <code className='font-mono text-xs'>sourcify.dev</code> by
                chain ID + address).
              </p>
              <DocTable>
                <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                    <th className='py-2 pr-4 font-medium'>Step</th>
                    <th className='py-2 pr-4 font-medium'>Chain</th>
                    <th className='py-2 pr-4 font-medium'>Transaction</th>
                    <th className='py-2 font-medium'>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {PUBLIC_E2E_TXS.map((tx) => (
                    <tr key={tx.hash} className='border-b align-top last:border-b-0'>
                      <td className='py-2 pr-4 font-medium'>{tx.step}</td>
                      <td className='py-2 pr-4 whitespace-nowrap'>{tx.chain}</td>
                      <td className='py-2 pr-4'>
                        <ExternalLink href={tx.explorer}>
                          <span className='font-mono text-xs'>{tx.shortHash}</span>
                        </ExternalLink>
                      </td>
                      <td className='py-2 font-mono text-xs whitespace-nowrap tabular-nums'>
                        {tx.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
            </div>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>
                Recorded public v2 runs — E2E v2 + E2E USDC (15 Nov 2026)
              </p>
              <p className='text-sm text-muted-foreground'>
                E2E v2: trip Uni #0{' '}
                <code className='font-mono text-xs'>
                  0xd7c4c39d385b024bfc43dc6f6425a8e7dc358ea402876e84e668de396cc84a0a
                </code>{' '}
                → three ETH vaults paused, CONTAINED (0.1020317 lREACT).
                E2E USDC: trip the USDC vault{' '}
                <code className='font-mono text-xs'>
                  0xd4f340b468992f6651810de8c6882486c6bd64388d39a96a2e7d54f950389b49
                </code>{' '}
                → all four vaults paused, CONTAINED (0.1278079 lREACT). Both
                runs reopened every vault afterwards. Full step-by-step
                hashes are in the &ldquo;How to verify&rdquo; section
                above.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Architecture and security model</CardTitle>
            <CardDescription>
              How the system stays safe when chains fail, callbacks fail, or
              events arrive late.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>
            <ul className='flex flex-col gap-3'>
              {SECURITY_POINTS.map((point) => (
                <li key={point.title} className='flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0'>
                  <span className='flex items-center gap-2 text-sm font-medium'>
                    <Icons.lock className='size-4 shrink-0 text-primary' />
                    {point.title}
                  </span>
                  <span className='text-sm text-muted-foreground'>{point.text}</span>
                </li>
              ))}
            </ul>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-medium'>Known limitations</p>
              <ul className='flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground'>
                {LIMITATIONS.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
            <p className='text-sm text-muted-foreground'>
              Stack: Solidity 0.8.29, Foundry, reactive-lib-omni v0.1.0,
              OpenZeppelin v5 (Pausable, Ownable). Callback gas limit 200,000
              per callback; react() gas limit 900,000.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
            <CardDescription>
              Source code, the live site, and the explorers used above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className='flex flex-col gap-2 text-sm'>
              <li>
                <Link href='/faq' className='text-primary underline-offset-4 hover:underline'>
                  Frequently asked questions
                </Link>
              </li>
              <li>
                <ExternalLink href='https://github.com/0xward/contagion-stop'>
                  GitHub repository
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href='https://contagion-stop.vercel.app'>
                  Live site
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href='https://sepolia.basescan.org'>
                  Base Sepolia explorer (BaseScan)
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href='https://sepolia.uniscan.xyz'>
                  Unichain Sepolia explorer (Uniscan)
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href='https://lasna.reactscan.net'>
                  Lasna explorer (Reactscan)
                </ExternalLink>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
