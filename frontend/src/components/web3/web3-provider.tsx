'use client';

import { wagmiConfig } from '@/lib/wagmi';
import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import type * as React from 'react';

/**
 * Provider Web3 ContagionStop: wagmi (3 chain) + RainbowKit.
 * QueryClientProvider sudah dipasang di atas komponen ini oleh
 * `src/components/layout/query-provider.tsx` (wagmi membutuhkannya).
 * Tema RainbowKit diselaraskan ke palette Nous Mono (terang, aksen hitam).
 */
export default function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider
        theme={lightTheme({
          accentColor: '#0A0A0A',
          accentColorForeground: '#FAFAF9',
          borderRadius: 'none',
          fontStack: 'system'
        })}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
