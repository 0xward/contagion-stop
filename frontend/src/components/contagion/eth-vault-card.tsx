'use client';

import { useEffect, useRef, useState } from 'react';
import { parseEther, type Address } from 'viem';
import { useAccount, useChainId, useWriteContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { EXPLORERS, WATCHER_V2 } from '@/lib/config';
import { SIBLING_VAULT_ABI } from '@/lib/contracts';
import { useLiveVaultEth } from '@/hooks/use-live-vault-eth';
import { AssetLogo } from '@/components/contagion/asset-logo';
import ChainSwitchError from '@/components/web3/chain-switch-error';
import {
  failureOrNull,
  useChainSwitcher,
  type SwitchChainFailure
} from '@/lib/switch-chain';
import { cn } from '@/lib/utils';

export interface EthVaultCardProps {
  /** Vault label, e.g. "ETH Vault v2 — Unichain Sepolia". */
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
 * One v2 ETH vault card (ContagionVault, shares ERC-20, ETH-native).
 *
 * Status is always icon + text label, never color alone. totalAssets(),
 * the vault's ETH balance, totalSupply(), the connected wallet's share
 * balance, paused(), and the watcher-v2 registration are all read LIVE
 * via wagmi; when a read has not resolved (or the RPC refuses it) the
 * card says READ FAILED instead of showing a stale value as live, and
 * each value shows "—" until its own read resolves.
 *
 * Deposit: deposit() is payable and takes no arguments — the ETH sent
 * with the call is the deposit. It reverts while paused
 * (EnforcedPause); the button is disabled then, with the reason
 * stated. The write is pinned to the vault's chain; on the wrong
 * chain the form offers the manual switch instead of auto-switching.
 */
export function EthVaultCard({
  label,
  address,
  chainId,
  chainName,
  explorerUrl
}: EthVaultCardProps) {
  const live = useLiveVaultEth(address, chainId);
  const isPaused = live.isLive ? live.paused === true : false;

  const { address: wallet, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const { switchToChain, isSwitching } = useChainSwitcher();
  const [switchError, setSwitchError] = useState<SwitchChainFailure | null>(null);
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('0.001');
  const onWrongChain = isConnected && connectedChainId !== chainId;

  async function handleSwitch() {
    const result = await switchToChain(chainId);
    setSwitchError(failureOrNull(result));
  }

  let amountRaw: bigint | null = null;
  let amountError: string | null = null;
  try {
    amountRaw = parseEther(amount.trim() === '' ? '0' : amount.trim());
    if (amountRaw <= BigInt(0)) {
      amountError = 'Amount must be greater than 0.';
    } else if (
      live.minDepositEth !== undefined &&
      amountRaw < parseEther(live.minDepositEth)
    ) {
      amountError = `Below the vault min deposit (${live.minDepositEth} ETH).`;
    }
  } catch {
    amountError = 'Amount is not a valid ETH amount.';
  }

  const deposit = useWriteContract();
  const depositReportedRef = useRef<`0x${string}` | null>(null);
  useEffect(() => {
    if (!deposit.isSuccess || !deposit.data || depositReportedRef.current === deposit.data) return;
    depositReportedRef.current = deposit.data;
    void queryClient.invalidateQueries();
    live.refetch();
  }, [deposit.isSuccess, deposit.data, queryClient, live]);

  function handleDeposit() {
    if (!amountRaw) return;
    deposit.writeContract({
      address,
      abi: SIBLING_VAULT_ABI,
      functionName: 'deposit',
      value: amountRaw,
      chainId
    });
  }

  return (
    <Card className={cn(isPaused && 'border-primary')}>
      <CardHeader className='pb-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <AssetLogo asset='ETH' />
          <CardTitle className='text-base'>{label}</CardTitle>
          <Badge variant='outline' className='border-primary/40 text-primary'>
            ETH · ERC-20 SHARES
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
            {live.totalAssetsEth !== undefined ? `${live.totalAssetsEth} ETH` : '—'}
          </span>
        </div>
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>ETH in vault (live)</span>
          <span className='font-mono tabular-nums'>
            {live.ethBalanceEth !== undefined ? `${live.ethBalanceEth} ETH` : '—'}
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
            {live.minDepositEth !== undefined ? `${live.minDepositEth} ETH` : '—'}
          </span>
        </div>

        {/* Watcher registration */}
        <div className='flex items-center justify-between gap-2 border-t pt-3 text-xs'>
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

        {/* Deposit — payable deposit(), pinned to the vault's chain. */}
        <div className='flex flex-col gap-2 border-t pt-3'>
          <Label htmlFor={`deposit-eth-${chainId}-${address.slice(2, 8)}`}>
            Deposit ETH — mints shares (totalAssets updates)
          </Label>
          <div className='flex flex-wrap items-center gap-2'>
            <Input
              id={`deposit-eth-${chainId}-${address.slice(2, 8)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value.trim())}
              placeholder='0.001'
              inputMode='decimal'
              className='w-32 font-mono'
            />
            <span className='text-xs text-muted-foreground'>ETH</span>
            <span className='font-mono text-xs tabular-nums'>
              {wallet ? `Wallet: ${truncateAddress(wallet)}` : 'Connect a wallet to deposit'}
            </span>
          </div>
          {amountError ? (
            <p className='text-xs text-foreground' role='alert'>
              {amountError}
            </p>
          ) : null}
          {onWrongChain ? (
            <div className='flex flex-col gap-2 rounded-none border border-foreground/40 bg-muted p-2 text-xs'>
              <span>
                Your wallet is on a different chain. Switch to {chainName} to
                deposit into this vault.
              </span>
              <Button
                variant='outline'
                size='sm'
                disabled={isSwitching}
                onClick={() => void handleSwitch()}
              >
                Switch to {chainName}
              </Button>
              {switchError ? (
                <ChainSwitchError
                  failure={switchError}
                  onDismiss={() => setSwitchError(null)}
                />
              ) : null}
            </div>
          ) : null}
          {isPaused ? (
            <p className='text-xs text-muted-foreground'>
              Deposit is disabled while paused — it would revert
              (EnforcedPause). That revert is the freeze proof; reopen first
              to deposit again.
            </p>
          ) : null}
          <div>
            <Button
              variant='default'
              size='sm'
              disabled={
                !isConnected || onWrongChain || isPaused || amountRaw === null || amountError !== null || deposit.isPending
              }
              onClick={handleDeposit}
              title={
                !isConnected
                  ? 'Connect a wallet to deposit'
                  : isPaused
                    ? 'Deposit reverts while paused'
                    : 'Deposit ETH and receive shares'
              }
            >
              {deposit.isPending ? (
                <Icons.spinner className='size-3.5 animate-spin' />
              ) : (
                <Icons.add className='size-3.5' />
              )}
              Deposit ETH
            </Button>
          </div>
          {deposit.isError ? (
            <p className='text-xs text-foreground' role='alert'>
              Error: deposit failed — {deposit.error?.message ?? 'unknown error'}
            </p>
          ) : null}
          {deposit.isSuccess && deposit.data ? (
            <p className='text-xs'>
              <a
                href={`${EXPLORERS[chainId].url}/tx/${deposit.data}`}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-1 font-mono break-all text-primary underline underline-offset-2 hover:underline'
              >
                Deposit confirmed — {deposit.data.slice(0, 10)}…{deposit.data.slice(-4)}
                <Icons.externalLink className='size-3 shrink-0' />
              </a>
              <span className='text-muted-foreground'>
                {' '}
                — shares minted, totalAssets updated. Live values above
                re-read from chain.
              </span>
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
