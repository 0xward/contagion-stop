'use client';

import { useEffect, useRef, useState } from 'react';
import { formatEther, parseEther, stringToHex, type Address } from 'viem';
import {
  useAccount,
  useBalance,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWriteContract
} from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import {
  EXPLORERS,
  LOOP_COST_LREACT,
  PUBLIC_CONTRACTS,
  PUBLIC_E2E_CYCLE_1,
  PUBLIC_WATCHER_BALANCE_AT_HANDOVER_LREACT
} from '@/lib/config';
import { CONTAGION_WATCHER_ABI, PUBLIC_VAULT_ABI } from '@/lib/contracts';
import { useLiveVault } from '@/hooks/use-live-vault';
import { cn } from '@/lib/utils';

/**
 * Try it live — public test deployment.
 *
 * A live instance anyone can trigger: three PublicVaults (Unichain Sepolia
 * U1/U2, Base Sepolia B) + a public ContagionWatcher (Lasna). trip() and
 * reopen() are permissionless here BY DESIGN — the main deployment above
 * is owner-only, which is the correct product behavior. Every button sends
 * a REAL transaction; after one confirms, the live reads below re-fetch
 * from chain (plus a Refresh button that re-reads on demand).
 *
 * Honest labels: test deposits stay in the public vault (withdraw is
 * owner-only); the watcher balance shown is live; the loop cost is the
 * measured range from the two recorded public cycles.
 */

type TxPhase = 'idle' | 'pending' | 'success' | 'error';

interface Notice {
  kind: 'trip' | 'reopen' | 'deposit';
  hash: `0x${string}`;
  text: string;
}

function truncateAddress(address: string): string {
  return address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}

function TxLine({
  chainId,
  hash,
  phase,
  errorMessage
}: {
  chainId: number;
  hash?: `0x${string}`;
  phase: TxPhase;
  errorMessage?: string;
}) {
  if (phase === 'idle') return null;
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-none border p-2 text-xs',
        phase === 'pending' && 'border-border bg-muted',
        phase === 'success' && 'border-foreground/30 bg-muted',
        phase === 'error' && 'border-foreground bg-muted'
      )}
      role='status'
    >
      {phase === 'pending' ? (
        <span className='inline-flex items-center gap-2'>
          <Icons.spinner className='size-3.5 animate-spin' />
          Transaction pending — confirm in your wallet…
        </span>
      ) : null}
      {phase === 'success' ? (
        <span className='inline-flex items-center gap-2 text-foreground'>
          <Icons.circleCheck className='size-3.5' />
          Transaction confirmed — live state below refreshes from chain.
        </span>
      ) : null}
      {phase === 'error' ? (
        <span className='inline-flex items-start gap-2 text-foreground'>
          <Icons.alertCircle className='mt-0.5 size-3.5 shrink-0' />
          <span className='break-words'>
            Transaction reverted / failed: {errorMessage ?? 'unknown error'}
          </span>
        </span>
      ) : null}
      {hash && phase !== 'error' ? (
        <a
          href={`${EXPLORERS[chainId].url}/tx/${hash}`}
          target='_blank'
          rel='noreferrer'
          className='inline-flex items-center gap-1 font-mono break-all text-foreground underline underline-offset-2 hover:underline'
        >
          {hash}
          <Icons.externalLink className='size-3 shrink-0' />
        </a>
      ) : null}
    </div>
  );
}

/** Report a confirmed write once: invalidate queries + hand the hash up. */
function useReportWrite(
  hash: `0x${string}` | undefined,
  isSuccess: boolean,
  onConfirmed: (hash: `0x${string}`) => void
) {
  const queryClient = useQueryClient();
  const reportedRef = useRef<`0x${string}` | null>(null);
  useEffect(() => {
    if (!isSuccess || !hash || reportedRef.current === hash) return;
    reportedRef.current = hash;
    void queryClient.invalidateQueries();
    onConfirmed(hash);
  }, [isSuccess, hash, onConfirmed, queryClient]);
}

export interface PublicVaultCardProps {
  id: 'U1' | 'U2' | 'B';
  label: string;
  role: string;
  chainId: number;
  chainName: string;
  address: Address;
  explorerUrl: string;
}

function PublicVaultCard({
  id,
  label,
  role,
  chainId,
  chainName,
  address,
  explorerUrl
}: PublicVaultCardProps) {
  const { isConnected } = useAccount();
  const connectedChainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('TRY-001');
  const [notice, setNotice] = useState<Notice | null>(null);

  const live = useLiveVault(address, chainId);
  const isPaused = live.isLive ? live.paused === true : undefined;
  const onWrongChain = isConnected && connectedChainId !== chainId;

  const trip = useWriteContract();
  const reopen = useWriteContract();
  const deposit = useWriteContract();

  useReportWrite(trip.data, trip.isSuccess, (hash) =>
    setNotice({
      kind: 'trip',
      hash,
      text: 'Trip confirmed — the watcher callbacks are expected, not yet confirmed. The vaults below should flip to PAUSED within ~2 s; press Refresh to re-read the live state, or check the trip on the explorer.'
    })
  );
  useReportWrite(reopen.data, reopen.isSuccess, (hash) =>
    setNotice({ kind: 'reopen', hash, text: 'Reopen confirmed — this vault is ACTIVE again.' })
  );
  useReportWrite(deposit.data, deposit.isSuccess, (hash) =>
    setNotice({
      kind: 'deposit',
      hash,
      text: 'Deposit confirmed — 0.001 ETH now sits in this public vault. Withdraw is owner-only, so a test deposit stays here.'
    })
  );

  const isAscii = /^[\x20-\x7E]*$/.test(reason);
  let reasonHex: `0x${string}` | null = null;
  let reasonError: string | null = null;
  if (!reason.trim()) {
    reasonError = 'Reason is required.';
  } else if (!isAscii) {
    reasonError = 'Reason must be ASCII (bytes32, max 32 bytes).';
  } else {
    try {
      // ASCII-padded bytes32 — the SAME encoding as the recorded public
      // test runs (TEST-001 / TEST-002, cast format-bytes32-string).
      reasonHex = stringToHex(reason.trim(), { size: 32 });
    } catch {
      reasonError = 'Reason is longer than 32 bytes.';
    }
  }

  const phaseOf = (w: {
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
  }): TxPhase =>
    w.isPending ? 'pending' : w.isSuccess ? 'success' : w.isError ? 'error' : 'idle';

  function handleTrip() {
    if (!reasonHex) return;
    trip.writeContract({
      address,
      abi: PUBLIC_VAULT_ABI,
      functionName: 'trip',
      args: [reasonHex],
      chainId
    });
  }

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <CardTitle className='text-base'>{label}</CardTitle>
          {role === 'ORIGIN' ? <Badge variant='default'>ORIGIN</Badge> : null}
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
            {live.isLive ? 'LIVE' : live.hasFailed ? 'READ FAILED' : 'LOADING…'}
          </Badge>
        </div>
        <div className='text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs'>
          <span className='inline-block size-2 rounded-full bg-primary' aria-hidden />
          {chainName} · chain {chainId}
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-3 text-sm'>
        <div className='flex items-center gap-1'>
          <span className='font-mono text-xs break-all tabular-nums' title={address}>
            {truncateAddress(address)}
          </span>
          <a
            href={`${explorerUrl}/address/${address}`}
            target='_blank'
            rel='noreferrer'
            className='inline-flex items-center gap-0.5 text-xs text-primary underline underline-offset-2 hover:underline'
            title={`View on ${explorerUrl}`}
          >
            Explorer
            <Icons.externalLink className='size-3' />
          </a>
        </div>

        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Balance (live)</span>
          <span className='font-mono tabular-nums'>
            {live.balanceEth ?? (live.hasFailed ? 'read failed' : '…')} ETH
          </span>
        </div>
        <div className='flex justify-between gap-2 text-xs'>
          <span className='text-muted-foreground'>Total deposited (live)</span>
          <span className='font-mono tabular-nums'>
            {live.totalDepositedEth ?? (live.hasFailed ? 'read failed' : '…')} ETH
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
              Your wallet is on a different chain. Switch to {chainName} to
              send transactions to this vault.
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

        <div className='flex flex-col gap-2 border-t pt-3'>
          <Label htmlFor={`public-reason-${id}`}>Reason (bytes32, ASCII)</Label>
          <Input
            id={`public-reason-${id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder='TRY-001'
            className='font-mono'
          />
          {reasonError ? (
            <p className='text-xs text-foreground'>{reasonError}</p>
          ) : (
            <p className='font-mono text-xs break-all text-muted-foreground tabular-nums'>
              {reasonHex}
            </p>
          )}
          <Button
            variant='default'
            disabled={!isConnected || !reasonHex || trip.isPending}
            title={
              !isConnected
                ? 'Connect a wallet to trip — any wallet works, no owner needed'
                : 'Trigger the containment loop from this vault'
            }
            onClick={handleTrip}
          >
            {trip.isPending ? (
              <Icons.spinner className='size-4 animate-spin' />
            ) : (
              <Icons.warning className='size-4' />
            )}
            Trip incident
          </Button>
          <TxLine
            chainId={chainId}
            hash={trip.data}
            phase={phaseOf(trip)}
            errorMessage={trip.error?.message}
          />

          <Button
            variant='outline'
            disabled={!isConnected || reopen.isPending || isPaused === false}
            title={
              !isConnected
                ? 'Connect a wallet to reopen — any wallet works, no owner needed'
                : isPaused === false
                  ? 'Already active — reopen would revert (ExpectedPause)'
                  : 'Reopen this vault'
            }
            onClick={() =>
              reopen.writeContract({
                address,
                abi: PUBLIC_VAULT_ABI,
                functionName: 'reopen',
                args: [],
                chainId
              })
            }
          >
            {reopen.isPending ? (
              <Icons.spinner className='size-4 animate-spin' />
            ) : (
              <Icons.check className='size-4' />
            )}
            Reopen
          </Button>
          <TxLine
            chainId={chainId}
            hash={reopen.data}
            phase={phaseOf(reopen)}
            errorMessage={reopen.error?.message}
          />

          <Button
            variant='outline'
            disabled={!isConnected || deposit.isPending || isPaused === true}
            title={
              !isConnected
                ? 'Connect a wallet to deposit'
                : isPaused === true
                  ? 'Deposit reverts while paused — that is the freeze proof; reopen first'
                  : 'Deposit 0.001 ETH into this public vault'
            }
            onClick={() =>
              deposit.writeContract({
                address,
                abi: PUBLIC_VAULT_ABI,
                functionName: 'deposit',
                value: parseEther('0.001'),
                chainId
              })
            }
          >
            {deposit.isPending ? (
              <Icons.spinner className='size-4 animate-spin' />
            ) : (
              <Icons.add className='size-4' />
            )}
            Test deposit() — 0.001 ETH
          </Button>
          <TxLine
            chainId={chainId}
            hash={deposit.data}
            phase={phaseOf(deposit)}
            errorMessage={deposit.error?.message}
          />
          {isPaused === true ? (
            <p className='text-muted-foreground text-xs'>
              Deposit is disabled while paused — it would revert
              (EnforcedPause). That revert is the freeze proof; reopen first
              to deposit again.
            </p>
          ) : null}
        </div>

        {notice ? (
          <div
            className='flex flex-col gap-1 rounded-none border border-foreground/30 bg-muted p-2 text-xs'
            role='status'
          >
            <span className='inline-flex items-center gap-2 font-medium text-foreground'>
              <Icons.circleCheck className='size-3.5' />
              {notice.kind === 'trip'
                ? 'Trip confirmed — callbacks expected, not yet confirmed'
                : notice.kind === 'reopen'
                  ? 'Reopen confirmed'
                  : 'Deposit confirmed'}
            </span>
            <span className='text-muted-foreground'>{notice.text}</span>
            <a
              href={`${EXPLORERS[chainId].url}/tx/${notice.hash}`}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-1 font-mono break-all text-foreground underline underline-offset-2 hover:underline'
            >
              {notice.hash}
              <Icons.externalLink className='size-3 shrink-0' />
            </a>
            <div className='mt-1 flex flex-wrap gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  void queryClient.invalidateQueries();
                  live.refetch();
                }}
              >
                <Icons.refresh className='size-3.5' />
                Refresh live state
              </Button>
              <Button variant='ghost' size='sm' onClick={() => setNotice(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PublicTestInstance() {
  const { data: watcherBalance, isError: watcherBalanceError } = useBalance({
    address: PUBLIC_CONTRACTS.watcher.address as Address,
    chainId: 5318007,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const { data: watcherPaused, isError: watcherPausedError } = useReadContract({
    address: PUBLIC_CONTRACTS.watcher.address as Address,
    abi: CONTAGION_WATCHER_ABI,
    functionName: 'paused',
    chainId: 5318007,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const watcherLive = watcherBalance !== undefined && watcherPaused !== undefined;
  const [watcherTimedOut, setWatcherTimedOut] = useState(false);
  useEffect(() => {
    if (watcherLive) return;
    const id = window.setTimeout(() => setWatcherTimedOut(true), 12_000);
    return () => window.clearTimeout(id);
  }, [watcherLive]);
  const watcherReadFailed = watcherBalanceError || watcherPausedError || watcherTimedOut;
  const watcherBalanceNum =
    watcherBalance !== undefined ? Number.parseFloat(formatEther(watcherBalance.value)) : null;
  const loopsLeft =
    watcherBalanceNum !== null ? Math.floor(watcherBalanceNum / 0.09) : null;

  const vaults: PublicVaultCardProps[] = [
    {
      id: 'U1',
      label: 'U1 — Origin',
      role: 'ORIGIN',
      chainId: PUBLIC_CONTRACTS.vaultU1.chainId,
      chainName: PUBLIC_CONTRACTS.vaultU1.chainName,
      address: PUBLIC_CONTRACTS.vaultU1.address as Address,
      explorerUrl: EXPLORERS[PUBLIC_CONTRACTS.vaultU1.chainId].url
    },
    {
      id: 'U2',
      label: 'U2 — Sibling',
      role: 'SIBLING',
      chainId: PUBLIC_CONTRACTS.vaultU2.chainId,
      chainName: PUBLIC_CONTRACTS.vaultU2.chainName,
      address: PUBLIC_CONTRACTS.vaultU2.address as Address,
      explorerUrl: EXPLORERS[PUBLIC_CONTRACTS.vaultU2.chainId].url
    },
    {
      id: 'B',
      label: 'B — Sibling',
      role: 'SIBLING',
      chainId: PUBLIC_CONTRACTS.vaultB.chainId,
      chainName: PUBLIC_CONTRACTS.vaultB.chainName,
      address: PUBLIC_CONTRACTS.vaultB.address as Address,
      explorerUrl: EXPLORERS[PUBLIC_CONTRACTS.vaultB.chainId].url
    }
  ];

  return (
    <section id='try-it-live' aria-label='Try it live' className='scroll-mt-20'>
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center gap-2'>
            <CardTitle className='text-base'>Try it live — Public test deployment</CardTitle>
            <Badge variant='outline' className='border-primary/40 text-primary'>
              PUBLIC TEST DEPLOYMENT
            </Badge>
            <Badge variant='outline' className='border-primary/40 text-primary'>
              LIVE
            </Badge>
          </div>
          <CardDescription>
            Anyone can trigger this instance — no owner wallet needed. Trip any
            vault below and the public watcher on Lasna freezes the other two
            within ~2 seconds. The main deployment above is owner-only; that is
            the product behavior, not a limitation of this page.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2 text-sm leading-relaxed'>
            <p>
              <span className='font-medium'>How to test it:</span> connect a
              wallet (top right) → pick a vault → press{' '}
              <span className='font-medium'>Trip incident</span> → wait ~2 s →
              watch all three vaults flip to PAUSED → press{' '}
              <span className='font-medium'>Reopen</span> on each vault to reset
              → press <span className='font-medium'>Test deposit()</span> to
              confirm deposits work again. Every step sends a real transaction
              on a testnet; verify each hash on its explorer.
            </p>
            <p className='text-muted-foreground'>
              One full loop costs {LOOP_COST_LREACT}. The public watcher holds{' '}
              {watcherBalanceNum !== null
                ? `${watcherBalanceNum.toFixed(4)} lREACT (live)`
                : `${PUBLIC_WATCHER_BALANCE_AT_HANDOVER_LREACT} lREACT at handover, 15 Nov 2026`}
              {loopsLeft !== null ? ` — about ${loopsLeft} loops left` : ''}.
              Each vault holds ~0.001 ETH for callback fees. A test deposit
              stays in the public vault — withdraw is owner-only, so send only
              testnet dust you do not need back.
            </p>
            <p className='text-muted-foreground'>
              Recorded public test runs (15 Nov 2026, wallet not owned by the
              deployer): cycle 1 trip{' '}
              <a
                href={`https://sepolia.uniscan.xyz/tx/${PUBLIC_E2E_CYCLE_1.trip}`}
                target='_blank'
                rel='noreferrer'
                className='font-mono text-xs text-primary underline underline-offset-2 hover:underline'
              >
                0x9cb807fa…7a02
              </a>{' '}
              → react{' '}
              <a
                href={`https://lasna.reactscan.net/tx/${PUBLIC_E2E_CYCLE_1.react}`}
                target='_blank'
                rel='noreferrer'
                className='font-mono text-xs text-primary underline underline-offset-2 hover:underline'
              >
                0x5fbbc913…7dc
              </a>{' '}
              → 2 callbacks → contained in ~2 s; cycle 2 repeated the same
              loop. Full evidence in the Docs.
            </p>
          </div>

          {/* Public watcher — live status */}
          <div className='flex flex-col gap-2 rounded-none border p-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-sm font-semibold'>Public watcher — Lasna</span>
              <Badge
                variant='outline'
                className={cn(
                  watcherPaused === false
                    ? 'border-foreground/30 bg-muted text-foreground'
                    : 'border-border bg-muted text-muted-foreground'
                )}
              >
                {watcherPaused === false
                  ? 'ACTIVE'
                  : watcherPaused === true
                    ? 'PAUSED'
                    : watcherReadFailed
                      ? 'STATUS UNKNOWN — READ FAILED'
                      : 'STATUS LOADING…'}
              </Badge>
              <Badge variant='outline' className='border-primary/40 text-primary'>
                {watcherReadFailed ? 'READ FAILED' : 'LIVE'}
              </Badge>
            </div>
            <div className='flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-xs tabular-nums'>
              <span>
                Balance:{' '}
                {watcherBalanceNum !== null
                  ? `${watcherBalanceNum.toFixed(4)} lREACT`
                  : watcherReadFailed
                    ? 'read failed'
                    : '…'}
              </span>
              <a
                href={`${EXPLORERS[5318007].url}/address/${PUBLIC_CONTRACTS.watcher.address}`}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:underline'
              >
                {truncateAddress(PUBLIC_CONTRACTS.watcher.address)}
                <Icons.externalLink className='size-3' />
              </a>
              <span className='text-muted-foreground'>Sourcify exact_match</span>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {vaults.map((vault) => (
              <PublicVaultCard key={vault.id} {...vault} />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
