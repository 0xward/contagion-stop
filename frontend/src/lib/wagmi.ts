import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { createAppKit } from '@reown/appkit/react';
import { baseSepolia, unichainSepolia } from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit-common';
import { http } from 'wagmi';
import { defineChain } from 'viem';

/**
 * Lasna — Reactive testnet (chain ID 5318007).
 * Custom chain: not in viem/chains, registered manually as a viem chain
 * object. AppKit accepts plain viem chains as networks (BaseNetwork).
 * RPC + explorer per DEPLOY-PLAN.md.
 */
export const lasna = defineChain({
  id: 5318007,
  name: 'Lasna',
  nativeCurrency: { name: 'REACT', symbol: 'REACT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://lasna-rpc.rnk.dev/'] }
  },
  blockExplorers: {
    default: { name: 'Reactscan', url: 'https://lasna.reactscan.net/' }
  },
  testnet: true
});

/** Chain order: origin (Unichain Sepolia) first, then Base Sepolia, then Lasna (watcher). */
export const chains: [AppKitNetwork, ...AppKitNetwork[]] = [
  unichainSepolia,
  baseSepolia,
  lasna
];

/** Dot color per chain — Win98 navy: all chains share the same
 * navy dot #000080; chains are told apart by text, not color.
 * Helper kept so existing usages do not break. */
export const CHAIN_DOT_COLOR: Record<number, string> = {
  [unichainSepolia.id]: '#000080',
  [baseSepolia.id]: '#000080',
  [lasna.id]: '#000080'
};

export function getChainName(chainId: number): string {
  const chain = chains.find((c) => c.id === chainId);
  return chain?.name ?? `Chain ${chainId}`;
}

export function getChainDotColor(chainId: number): string {
  return CHAIN_DOT_COLOR[chainId] ?? '#000080';
}

/**
 * Reown project ID. From NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID when set
 * (Vercel env var); the built-in fallback keeps WalletConnect working in
 * builds without the env var. The ID is a public client identifier, not
 * a secret.
 */
export const projectId: string =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  'ea5f0fd20b26896045774900b7294b1a';

/**
 * App metadata. The URL must match the deployed origin, per Reown docs
 * ("origin must match your domain & subdomain").
 */
export const metadata = {
  name: 'ContagionStop',
  description: 'Cross-chain circuit breaker for DeFi vaults on Reactive Network.',
  url: 'https://contagion-stop.vercel.app',
  icons: ['https://contagion-stop.vercel.app/favicon.ico']
};

/**
 * Wagmi adapter (Reown AppKit). Own transports per chain keep reads on our
 * RPC endpoints instead of the shared WalletConnect relay RPC. `ssr: true`
 * keeps the config safe to import from client components during prerender.
 * The adapter registers the WalletConnect, Coinbase and injected
 * connectors automatically — no manual connector list.
 */
export const wagmiAdapter = new WagmiAdapter({
  networks: chains,
  projectId,
  ssr: true,
  transports: {
    [unichainSepolia.id]: http(),
    [baseSepolia.id]: http(),
    [lasna.id]: http()
  }
});

/** wagmi config from the AppKit adapter — consumed by Web3Provider. */
export const wagmiConfig = wagmiAdapter.wagmiConfig;

/**
 * Reown AppKit instance. Called once at module scope, outside any React
 * component, per Reown docs. The modal is opened from the header via the
 * `useAppKit().open()` hook. Light theme + navy accent match the site's
 * Windows 98 palette. AppKit stays fully compatible with wagmi hooks
 * (useAccount, useReadContract, useWriteContract).
 */
createAppKit({
  adapters: [wagmiAdapter],
  networks: chains,
  metadata,
  projectId,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#000080'
  }
});
