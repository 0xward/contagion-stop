'use client';

import { wagmiConfig } from '@/lib/wagmi';
import { WagmiProvider } from 'wagmi';
import type * as React from 'react';

/**
 * Web3 provider for ContagionStop: wagmi (3 chains) + Reown AppKit.
 * The AppKit instance is created in `src/lib/wagmi.ts` (outside any
 * component). QueryClientProvider is mounted above this component by
 * `src/components/layout/query-provider.tsx` (required by wagmi).
 */
export default function Web3Provider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
