'use client';

import * as React from 'react';
import { useWriteContract } from 'wagmi';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Address } from 'viem';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import {
  ADDRESSES,
  CONTAGION_WATCHER_ABI,
  EXPLORERS,
  LIVE,
  SIBLING_VAULT_ABI
} from '@/lib/contracts';
import type { FundingHealth, SiblingId } from '@/lib/types';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** One full loop costs ~0.10–0.11 lREACT (measured on-chain); below this the watcher cannot fund a loop. */
const WATCHER_LOW_RESERVES_LREACT = 0.15;

const VAULT_ADDRESSES: Record<SiblingId, Address> = {
  A: ADDRESSES.siblingVaultA as Address,
  B: ADDRESSES.siblingVaultB as Address,
  C: ADDRESSES.siblingVaultC as Address
};

/* ------------------------------------------------------------------ */
/* coverDebt button — one per indebted entity                          */
/*                                                                     */
/* `coverDebt()` exists on both contracts (contracts.ts). It is only   */
/* rendered when that entity's debt > 0. While LIVE is false the      */
/* button runs a mock simulation and never sends a transaction.        */
/* ------------------------------------------------------------------ */

interface CoverDebtButtonProps {
  label: string;
  address: Address;
  abi: typeof CONTAGION_WATCHER_ABI | typeof SIBLING_VAULT_ABI;
  chainId: number;
}

function CoverDebtButton({ label, address, abi, chainId }: CoverDebtButtonProps) {
  const [mockSimulated, setMockSimulated] = React.useState(false);
  const { writeContract, data: txHash, isPending, isSuccess, error } = useWriteContract();

  const handleClick = () => {
    if (!LIVE) {
      // Mock mode: simulate only — no transaction is ever sent.
      setMockSimulated(true);
      return;
    }
    writeContract({
      address,
      abi,
      functionName: 'coverDebt',
      chainId
    });
  };

  return (
    <div className='flex flex-col items-start gap-1.5'>
      <Button size='sm' variant='outline' onClick={handleClick} disabled={isPending || mockSimulated}>
        {isPending ? <Icons.spinner className='size-3.5 animate-spin' /> : <Icons.check className='size-3.5' />}
        coverDebt() — {label}
      </Button>
      {!LIVE ? (
        <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
          <Badge variant='outline' className='border-border bg-muted text-muted-foreground'>
            MOCK
          </Badge>
          {mockSimulated
            ? 'Simulated — no transaction sent (contracts not deployed yet).'
            : 'Mock simulation only while LIVE is false.'}
        </span>
      ) : null}
      {LIVE && isSuccess && txHash ? (
        <a
          href={`${EXPLORERS[chainId as keyof typeof EXPLORERS] ?? ''}/tx/${txHash}`}
          target='_blank'
          rel='noreferrer'
          className='inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline tabular-nums'
        >
          coverDebt() confirmed — {txHash.slice(0, 6)}…{txHash.slice(-4)}
          <Icons.externalLink className='size-3' />
        </a>
      ) : null}
      {LIVE && error ? (
        <span className='text-xs text-foreground'>coverDebt() failed: {error.message}</span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface FundingHealthProps {
  health: FundingHealth;
}

export function FundingHealth({ health }: FundingHealthProps) {
  const watcherDebt = Number.parseFloat(health.watcher.debtLreact);
  const watcherReserves = Number.parseFloat(health.watcher.reservesLreact);
  const siblingDebts = health.siblings.map((s) => ({
    siblingId: s.siblingId,
    debt: Number.parseFloat(s.debtEth),
    reserves: Number.parseFloat(s.reservesEth)
  }));
  const anyDebt = watcherDebt > 0 || siblingDebts.some((s) => s.debt > 0);
  const lowReserves = watcherReserves < WATCHER_LOW_RESERVES_LREACT;

  const warning =
    health.warning ??
    (anyDebt
      ? 'Debt is outstanding — execution can stall silently. Call coverDebt() before the demo.'
      : lowReserves
        ? `Watcher reserves (${health.watcher.reservesLreact} lREACT) are below one full loop (~0.10–0.11 lREACT) — execution can stall silently. Top up before the demo.`
        : null);

  // Bars: watcher in lREACT, siblings in ETH — different units, flagged below the chart.
  const chartData = [
    { name: 'Watcher', reserves: watcherReserves, debt: watcherDebt, unit: 'lREACT' },
    ...siblingDebts.map((s) => ({
      name: `Vault ${s.siblingId}`,
      reserves: s.reserves,
      debt: s.debt,
      unit: 'ETH'
    }))
  ];

  return (
    <Card>
      <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
        <div className='min-w-0'>
          <CardTitle>Funding health</CardTitle>
          <CardDescription>
            Callback fees are paid from each contract&apos;s own balance (its &ldquo;reserves&rdquo;).
            Debt is read from the Lasna system contract — there is no <code>debt()</code> or{' '}
            <code>reserves()</code> on the vault or watcher contracts. Watcher figure is its
            lREACT balance — SYSTEM <code>reserves()</code> reads 0 (no <code>depositTo</code> in
            reactive-lib v0.1.0); <code>react()</code> bills against balance.
          </CardDescription>
        </div>
        {health.isMock ? (
          <Badge variant='outline' className='border-border bg-muted text-muted-foreground'>
            RECORDED RUN — TESTNET
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className='flex flex-col gap-5'>
        {warning ? (
          <Alert className='border-border bg-muted text-foreground'>
            <Icons.warning className='size-4' />
            <AlertTitle>Funding warning</AlertTitle>
            <AlertDescription className='text-foreground'>{warning}</AlertDescription>
          </Alert>
        ) : null}

        <div className='grid gap-4 md:grid-cols-2'>
          {/* Watcher */}
          <div className='flex flex-col gap-2 rounded-none border p-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-semibold'>Watcher — Lasna</span>
              <Badge
                variant='outline'
                className={cn(
                  health.watcher.status === 'active'
                    ? 'border-foreground/30 bg-muted text-foreground'
                    : 'border-border bg-muted text-muted-foreground'
                )}
              >
                {health.watcher.status === 'active' ? (
                  <span className='inline-flex items-center gap-1.5'>
                    <span
                      className='inline-block size-2 rounded-full bg-success'
                      aria-hidden
                    />
                    ACTIVE
                  </span>
                ) : (
                  'INACTIVE'
                )}
              </Badge>
            </div>
            <dl className='flex gap-6 font-mono text-sm tabular-nums'>
              <div>
                <dt className='text-xs text-muted-foreground'>Reserves</dt>
                <dd>{health.watcher.reservesLreact} lREACT</dd>
              </div>
              <div>
                <dt className='text-xs text-muted-foreground'>Debt</dt>
                <dd className={watcherDebt > 0 ? 'text-foreground' : undefined}>
                  {health.watcher.debtLreact} lREACT
                </dd>
              </div>
            </dl>
            <a
              href={EXPLORERS[5318007]}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 hover:underline'
            >
              View on Reactscan
              <Icons.externalLink className='size-3' />
            </a>
            {watcherDebt > 0 ? (
              <CoverDebtButton
                label='Watcher'
                address={ADDRESSES.contagionWatcher as Address}
                abi={CONTAGION_WATCHER_ABI}
                chainId={5318007}
              />
            ) : null}
          </div>

          {/* Siblings */}
          <div className='flex flex-col gap-2 rounded-none border p-3'>
            <span className='text-sm font-semibold'>Sibling vaults — callback reserves</span>
            <ul className='flex flex-col gap-2'>
              {health.siblings.map((sibling) => {
                const debt = Number.parseFloat(sibling.debtEth);
                return (
                  <li key={sibling.siblingId} className='flex flex-col gap-1.5'>
                    <div className='flex items-center justify-between font-mono text-sm tabular-nums'>
                      <span>Vault {sibling.siblingId}</span>
                      <span className='text-muted-foreground'>
                        {sibling.reservesEth} ETH reserves ·{' '}
                        <span className={debt > 0 ? 'text-foreground' : undefined}>
                          {sibling.debtEth} ETH debt
                        </span>
                      </span>
                    </div>
                    {debt > 0 ? (
                      <CoverDebtButton
                        label={`Vault ${sibling.siblingId}`}
                        address={VAULT_ADDRESSES[sibling.siblingId]}
                        abi={SIBLING_VAULT_ABI}
                        chainId={sibling.siblingId === 'B' ? 84532 : 1301}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Debt vs reserves chart */}
        <div className='flex flex-col gap-2'>
          <span className='text-sm font-semibold'>Debt vs reserves</span>
          <div className='h-48 w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray='3 3' stroke='#808080' vertical={false} />
                <XAxis dataKey='name' tick={{ fill: '#404040', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#404040', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #808080',
                    borderRadius: 0,
                    fontSize: 12,
                    color: '#000000'
                  }}
                  formatter={(value, name, props) => [
                    `${value} ${(props?.payload as { unit?: string } | undefined)?.unit ?? ''}`,
                    name
                  ]}
                />
                <Bar dataKey='reserves' name='Reserves' fill='#000080' radius={[0, 0, 0, 0]} />
                <Bar dataKey='debt' name='Debt' fill='#737373' radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className='text-xs text-muted-foreground'>
            Watcher is measured in lREACT, vaults in ETH — bars are per-entity, not directly
            comparable across units.
          </p>
        </div>

        {/* Measured cost reference */}
        <div className='rounded-none border bg-muted px-3 py-2.5'>
          <p className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
            Measured cost reference
          </p>
          <p className='mt-1 font-mono text-xs leading-relaxed tabular-nums'>
            react() fall-through ±{health.costReference.reactFallthroughLreact} lREACT · react() with
            callback ±{health.costReference.reactWithCallbackLreact} lREACT · deploy watcher ±
            {health.costReference.deployWatcherLreact} lREACT · one full loop ≈
            {health.costReference.fullLoopLreact} lREACT · callback Base Sepolia ≈
            {health.costReference.callbackBaseEth} ETH
          </p>
          <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
            Watcher balance 1.2437 lREACT (≈11 full loops at ~0.10–0.11 lREACT each).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
