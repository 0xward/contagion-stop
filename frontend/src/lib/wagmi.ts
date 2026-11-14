import { http, createConfig } from 'wagmi';
import { baseSepolia, unichainSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { defineChain } from 'viem';

/**
 * Lasna — Reactive testnet (chain ID 5318007).
 * Chain kustom: tidak ada di viem/chains, didaftarkan manual.
 * RPC + explorer sesuai DEPLOY-PLAN.md.
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

/** Urutan chain: origin (Unichain Sepolia) dulu, lalu Base Sepolia, lalu Lasna (watcher). */
export const chains = [unichainSepolia, baseSepolia, lasna] as const;

/** Warna dot per chain — Nous Blue (restyle 15 Nov 2026): semua chain
 * memakai dot biru #0000f2 yang sama; chain dibedakan lewat teks, bukan
 * warna. Helper dipertahankan agar pemakaian lama tidak pecah. */
export const CHAIN_DOT_COLOR: Record<number, string> = {
  [unichainSepolia.id]: '#0000f2',
  [baseSepolia.id]: '#0000f2',
  [lasna.id]: '#0000f2'
};

export function getChainName(chainId: number): string {
  const chain = chains.find((c) => c.id === chainId);
  return chain?.name ?? `Chain ${chainId}`;
}

export function getChainDotColor(chainId: number): string {
  return CHAIN_DOT_COLOR[chainId] ?? '#0000f2';
}

/**
 * wagmi v2 config. Two connectors: injected (browser extension wallets)
 * and WalletConnect (mobile wallets via QR, Reown project ID below).
 * The project ID comes from NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID when set
 * (Vercel env var); the built-in fallback keeps WalletConnect working in
 * builds without the env var. The ID is a public client identifier, not
 * a secret.
 */
export const wagmiConfig = createConfig({
  chains: [unichainSepolia, baseSepolia, lasna],
  connectors: [
    injected(),
    walletConnect({
      projectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
        'ea5f0fd20b26896045774900b7294b1a'
    })
  ],
  transports: {
    [unichainSepolia.id]: http(),
    [baseSepolia.id]: http(),
    [lasna.id]: http()
  },
  ssr: true
});
