'use client';

import { useEffect, useRef, useState } from 'react';
import { parseEther, stringToHex, type Address } from 'viem';
import { useWriteContract, useAccount, useChainId } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import WriteErrorNotice from '@/components/web3/write-error-notice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { Icons } from '@/components/icons';
import { EXPLORERS } from '@/lib/config';
import { SIBLING_VAULT_ABI } from '@/lib/contracts';
import type { Sibling } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Write actions for the sibling vaults (ux-ui-notes §8).
 *
 * Allowed UI actions ONLY: `emergencyPause(reason)`, `unpause()`,
 * `deposit()` (0.001 ETH test). There is deliberately NO button for
 * `pause(address)` — it is only callable via the watcher callback proxy
 * and a direct UI call would revert `NotAuthorized`.
 *
 * Every button sends a REAL transaction via wagmi. After a transaction
 * confirms, all wagmi queries are invalidated so the live reads on the
 * page re-fetch from chain — the UI follows the chain, it never assumes
 * the new state locally.
 */

type TxPhase = 'idle' | 'pending' | 'success' | 'error';

function TxStatus({
  chainId,
  hash,
  phase,
  error,
  crossChainWrite
}: {
  chainId: number;
  hash?: `0x${string}`;
  phase: TxPhase;
  /** Raw write error — mapped to one short human line, never dumped raw. */
  error?: unknown;
  /** True when the write targets a different chain than the connected one. */
  crossChainWrite?: boolean;
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
        <WriteErrorNotice
          error={error}
          chainId={chainId}
          txHash={hash}
          crossChainWrite={crossChainWrite}
        />
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

function OwnerNote({ isOwner }: { isOwner: boolean }) {
  if (isOwner) return null;
  return (
    <p className='text-muted-foreground text-xs'>
      Owner only — connect the vault owner wallet to enable this action.
    </p>
  );
}

export interface VaultActionProps {
  sibling: Sibling;
  /** Whether the connected wallet owns this vault (live: on-chain owner). */
  isOwner: boolean;
  /** Called once with the confirmed tx hash (parent refetches / shows the expected state). */
  onTxSuccess?: (hash: `0x${string}`) => void;
}

/**
 * After a write confirms, invalidate every wagmi query once so live reads
 * re-fetch, then report the hash to the parent exactly once.
 */
function useTxSuccess(hash: `0x${string}` | undefined, isSuccess: boolean, onTxSuccess?: (hash: `0x${string}`) => void) {
  const queryClient = useQueryClient();
  const reportedRef = useRef<`0x${string}` | null>(null);
  useEffect(() => {
    if (!isSuccess || !hash || reportedRef.current === hash) return;
    reportedRef.current = hash;
    void queryClient.invalidateQueries();
    onTxSuccess?.(hash);
  }, [isSuccess, hash, onTxSuccess, queryClient]);
}

/* ------------------------------------------------------------------ */
/* emergencyPause(reason) — origin vault A only, owner only            */
/* ------------------------------------------------------------------ */

export function EmergencyPauseDialog({
  sibling,
  isOwner,
  onConfirmed
}: VaultActionProps & {
  /** Called once with the confirmed tx hash + reason (parent shows the expected tripped state). */
  onConfirmed?: (hash: `0x${string}`, reasonHex: `0x${string}`) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('EXPLOIT');
  const { data: hash, writeContract, isPending, isSuccess, isError, error } =
    useWriteContract();
  const { isConnected } = useAccount();
  const connectedChainId = useChainId();
  // A write to a different chain than the connected one is the case
  // where a wallet session may not cover the target chain at all.
  const crossChainWrite = isConnected && connectedChainId !== sibling.chainId;

  const isAscii = /^[\x20-\x7E]*$/.test(reason);
  let reasonHex: `0x${string}` | null = null;
  let reasonError: string | null = null;
  if (!reason.trim()) {
    reasonError = 'Reason is required.';
  } else if (!isAscii) {
    reasonError = 'Reason must be ASCII (bytes32, max 32 bytes).';
  } else {
    try {
      // ASCII-padded bytes32: stringToHex("EXPLOIT", { size: 32 }) =
      // 0x4558504c4f4954…00. NOT keccak256("EXPLOIT"). Note the recorded
      // run #1 used a DIFFERENT encoding — keccak256("EXPLOIT-001") —
      // for its reason; both fill the same bytes32 field, with different
      // values. The public test runs used this same ASCII-padded
      // encoding (TEST-001 / TEST-002).
      reasonHex = stringToHex(reason.trim(), { size: 32 });
    } catch {
      reasonError = 'Reason is longer than 32 bytes.';
    }
  }

  const phase: TxPhase = isPending
    ? 'pending'
    : isSuccess
      ? 'success'
      : isError
        ? 'error'
        : 'idle';

  useTxSuccess(hash, isSuccess);
  const confirmedRef = useRef<`0x${string}` | null>(null);
  useEffect(() => {
    if (!isSuccess || !hash || !reasonHex || confirmedRef.current === hash) return;
    confirmedRef.current = hash;
    onConfirmed?.(hash, reasonHex);
  }, [isSuccess, hash, reasonHex, onConfirmed]);

  function handleConfirm() {
    if (!reasonHex) return;
    writeContract({
      address: sibling.address as Address,
      abi: SIBLING_VAULT_ABI,
      functionName: 'emergencyPause',
      args: [reasonHex],
      chainId: sibling.chainId
    });
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              variant='default'
              disabled={!isOwner || isPending}
              title={
                !isOwner
                  ? 'Owner only — connect the vault owner wallet'
                  : 'Trigger the circuit breaker'
              }
            >
              <Icons.warning className='size-4' />
              Emergency pause
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emergency pause vault {sibling.id} (Origin)</DialogTitle>
            <DialogDescription>
              This pauses vault {sibling.id} and triggers the watcher to freeze
              sibling vaults B and C on their chains. This is the only way to
              start the containment loop.
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-2'>
            <Label htmlFor={`reason-${sibling.id}`}>Reason (bytes32, ASCII)</Label>
            <Input
              id={`reason-${sibling.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='EXPLOIT'
              className='font-mono'
            />
            {reasonError ? (
              <p className='text-xs text-foreground'>{reasonError}</p>
            ) : (
              <p className='font-mono text-xs break-all text-muted-foreground tabular-nums'>
                {reasonHex}
              </p>
            )}
            <TxStatus
              chainId={sibling.chainId}
              hash={hash}
              phase={phase}
              error={error}
              crossChainWrite={crossChainWrite}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              loading={isPending}
              disabled={!reasonHex || !isOwner}
              onClick={handleConfirm}
            >
              Confirm emergency pause
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OwnerNote isOwner={isOwner} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* unpause() — per vault, owner only, dialog required                  */
/* ------------------------------------------------------------------ */

export function UnpauseDialog({
  sibling,
  isOwner,
  onTxSuccess
}: VaultActionProps) {
  const [open, setOpen] = useState(false);
  const { data: hash, writeContract, isPending, isSuccess, isError, error } =
    useWriteContract();
  const { isConnected } = useAccount();
  const connectedChainId = useChainId();
  // A write to a different chain than the connected one is the case
  // where a wallet session may not cover the target chain at all.
  const crossChainWrite = isConnected && connectedChainId !== sibling.chainId;

  const phase: TxPhase = isPending
    ? 'pending'
    : isSuccess
      ? 'success'
      : isError
        ? 'error'
        : 'idle';

  useTxSuccess(hash, isSuccess, onTxSuccess);

  function handleConfirm() {
    writeContract({
      address: sibling.address as Address,
      abi: SIBLING_VAULT_ABI,
      functionName: 'unpause',
      args: [],
      chainId: sibling.chainId
    });
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              variant='destructive'
              disabled={!isOwner || isPending}
              title={
                !isOwner
                  ? 'Owner only — connect the vault owner wallet'
                  : 'Unpause this vault'
              }
            >
              <Icons.check className='size-4' />
              Unpause
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpause vault {sibling.id}</DialogTitle>
            <DialogDescription>
              Unpause only after audit; the watcher is not involved. This
              unpauses vault {sibling.id} only — not all deployments.
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-2'>
            <TxStatus
              chainId={sibling.chainId}
              hash={hash}
              phase={phase}
              error={error}
              crossChainWrite={crossChainWrite}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              loading={isPending}
              disabled={!isOwner}
              variant='destructive'
              onClick={handleConfirm}
            >
              Confirm unpause
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OwnerNote isOwner={isOwner} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* deposit() test — 0.001 ETH, no dialog; revert shown inline as proof */
/* ------------------------------------------------------------------ */

export function DepositTestButton({
  sibling,
  onTxSuccess,
  disabled
}: {
  sibling: Sibling;
  onTxSuccess?: (hash: `0x${string}`) => void;
  /** Set by the parent when the wallet is on the wrong chain. */
  disabled?: boolean;
}) {
  const { data: hash, writeContract, isPending, isSuccess, isError, error } =
    useWriteContract();
  const { isConnected } = useAccount();
  const connectedChainId = useChainId();
  // A write to a different chain than the connected one is the case
  // where a wallet session may not cover the target chain at all.
  const crossChainWrite = isConnected && connectedChainId !== sibling.chainId;

  const phase: TxPhase = isPending
    ? 'pending'
    : isSuccess
      ? 'success'
      : isError
        ? 'error'
        : 'idle';

  useTxSuccess(hash, isSuccess, onTxSuccess);

  function handleClick() {
    writeContract({
      address: sibling.address as Address,
      abi: SIBLING_VAULT_ABI,
      functionName: 'deposit',
      value: parseEther('0.001'),
      chainId: sibling.chainId
    });
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <Button
        variant='outline'
        onClick={handleClick}
        disabled={isPending || disabled}
        title={disabled ? 'Switch to this vault’s chain first' : undefined}
      >
        {isPending ? (
          <Icons.spinner className='size-4 animate-spin' />
        ) : (
          <Icons.add className='size-4' />
        )}
        Test deposit() — 0.001 ETH
      </Button>
      {isSuccess ? (
        <p className='text-muted-foreground text-xs'>
          0.001 ETH now sits in this vault — withdraw is owner-only, so a
          test deposit stays here.
        </p>
      ) : null}
      <TxStatus
        chainId={sibling.chainId}
        hash={hash}
        phase={phase}
        error={error}
        crossChainWrite={crossChainWrite}
      />
    </div>
  );
}
