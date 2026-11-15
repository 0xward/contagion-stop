'use client';

import { useState } from 'react';
import { parseEther, stringToHex, type Address } from 'viem';
import { useWriteContract } from 'wagmi';
import { Badge } from '@/components/ui/badge';
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
import type { Sibling, SiblingId } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Write actions for the sibling vaults (ux-ui-notes §8).
 *
 * Allowed UI actions ONLY: `emergencyPause(reason)`, `unpause()`,
 * `deposit()` (0.001 ETH test). There is deliberately NO button for
 * `pause(address)` — it is only callable via the watcher callback proxy
 * and a direct UI call would revert `NotAuthorized`.
 *
 * Guard: while `live` is false the buttons run a MOCK simulation
 * (local state change in the parent + "MOCK" label) and NEVER call the
 * contract. `useWriteContract` has no `enabled` option, so the guard is
 * an explicit branch at the call site. When `live` is true the same
 * buttons call the real contract via wagmi.
 */

type TxPhase = 'idle' | 'pending' | 'success' | 'error';

function TxStatus({
  chainId,
  hash,
  phase,
  errorMessage,
  mock = false
}: {
  chainId: number;
  hash?: `0x${string}`;
  phase: TxPhase;
  errorMessage?: string;
  mock?: boolean;
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
          Transaction confirmed
          {mock ? ' (MOCK — no on-chain transaction sent)' : ''}
        </span>
      ) : null}
      {phase === 'error' ? (
        <span className='inline-flex items-start gap-2 text-foreground'>
          <Icons.alertCircle className='mt-0.5 size-3.5 shrink-0' />
          <span className='break-words'>
            Transaction reverted / failed{mock ? ' (MOCK)' : ''}:{' '}
            {errorMessage ?? 'unknown error'}
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

function OwnerNote({ isOwner, live }: { isOwner: boolean; live: boolean }) {
  if (isOwner) return null;
  return (
    <p className='text-muted-foreground text-xs'>
      Owner only —{' '}
      {live
        ? 'connect the vault owner wallet to enable this action.'
        : 'connect a wallet to act as the demo owner (mock mode).'}
    </p>
  );
}

export interface VaultActionProps {
  sibling: Sibling;
  /** Whether the connected wallet owns this vault (live: on-chain owner). */
  isOwner: boolean;
  /** `false` = mock simulation, `true` = real contract call. */
  live: boolean;
}

/* ------------------------------------------------------------------ */
/* emergencyPause(reason) — origin vault A only, owner only            */
/* ------------------------------------------------------------------ */

export function EmergencyPauseDialog({
  sibling,
  isOwner,
  live,
  onMockConfirm
}: VaultActionProps & {
  /** Mock mode: parent applies the state change for this reason. */
  onMockConfirm: (reasonHex: `0x${string}`) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('EXPLOIT');
  const { data: hash, writeContract, isPending, isSuccess, isError, error } =
    useWriteContract();

  const isAscii = /^[\x20-\x7E]*$/.test(reason);
  let reasonHex: `0x${string}` | null = null;
  let reasonError: string | null = null;
  if (!reason.trim()) {
    reasonError = 'Reason is required.';
  } else if (!isAscii) {
    reasonError = 'Reason must be ASCII (bytes32, max 32 bytes).';
  } else {
    try {
      // ASCII-padded bytes32 — the SAME encoding as mock-data.ts
      // (stringToHex("EXPLOIT", { size: 32 }) = 0x4558504c4f4954…00).
      // NOT keccak256("EXPLOIT").
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

  function handleConfirm() {
    if (!reasonHex) return;
    if (!live) {
      onMockConfirm(reasonHex);
      setOpen(false);
      return;
    }
    writeContract({
      address: sibling.address as Address,
      abi: SIBLING_VAULT_ABI,
      functionName: 'emergencyPause',
      args: [reasonHex]
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
            {!live ? (
              <Badge variant='outline' className='w-fit border-foreground/40 text-foreground'>
                MOCK — no on-chain transaction will be sent
              </Badge>
            ) : null}
            <TxStatus
              chainId={sibling.chainId}
              hash={hash}
              phase={phase}
              errorMessage={error?.message}
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
              {live ? 'Confirm emergency pause' : 'Confirm (mock)'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OwnerNote isOwner={isOwner} live={live} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* unpause() — per vault, owner only, dialog required                  */
/* ------------------------------------------------------------------ */

export function UnpauseDialog({
  sibling,
  isOwner,
  live,
  onMockConfirm
}: VaultActionProps & {
  /** Mock mode: parent marks this vault ACTIVE. */
  onMockConfirm: (siblingId: SiblingId) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: hash, writeContract, isPending, isSuccess, isError, error } =
    useWriteContract();

  const phase: TxPhase = isPending
    ? 'pending'
    : isSuccess
      ? 'success'
      : isError
        ? 'error'
        : 'idle';

  function handleConfirm() {
    if (!live) {
      onMockConfirm(sibling.id);
      setOpen(false);
      return;
    }
    writeContract({
      address: sibling.address as Address,
      abi: SIBLING_VAULT_ABI,
      functionName: 'unpause',
      args: []
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
            {!live ? (
              <Badge variant='outline' className='w-fit border-foreground/40 text-foreground'>
                MOCK — no on-chain transaction will be sent
              </Badge>
            ) : null}
            <TxStatus
              chainId={sibling.chainId}
              hash={hash}
              phase={phase}
              errorMessage={error?.message}
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
              {live ? 'Confirm unpause' : 'Confirm (mock)'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OwnerNote isOwner={isOwner} live={live} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* deposit() test — 0.001 ETH, no dialog; revert shown inline as proof */
/* ------------------------------------------------------------------ */

export function DepositTestButton({
  sibling,
  live
}: {
  sibling: Sibling;
  live: boolean;
}) {
  const { data: hash, writeContract, isPending, isSuccess, isError, error } =
    useWriteContract();
  const [mockResult, setMockResult] = useState<'reverted' | 'success' | null>(null);

  const phase: TxPhase = live
    ? isPending
      ? 'pending'
      : isSuccess
        ? 'success'
        : isError
          ? 'error'
          : 'idle'
    : mockResult === 'reverted'
      ? 'error'
      : mockResult === 'success'
        ? 'success'
        : 'idle';

  function handleClick() {
    if (!live) {
      // Mock simulation: a paused vault rejects deposits (EnforcedPause).
      // This inline revert is the freeze proof for the demo.
      setMockResult(sibling.status === 'PAUSED' ? 'reverted' : 'success');
      return;
    }
    writeContract({
      address: sibling.address as Address,
      abi: SIBLING_VAULT_ABI,
      functionName: 'deposit',
      value: parseEther('0.001')
    });
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <Button variant='outline' onClick={handleClick} disabled={isPending}>
        {isPending ? (
          <Icons.spinner className='size-4 animate-spin' />
        ) : (
          <Icons.add className='size-4' />
        )}
        Test deposit() — 0.001 ETH
      </Button>
      {!live && mockResult === 'reverted' ? (
        <div
          className='flex flex-col gap-1 rounded-none border border-foreground bg-muted p-2 text-xs'
          role='status'
        >
          <span className='inline-flex items-center gap-2 font-medium text-foreground'>
            <Icons.alertCircle className='size-3.5' />
            Reverted — EnforcedPause (MOCK)
          </span>
          <span className='text-muted-foreground'>
            deposit() blocked while vault {sibling.id} is paused — proof the
            deployment is frozen. No on-chain transaction was sent.
          </span>
        </div>
      ) : null}
      {!live && mockResult === 'success' ? (
        <div
          className='flex flex-col gap-1 rounded-none border border-foreground/30 bg-muted p-2 text-xs'
          role='status'
        >
          <span className='inline-flex items-center gap-2 font-medium text-foreground'>
            <Icons.circleCheck className='size-3.5' />
            Mock deposit accepted (MOCK)
          </span>
          <span className='text-muted-foreground'>
            Vault {sibling.id} is ACTIVE, so 0.001 ETH would be accepted. No
            on-chain transaction was sent.
          </span>
        </div>
      ) : null}
      {live ? (
        <TxStatus
          chainId={sibling.chainId}
          hash={hash}
          phase={phase}
          errorMessage={error?.message}
        />
      ) : null}
    </div>
  );
}
