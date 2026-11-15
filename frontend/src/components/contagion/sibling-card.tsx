'use client';

import { useState } from 'react';
import type { Address } from 'viem';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import { SIBLING_VAULT_ABI } from '@/lib/contracts';
import type { Sibling } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLiveVault } from '@/hooks/use-live-vault';
import { AssetLogo } from '@/components/contagion/asset-logo';
import ChainSwitchError from '@/components/web3/chain-switch-error';
import {
  failureOrNull,
  useChainSwitcher,
  type SwitchChainFailure
} from '@/lib/switch-chain';
import {
  DepositTestButton,
  EmergencyPauseDialog,
  UnpauseDialog
} from '@/components/contagion/action-dialogs';
import { formatTimestamp } from '@/components/contagion/hero-status';

export interface SiblingCardProps {
  sibling: Sibling;
  /** Connected wallet address (undefined when disconnected). */
  connectedAddress?: Address;
  /** Called with the reason bytes32 + tx hash when a real emergencyPause confirms. */
  onEmergencyPauseSuccess?: (reasonHex: `0x${string}`, hash: `0x${string}`) => void;
}

function truncateAddress(address: string): string {
  return address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}

function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — link still works.
      setCopied(false);
    }
  }

  return (
    <Button
      variant='ghost'
      size='icon-xs'
      onClick={handleCopy}
      title='Copy address'
      aria-label='Copy contract address'
    >
      {copied ? (
        <Icons.check className='size-3.5 text-foreground' />
      ) : (
        <Icons.copy className='size-3.5' />
      )}
    </Button>
  );
}

/**
 * One sibling vault card (ux-ui-notes §3).
 *
 * Status is always icon + text label, never color alone. Origin vault A is
 * distinguished with an ORIGIN label + blue border. Debt is read from the
 * Lasna system contract / callback proxy (never `debt()` on the vault —
 * it does not exist in the ABI). Balance, totalDeposited, and paused()
 * are read LIVE via wagmi; until the reads resolve the card shows "—"
 * and a LOADING label — a recorded value is never shown as live (the
 * recorded snapshot lives in the incident/timeline sections, labelled
 * RECORDED there). Writes are pinned to the vault's chain (chainId) so
 * a wallet on the wrong chain cannot send them to the wrong network;
 * the banner below offers the manual switch instead.
 */
export function SiblingCard({
  sibling,
  connectedAddress,
  onEmergencyPauseSuccess
}: SiblingCardProps) {
  // Live: compare the on-chain owner with the connected wallet.
  const { data: owner } = useReadContract({
    address: sibling.address as Address,
    abi: SIBLING_VAULT_ABI,
    functionName: 'owner',
    chainId: sibling.chainId
  });
  const isOwner =
    owner !== undefined &&
    connectedAddress !== undefined &&
    owner.toLowerCase() === connectedAddress.toLowerCase();

  // Wrong-chain guard (same pattern as PublicVaultCard): writes are
  // pinned to this vault's chain, and the banner offers the manual
  // switch — the app never auto-switches chains.
  const { isConnected } = useAccount();
  const connectedChainId = useChainId();
  const { switchToChain, isSwitching } = useChainSwitcher();
  const [switchError, setSwitchError] = useState<SwitchChainFailure | null>(null);
  const onWrongChain = isConnected && connectedChainId !== sibling.chainId;

  async function handleSwitch() {
    const result = await switchToChain(sibling.chainId);
    setSwitchError(failureOrNull(result));
  }

  // Live: paused() + eth_getBalance + totalDeposited(). A value is
  // shown only once its own read resolved; until then it is "—".
  // NOTE: useLiveVault's isLive only requires paused() — balance and
  // totalDeposited get their own defined-check here so a recorded
  // snapshot value is never labelled LIVE.
  const live = useLiveVault(sibling.address as Address, sibling.chainId);
  const isPaused = live.isLive ? live.paused === true : undefined;
  const balanceEth = live.balanceEth;
  const totalDepositedEth = live.totalDepositedEth;
  const valuesAreLive =
    live.isLive && balanceEth !== undefined && totalDepositedEth !== undefined;

  const isOrigin = sibling.role === 'ORIGIN';
  const reserves = Number.parseFloat(sibling.reservesEth) || 0;
  const debt = Number.parseFloat(sibling.debtEth) || 0;
  const reservesTotal = reserves + debt;
  const reservesPct = reservesTotal > 0 ? (reserves / reservesTotal) * 100 : 100;

  return (
    <Card
      className={cn(
        isPaused && 'border-primary',
        !isPaused && isOrigin && 'border-foreground'
      )}
    >
      <CardHeader className='pb-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <AssetLogo asset='ETH' />
          <CardTitle className='text-base'>{sibling.label}</CardTitle>
          {isOrigin ? <Badge variant='default'>ORIGIN</Badge> : null}
          <Badge
            variant='outline'
            className={cn(
              'ml-auto',
              isPaused === true
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-foreground/30 bg-muted text-foreground'
            )}
          >
            {isPaused === true ? (
              <>
                <Icons.pause className='mr-1 size-3' />
                PAUSED
              </>
            ) : isPaused === false ? (
              <>
                <span className='mr-1.5 inline-block size-2 rounded-full bg-success' aria-hidden />
                ACTIVE
              </>
            ) : live.hasFailed ? (
              'STATE UNKNOWN'
            ) : (
              'STATE LOADING…'
            )}
          </Badge>
          <Badge variant='outline' className='border-primary/40 text-primary'>
            {valuesAreLive ? 'LIVE' : live.hasFailed ? 'READ FAILED' : 'LOADING…'}
          </Badge>
        </div>
        <div className='text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs'>
          <span className='inline-block size-2 rounded-full bg-primary' aria-hidden />
          {sibling.chainName} · chain {sibling.chainId}
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-3 text-sm'>
        {/* Address: truncated monospace + copy + explorer link */}
        <div className='flex items-center gap-1'>
          <span
            className='font-mono text-xs break-all tabular-nums'
            title={sibling.address}
          >
            {truncateAddress(sibling.address)}
          </span>
          <CopyAddressButton address={sibling.address} />
          <a
            href={`${sibling.explorerUrl}/address/${sibling.address}`}
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-0.5 text-xs text-primary underline underline-offset-2 hover:underline'
            title={`View on ${sibling.explorerUrl}`}
          >
            Explorer
            <Icons.externalLink className='size-3' />
          </a>
        </div>

        {/* Paused time (recorded run #1 — the live read has no timestamp). */}
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Paused at (recorded run #1)</span>
          <span className='font-mono tabular-nums'>
            {sibling.pausedAt != null ? formatTimestamp(sibling.pausedAt) : '—'}
          </span>
        </div>

        {/* Balance / deposits — live only; "—" until each read resolves. */}
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Balance (live)</span>
          <span className='font-mono tabular-nums'>
            {balanceEth !== undefined ? `${balanceEth} ETH` : '—'}
          </span>
        </div>
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Total deposited (live)</span>
          <span className='font-mono tabular-nums'>
            {totalDepositedEth !== undefined ? `${totalDepositedEth} ETH` : '—'}
          </span>
        </div>

        {live.hasFailed ? (
          <p className='rounded-none border border-foreground/40 bg-muted p-2 text-xs' role='status'>
            Live reads failed in this browser — the chain RPCs could not be
            reached. The contracts are still usable: verify state on the
            explorer link above, or try again. Sending a transaction still
            works when your wallet can reach its own RPC.
          </p>
        ) : null}

        {onWrongChain ? (
          <div className='flex flex-col gap-2 rounded-none border border-foreground/40 bg-muted p-2 text-xs'>
            <span>
              Your wallet is on a different chain. Switch to {sibling.chainName} to
              send transactions to this vault.
            </span>
            <Button
              variant='outline'
              size='sm'
              disabled={isSwitching}
              onClick={() => void handleSwitch()}
            >
              Switch to {sibling.chainName}
            </Button>
            {switchError ? (
              <ChainSwitchError
                failure={switchError}
                purpose='deposit'
                onDismiss={() => setSwitchError(null)}
              />
            ) : null}
          </div>
        ) : null}

        {/* Reserves vs debt — recorded snapshot (see Funding health). */}
        <div className='flex flex-col gap-1.5'>
          <div className='flex justify-between gap-2 text-xs'>
            <span className='text-muted-foreground'>Reserves vs debt (recorded)</span>
            <span className='font-mono tabular-nums'>
              {sibling.reservesEth} / {sibling.debtEth} ETH
            </span>
          </div>
          <Progress value={reservesPct} aria-label='Reserves share of reserves plus debt' />
        </div>

        {debt > 0 ? (
          <div
            className='flex items-start gap-2 rounded-none border border-foreground/40 bg-muted p-2 text-xs text-foreground'
            role='alert'
          >
            <Icons.warning className='mt-0.5 size-3.5 shrink-0' />
            <span>
              Reserves low / debt &gt; 0 — execution may stall. Run coverDebt()
              before the next trip.
            </span>
          </div>
        ) : null}

        {/* Actions */}
        <div className='flex flex-col gap-2 border-t pt-3'>
          {isOrigin ? (
            <EmergencyPauseDialog
              sibling={sibling}
              isOwner={isOwner}
              onConfirmed={(hash, reasonHex) => onEmergencyPauseSuccess?.(reasonHex, hash)}
            />
          ) : null}
          <UnpauseDialog sibling={sibling} isOwner={isOwner} />
          <DepositTestButton sibling={sibling} disabled={onWrongChain} />
        </div>
      </CardContent>
    </Card>
  );
}
