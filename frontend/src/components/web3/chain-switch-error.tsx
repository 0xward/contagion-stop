'use client';

import ReconnectGuidance from '@/components/web3/reconnect-guidance';
import { getChainName } from '@/lib/wagmi';
import type { SwitchChainFailure } from '@/lib/switch-chain';

/**
 * Guidance shown when a wallet refuses a chain switch — Win98 box, same
 * shape as the other inline notices on the vault cards.
 *
 * The message is deliberately general: a WalletConnect session only
 * carries the chains the wallet approved when the session started, so a
 * switch to any other chain can be refused (some wallets answer by
 * asking the user to disconnect the dApp first). It is not specific to
 * one chain — the failed switch that prompted this was between two
 * standard chains (Unichain Sepolia → Base Sepolia).
 *
 * `purpose="deposit"` is passed by the vault cards, where the switch was
 * attempted so the user can deposit on the target chain.
 */
export default function ChainSwitchError({
  failure,
  purpose,
  onDismiss
}: {
  failure: SwitchChainFailure;
  purpose?: 'deposit';
  onDismiss: () => void;
}) {
  const chainName = getChainName(failure.chainId);
  const notApproved = failure.kind === 'chain-not-approved';
  const fixLine =
    purpose === 'deposit'
      ? 'To deposit on this chain: disconnect this site in your wallet, then connect again from this site and approve all chains offered.'
      : 'To fix it: disconnect this site in your wallet, then connect again from this site and approve all chains offered.';

  return (
    <ReconnectGuidance
      title={`Could not switch to ${chainName}.`}
      onDismiss={onDismiss}
    >
      <p>
        {notApproved
          ? 'Your wallet has not approved this chain in the current session, so it cannot switch to it now.'
          : 'The chain switch failed.'}
      </p>
      <p>{fixLine}</p>
    </ReconnectGuidance>
  );
}
