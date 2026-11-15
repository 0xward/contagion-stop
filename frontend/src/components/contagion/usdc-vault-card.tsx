'use client';

import { useState } from 'react';
import type { Address } from 'viem';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { EXPLORERS, USDC_ADDRESSES, WATCHER_V2 } from '@/lib/config';
import { useLiveVaultErc20 } from '@/hooks/use-live-vault-erc20';
import { AssetLogo } from '@/components/contagion/asset-logo';
import { cn } from '@/lib/utils';

export interface UsdcVaultCardProps {
  /** Vault label, e.g. "USDC Vault — Unichain Sepolia". */
  label: string;
  /** Vault (clone) address. */
  address: Address;
  chainId: number;
  chainName: string;
  /** Explorer base URL for the vault chain. */
  explorerUrl: string;
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
 * One v2 USDC vault card (ContagionVaultERC20, shares ERC-20, asset USDC).
 *
 * Status is always icon + text label, never color alone. totalAssets(),
 * the vault's USDC balance, totalSupply(), the connected wallet's share
 * balance, paused(), and the watcher-v2 registration are all read LIVE
 * via wagmi; when a read has not resolved (or the RPC refuses it) the
 * card says READ FAILED instead of showing a stale value as live.
 * A vault with totalAssets 0 is shown as UNFUNDED — AWAITING FUNDING:
 * the zero is the real on-chain value, not a placeholder.
 */
export function UsdcVaultCard({
  label,
  address,
  chainId,
  chainName,
  explorerUrl
}: UsdcVaultCardProps) {
  const live = useLiveVaultErc20(address, chainId);
  const isPaused = live.isLive ? live.paused === true : false;
  const isUnfunded =
    live.isLive && live.totalAssetsRaw !== undefined && live.totalAssetsRaw === BigInt(0);
  const hasNoEthReserve =
    live.isLive && live.ethBalanceRaw !== undefined && live.ethBalanceRaw === BigInt(0);
  const usdc = USDC_ADDRESSES[chainId];

  return (
    <Card className={cn(isPaused && 'border-primary')}>
      <CardHeader className='pb-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <AssetLogo asset='USDC' />
          <CardTitle className='text-base'>{label}</CardTitle>
          <Badge variant='outline' className='border-primary/40 text-primary'>
            USDC · ERC-20 SHARES
          </Badge>
          <Badge
            variant='outline'
            className={cn(
              'ml-auto',
              isPaused
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-foreground/30 bg-muted text-foreground'
            )}
          >
            {live.isLive ? (
              isPaused ? (
                <>
                  <Icons.pause className='mr-1 size-3' />
                  PAUSED
                </>
              ) : (
                <>
                  <span className='mr-1.5 inline-block size-2 rounded-full bg-success' aria-hidden />
                  ACTIVE
                </>
              )
            ) : (
              <>
                <Icons.clock className='mr-1 size-3' />
                {live.hasFailed ? 'READ FAILED' : 'READING…'}
              </>
            )}
          </Badge>
          <Badge variant='outline' className='border-primary/40 text-primary'>
            {live.isLive ? 'LIVE' : live.hasFailed ? 'READ FAILED' : 'LOADING'}
          </Badge>
        </div>
        <div className='text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs'>
          <span className='inline-block size-2 rounded-full bg-primary' aria-hidden />
          {chainName} · chain {chainId}
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-3 text-sm'>
        {/* Address: truncated monospace + copy + explorer link */}
        <div className='flex items-center gap-1'>
          <span
            className='font-mono text-xs break-all tabular-nums'
            title={address}
          >
            {truncateAddress(address)}
          </span>
          <CopyAddressButton address={address} />
          <a
            href={`${explorerUrl}/address/${address}`}
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 hover:underline'
            title={`View on ${explorerUrl}`}
          >
            Explorer
            <Icons.externalLink className='size-3' />
          </a>
        </div>

        {/* Funding state — the honest label for a zero totalAssets. */}
        {live.isLive && isUnfunded ? (
          <div
            className='flex items-start gap-2 rounded-none border border-foreground/40 bg-muted p-2 text-xs text-foreground'
            role='status'
          >
            <Icons.warning className='mt-0.5 size-3.5 shrink-0' />
            <span>
              UNFUNDED — AWAITING FUNDING. totalAssets is 0 on-chain: no
              deposits have been made yet. Funding is a manual step (see
              Deploy your own → Funding, or the funding guide in Docs).
            </span>
          </div>
        ) : null}

        {live.hasFailed ? (
          <div
            className='flex items-start gap-2 rounded-none border border-foreground/40 bg-muted p-2 text-xs text-foreground'
            role='alert'
          >
            <Icons.alertCircle className='mt-0.5 size-3.5 shrink-0' />
            <span>
              READ FAILED — the live reads did not resolve (RPC unreachable
              or slow). No values are shown as live until the reads succeed.
            </span>
          </div>
        ) : null}

        {/* Live values — shown only once the reads resolved. */}
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Total assets (live)</span>
          <span className='font-mono tabular-nums'>
            {live.totalAssetsUsdc !== undefined ? `${live.totalAssetsUsdc} USDC` : '—'}
          </span>
        </div>
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>USDC in vault (live)</span>
          <span className='font-mono tabular-nums'>
            {live.assetBalanceUsdc !== undefined ? `${live.assetBalanceUsdc} USDC` : '—'}
          </span>
        </div>
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Shares outstanding (live)</span>
          <span className='font-mono tabular-nums'>
            {live.totalSupplyShares !== undefined ? live.totalSupplyShares : '—'}
          </span>
        </div>
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Your shares (live)</span>
          <span className='font-mono tabular-nums'>
            {live.userShares !== undefined ? live.userShares : 'Connect wallet to see your shares'}
          </span>
        </div>
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Share token (live)</span>
          <span className='font-mono tabular-nums'>
            {live.shareName !== undefined && live.shareSymbol !== undefined
              ? `${live.shareName} (${live.shareSymbol})`
              : '—'}
          </span>
        </div>
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Min deposit (live)</span>
          <span className='font-mono tabular-nums'>
            {live.minDepositUsdc !== undefined ? `${live.minDepositUsdc} USDC` : '—'}
          </span>
        </div>

        {/* Asset + watcher registration */}
        <div className='flex items-center justify-between gap-2 border-t pt-3 text-xs'>
          <span className='text-muted-foreground'>Asset</span>
          <a
            href={`${explorerUrl}/address/${usdc}`}
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-1 font-mono text-primary underline underline-offset-2 hover:underline'
            title='USDC token contract'
          >
            USDC {truncateAddress(usdc)}
            <Icons.externalLink className='size-3' />
          </a>
        </div>
        <div className='flex items-center justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Watcher v2 (Lasna)</span>
          <span className='flex items-center gap-2'>
            <a
              href={`${EXPLORERS[WATCHER_V2.chainId].url}/address/${WATCHER_V2.address}`}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-1 font-mono text-primary underline underline-offset-2 hover:underline'
            >
              {truncateAddress(WATCHER_V2.address)}
              <Icons.externalLink className='size-3' />
            </a>
            {live.registered !== undefined ? (
              <Badge variant='outline' className='border-primary/40 text-primary'>
                {live.registered ? 'REGISTERED' : 'NOT REGISTERED'}
              </Badge>
            ) : null}
          </span>
        </div>

        {live.isLive && hasNoEthReserve ? (
          <div
            className='flex items-start gap-2 rounded-none border border-foreground/40 bg-muted p-2 text-xs text-foreground'
            role='status'
          >
            <Icons.info className='mt-0.5 size-3.5 shrink-0' />
            <span>
              No ETH reserve in this vault. The first callback still runs
              (the proxy fronts the fee), but callback debt after that can
              only be covered from ETH held by the vault — see coverDebt in
              Docs before the first live loop.
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
