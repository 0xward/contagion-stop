'use client';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { DeployOwnVault } from '@/components/contagion/deploy-own-vault';

/**
 * Deploy your own vault — onboarding through the deployed factories.
 * No new contracts are deployed by this page itself: it calls
 * createVault on VaultFactory (ETH) or VaultFactoryERC20 (USDC) on the
 * chain the user picks, then guides registration in watcher v2 and
 * funding. Every button sends a real transaction or is disabled with
 * a stated reason.
 */
export default function DeployPage() {
  return (
    <PageContainer
      pageTitle='Deploy your own vault'
      pageDescription='Create a ContagionStop vault from the deployed factories — pick a chain and an asset, check the predicted address, then send createVault.'
      pageHeaderAction={
        <Badge variant='outline' className='border-primary/40 text-primary'>
          <Icons.add className='mr-1 size-3.5' />
          FACTORY ONBOARDING — TESTNET
        </Badge>
      }
    >
      <div className='flex flex-1 flex-col gap-4'>
        <DeployOwnVault />
      </div>
    </PageContainer>
  );
}
