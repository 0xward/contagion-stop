'use client';

import { useState } from 'react';
import type { Address } from 'viem';
import { useReadContract } from 'wagmi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import { SIBLING_VAULT_ABI } from '@/lib/contracts';
import type { Sibling, SiblingId } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  DepositTestButton,
  EmergencyPauseDialog,
  UnpauseDialog
} from '@/components/contagion/action-dialogs';
import { formatTimestamp } from '@/components/contagion/hero-status';

export interface SiblingCardProps {
  sibling: Sibling;
  /** `false` = mock simulation, `true` = real contract calls. */
  live: boolean;
  /** Connected wallet address (undefined when disconnected). */
  connectedAddress?: Address;
  /** Mock mode: parent applies the TRIPPED state for this reason. */
  onMockEmergencyPause: (reasonHex: `0x${string}`) => void;
  /** Mock mode: parent marks this vault ACTIVE. */
  onMockUnpause: (siblingId: SiblingId) => void;
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
 * it does not exist in the ABI); in mock mode the numbers come from
 * mock-data.ts. Balance is `eth_getBalance` in live mode.
 */
export function SiblingCard({
  sibling,
  live,
  connectedAddress,
  onMockEmergencyPause,
  onMockUnpause
}: SiblingCardProps) {
  // Live mode only: compare the on-chain owner with the connected wallet.
  // Mock mode: any connected wallet acts as the demo owner.
  const { data: owner } = useReadContract({
    address: sibling.address as Address,
    abi: SIBLING_VAULT_ABI,
    functionName: 'owner',
    query: { enabled: live }
  });
  const isOwner = live
    ? owner !== undefined &&
      connectedAddress !== undefined &&
      owner.toLowerCase() === connectedAddress.toLowerCase()
    : connectedAddress !== undefined;

  const isPaused = sibling.status === 'PAUSED';
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
          <CardTitle className='text-base'>{sibling.label}</CardTitle>
          {isOrigin ? <Badge variant='default'>ORIGIN</Badge> : null}
          <Badge
            variant='outline'
            className={cn(
              'ml-auto',
              isPaused
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-foreground/30 bg-muted text-foreground'
            )}
          >
            {isPaused ? (
              <>
                <Icons.pause className='mr-1 size-3' />
                PAUSED
              </>
            ) : (
              <>
                <span className='mr-1.5 inline-block size-2 rounded-full bg-success' aria-hidden />
                ACTIVE
              </>
            )}
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
          {sibling.isMock ? (
            <Badge variant='outline' className='border-primary/40 text-primary ml-auto'>
              RECORDED
            </Badge>
          ) : null}
        </div>

        {/* Paused time */}
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Paused at</span>
          <span className='font-mono tabular-nums'>
            {sibling.pausedAt != null ? formatTimestamp(sibling.pausedAt) : '—'}
          </span>
        </div>

        {/* Balance / deposits */}
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Balance</span>
          <span className='font-mono tabular-nums'>{sibling.balanceEth} ETH</span>
        </div>
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Total deposited</span>
          <span className='font-mono tabular-nums'>{sibling.totalDepositedEth} ETH</span>
        </div>

        {/* Reserves vs debt */}
        <div className='flex flex-col gap-1.5'>
          <div className='flex justify-between gap-2 text-xs'>
            <span className='text-muted-foreground'>Reserves vs debt</span>
            <span className='font-mono tabular-nums'>
              {sibling.reservesEth} / {sibling.debtEth} ETH
            </span>
          </div>
          <Progress value={reservesPct} aria-label='Reserves share of reserves plus debt' />
        </div>

        {debt > 0 ? (
          <div
            className='flex items-start gap-2 rounded-lg border border-foreground/40 bg-muted p-2 text-xs text-foreground'
            role='alert'
          >
            <Icons.warning className='mt-0.5 size-3.5 shrink-0' />
            <span>
              Reserves low / debt &gt; 0 — execution may stall. Run coverDebt()
              before the demo.
            </span>
          </div>
        ) : null}

        {/* Actions */}
        <div className='flex flex-col gap-2 border-t pt-3'>
          {isOrigin ? (
            <EmergencyPauseDialog
              sibling={sibling}
              isOwner={isOwner}
              live={live}
              onMockConfirm={onMockEmergencyPause}
            />
          ) : null}
          <UnpauseDialog
            sibling={sibling}
            isOwner={isOwner}
            live={live}
            onMockConfirm={onMockUnpause}
          />
          <DepositTestButton sibling={sibling} live={live} />
        </div>
      </CardContent>
    </Card>
  );
}
