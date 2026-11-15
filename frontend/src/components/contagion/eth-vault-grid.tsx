'use client';

import { EXPLORERS, V2_ETH_VAULTS } from '@/lib/config';
import { EthVaultCard } from '@/components/contagion/eth-vault-card';

/**
 * Grid of the two v2 ETH vaults (Unichain Sepolia + Base Sepolia) —
 * live reads, shown next to the USDC vaults, never replacing the main
 * deployment. Both vaults hold 0.003 ETH totalAssets (15 Nov 2026:
 * 0.001 ETH seed + 0.002 ETH deposits in the recorded v2 loop); the
 * cards show the live totalAssets and offer a payable deposit().
 */
export function EthVaultGrid() {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      {([V2_ETH_VAULTS.unichain, V2_ETH_VAULTS.base] as const).map(
        (vault) => (
          <EthVaultCard
            key={vault.address}
            label={`ETH Vault v2 — ${vault.chainName}`}
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
