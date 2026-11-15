'use client';

import { EXPLORERS, V2_USDC_VAULTS } from '@/lib/config';
import { UsdcVaultCard } from '@/components/contagion/usdc-vault-card';

/**
 * Grid of the two v2 USDC vaults (Unichain Sepolia + Base Sepolia) —
 * live reads, shown next to the main deployment, never replacing it.
 * Both vaults are funded with 20 USDC each (15 Nov 2026); the cards
 * show the live totalAssets, and show an UNFUNDED banner if a vault
 * ever reads totalAssets 0.
 */
export function UsdcVaultGrid() {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      {([V2_USDC_VAULTS.unichain, V2_USDC_VAULTS.base] as const).map(
        (vault) => (
          <UsdcVaultCard
            key={vault.address}
            label={`USDC Vault — ${vault.chainName}`}
            address={vault.address}
            chainId={vault.chainId}
            chainName={vault.chainName}
            explorerUrl={EXPLORERS[vault.chainId].url}
          />
        )
      )}
    </div>
  );
}
