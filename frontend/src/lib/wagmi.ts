import { http, createConfig } from 'wagmi';
import { baseSepolia, unichainSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
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

/** Warna dot per chain — monokrom (Nous Mono, restyle 14 Nov 2026): semua
 * chain memakai dot hitam yang sama; chain dibedakan lewat teks, bukan warna.
 * Helper dipertahankan agar pemakaian lama tidak pecah. */
export const CHAIN_DOT_COLOR: Record<number, string> = {
  [unichainSepolia.id]: '#0a0a0a',
  [baseSepolia.id]: '#0a0a0a',
  [lasna.id]: '#0a0a0a'
};

export function getChainName(chainId: number): string {
  const chain = chains.find((c) => c.id === chainId);
  return chain?.name ?? `Chain ${chainId}`;
}

export function getChainDotColor(chainId: number): string {
  return CHAIN_DOT_COLOR[chainId] ?? '#0a0a0a';
}

/**
 * wagmi v2 config. Tanpa WalletConnect projectId (tidak ada akun yang dibuat
 * untuk scaffold ini) — konektor injected saja; worker komponen boleh
 * menambahkan WalletConnect bila projectId tersedia.
 */
export const wagmiConfig = createConfig({
  chains: [unichainSepolia, baseSepolia, lasna],
  connectors: [injected()],
  transports: {
    [unichainSepolia.id]: http(),
    [baseSepolia.id]: http(),
    [lasna.id]: http()
  },
  ssr: true
});
