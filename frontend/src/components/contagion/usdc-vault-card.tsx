'use client';

import { useEffect, useRef, useState } from 'react';
import { formatUnits, parseUnits, type Address } from 'viem';
import { useAccount, useChainId, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { EXPLORERS, USDC_ADDRESSES, WATCHER_V2 } from '@/lib/config';
import { ERC20_ABI, ERC20_VAULT_ABI } from '@/lib/contracts';
import { useLiveVaultErc20 } from '@/hooks/use-live-vault-erc20';
import { AssetLogo } from '@/components/contagion/asset-logo';
import { cn } from '@/lib/utils';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

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
 * Deposit USDC into this vault: approve + deposit.
 *
 * Flow: the wallet's USDC balance and the vault's allowance are read
 * live. If the allowance is below the amount, Approve runs first
 * (approve(vault, amount) on the USDC contract); Deposit then calls
 * deposit(amount, wallet) on the vault, which mints shares and updates
 * totalAssets. A plain USDC transfer does NOT update totalAssets, so
 * there is deliberately no "send USDC" shortcut here. Both writes are
 * pinned to the vault's chain; on the wrong chain the form offers the
 * manual switch instead of auto-switching. A deposit reverts while the
 * vault is paused (EnforcedPause) — the button is disabled then, with
 * the reason stated.
 */
function DepositUsdcForm({
  vault,
  chainId,
  chainName,
  minDepositUsdc,
  isPaused,
  onDeposited
}: {
  vault: Address;
  chainId: number;
  chainName: string;
  minDepositUsdc?: string;
  isPaused: boolean;
  onDeposited?: () => void;
}) {
  const { address: wallet, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('1');
  const usdc = USDC_ADDRESSES[chainId];
  const onWrongChain = isConnected && connectedChainId !== chainId;

  let amountRaw: bigint | null = null;
  let amountError: string | null = null;
  try {
    amountRaw = parseUnits(amount.trim() === '' ? '0' : amount.trim(), 6);
    if (amountRaw <= BigInt(0)) {
      amountError = 'Amount must be greater than 0.';
    } else if (
      minDepositUsdc !== undefined &&
      amountRaw < parseUnits(minDepositUsdc, 6)
    ) {
      amountError = `Below the vault min deposit (${minDepositUsdc} USDC).`;
    }
  } catch {
    amountError = 'Amount is not a valid USDC amount.';
  }

  const { data: walletBalance } = useReadContract({
    address: usdc,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [wallet ?? ZERO_ADDRESS],
    chainId,
    query: { enabled: isConnected, refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const { data: allowance } = useReadContract({
    address: usdc,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [wallet ?? ZERO_ADDRESS, vault],
    chainId,
    query: { enabled: isConnected, refetchInterval: 15_000, retry: 1, retryDelay: 1000 }
  });

  const approve = useWriteContract();
  const deposit = useWriteContract();

  // After an approve confirms, re-read the allowance (and the wallet
  // balance) so the Deposit button enables without a manual refresh.
  // Guarded per tx hash so the invalidation runs exactly once.
  const approveReportedRef = useRef<`0x${string}` | null>(null);
  useEffect(() => {
    if (!approve.isSuccess || !approve.data || approveReportedRef.current === approve.data) return;
    approveReportedRef.current = approve.data;
    void queryClient.invalidateQueries();
  }, [approve.isSuccess, approve.data, queryClient]);
  const depositReportedRef = useRef<`0x${string}` | null>(null);
  useEffect(() => {
    if (!deposit.isSuccess || !deposit.data || depositReportedRef.current === deposit.data) return;
    depositReportedRef.current = deposit.data;
    void queryClient.invalidateQueries();
    onDeposited?.();
  }, [deposit.isSuccess, deposit.data, queryClient, onDeposited]);

  const insufficient =
    amountRaw !== null && walletBalance !== undefined && amountRaw > walletBalance;
  const needsApprove =
    amountRaw !== null && (allowance === undefined || allowance < amountRaw);
  const canDeposit =
    isConnected &&
    !onWrongChain &&
    !isPaused &&
    amountRaw !== null &&
    amountError === null &&
    !insufficient &&
    !needsApprove;

  function handleApprove() {
    if (!amountRaw) return;
    approve.writeContract({
      address: usdc,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [vault, amountRaw],
      chainId
    });
  }

  function handleDeposit() {
    if (!amountRaw || !wallet) return;
    deposit.writeContract({
      address: vault,
      abi: ERC20_VAULT_ABI,
      functionName: 'deposit',
      args: [amountRaw, wallet],
      chainId
    });
  }

  return (
    <div className='flex flex-col gap-2'>
      <Label htmlFor={`deposit-usdc-${chainId}-${vault.slice(2, 8)}`}>
        Deposit USDC — mints shares (totalAssets updates)
      </Label>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          id={`deposit-usdc-${chainId}-${vault.slice(2, 8)}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value.trim())}
          placeholder='1'
          inputMode='decimal'
          className='w-32 font-mono'
        />
        <span className='text-xs text-muted-foreground'>USDC</span>
        <span className='font-mono text-xs tabular-nums'>
          {walletBalance !== undefined
            ? `Wallet: ${formatUnits(walletBalance, 6)} USDC`
            : isConnected
              ? 'Wallet: …'
              : 'Connect a wallet to deposit'}
        </span>
      </div>
      {amountError ? (
        <p className='text-xs text-foreground' role='alert'>
          {amountError}
        </p>
      ) : null}
      {insufficient ? (
        <p className='text-xs text-foreground' role='alert'>
          Error: insufficient USDC balance — your wallet holds{' '}
          {walletBalance !== undefined ? formatUnits(walletBalance, 6) : '0'} USDC,
          less than the {amount} USDC you entered. Get testnet USDC from the
          faucet (see Docs) or enter a smaller amount.
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
            onClick={() => switchChain({ chainId })}
          >
            Switch to {chainName}
          </Button>
        </div>
      ) : null}
      {isPaused ? (
        <p className='text-xs text-muted-foreground'>
          Deposit is disabled while paused — it would revert (EnforcedPause).
          That revert is the freeze proof; reopen first to deposit again.
        </p>
      ) : null}
      <div className='flex flex-wrap gap-2'>
        <Button
          variant='outline'
          size='sm'
          disabled={
            !isConnected || onWrongChain || amountRaw === null || amountError !== null || approve.isPending
          }
          onClick={handleApprove}
          title={
            !isConnected
              ? 'Connect a wallet to approve'
              : needsApprove
                ? 'Approve the vault to spend this USDC amount'
                : 'Allowance already covers this amount'
          }
        >
          {approve.isPending ? (
            <Icons.spinner className='size-3.5 animate-spin' />
          ) : (
            <Icons.check className='size-3.5' />
          )}
          {needsApprove ? '1 — Approve USDC' : 'Approved'}
        </Button>
        <Button
          variant='default'
          size='sm'
          disabled={!canDeposit || deposit.isPending}
          onClick={handleDeposit}
          title={
            !isConnected
              ? 'Connect a wallet to deposit'
              : isPaused
                ? 'Deposit reverts while paused'
                : insufficient
                  ? 'Insufficient USDC balance'
                  : needsApprove
                    ? 'Approve USDC first'
                    : 'Deposit USDC and receive shares'
          }
        >
          {deposit.isPending ? (
            <Icons.spinner className='size-3.5 animate-spin' />
          ) : (
            <Icons.add className='size-3.5' />
          )}
          2 — Deposit USDC
        </Button>
      </div>
      {approve.isError ? (
        <p className='text-xs text-foreground' role='alert'>
          Error: approve failed — {approve.error?.message ?? 'unknown error'}
        </p>
      ) : null}
      {approve.isSuccess && approve.data ? (
        <p className='text-xs'>
          <a
            href={`${EXPLORERS[chainId].url}/tx/${approve.data}`}
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-1 font-mono break-all text-primary underline underline-offset-2 hover:underline'
          >
            Approve confirmed — {approve.data.slice(0, 10)}…{approve.data.slice(-4)}
            <Icons.externalLink className='size-3 shrink-0' />
          </a>
        </p>
      ) : null}
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
            — shares minted, totalAssets updated. Live values above re-read
            from chain.
          </span>
        </p>
      ) : null}
    </div>
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

        {/* Deposit — approve + deposit, live balance + allowance checks. */}
        <div className='border-t pt-3'>
          <DepositUsdcForm
            vault={address}
            chainId={chainId}
            chainName={chainName}
            minDepositUsdc={live.minDepositUsdc}
            isPaused={isPaused}
            onDeposited={() => live.refetch()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
