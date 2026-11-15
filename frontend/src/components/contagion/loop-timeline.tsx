import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { FreezeProof, LatencyMetrics, TimelineStep } from '@/lib/types';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STEP_MARKERS = ['T0', 'T1', 'T2a', 'T2b'] as const;

function truncateHash(txHash: string): string {
  if (txHash.length <= 13) return txHash;
  return `${txHash.slice(0, 6)}…${txHash.slice(-4)}`;
}

function formatTimestamp(unixSeconds: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }).format(new Date(unixSeconds * 1000));
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface LoopTimelineProps {
  steps: TimelineStep[];
  latency: LatencyMetrics | null;
  /**
   * Freeze proof (post-pause `deposit()` that reverted). Optional — the
   * row is rendered only when a proof is provided.
   */
  freezeProof?: FreezeProof | null;
}

export function LoopTimeline({ steps, latency, freezeProof }: LoopTimelineProps) {
  const isMock = steps.some((step) => step.isMock) || latency?.isMock === true;

  return (
    <Card>
      <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
        <div className='min-w-0'>
          <CardTitle>Containment loop</CardTitle>
          <CardDescription>
            EmergencyPaused → react() → callback pause() on every sibling. Each step shows its
            block timestamp and the gap from the previous step.
          </CardDescription>
        </div>
        <div className='flex flex-col items-start gap-2 sm:items-end'>
          {isMock ? (
            <Badge variant='outline' className='border-primary/40 text-primary'>
              RECORDED RUN — TESTNET
            </Badge>
          ) : null}
          {latency ? (
            <span className='font-mono text-sm tabular-nums'>
              Full loop{' '}
              <span className='font-semibold text-primary'>
                {latency.fullLoopSeconds.toFixed(1)} s
              </span>
            </span>
          ) : (
            <span className='font-mono text-sm text-muted-foreground'>Full loop — not measured yet</span>
          )}
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        {steps.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No loop has run yet — the timeline fills step by step once an incident trips.
          </p>
        ) : (
          <ol className='relative flex flex-col gap-6 border-l border-border pl-6'>
            {steps.map((step, index) => {
              const done = step.status === 'done';
              const marker = STEP_MARKERS[step.step - 1] ?? `T${index}`;
              return (
                <li key={step.step} className='relative'>
                  <span
                    className={cn(
                      'absolute -left-[37px] flex size-6 items-center justify-center rounded-full border',
                      done
                        ? 'border-foreground/30 bg-muted text-foreground'
                        : 'border-border bg-muted text-muted-foreground'
                    )}
                    aria-label={done ? 'Step done' : 'Step pending'}
                  >
                    {done ? (
                      <Icons.check className='size-3.5' />
                    ) : (
                      <Icons.spinner className='size-3.5 animate-spin' />
                    )}
                  </span>
                  <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
                    <span className='text-sm font-semibold'>
                      {step.step}. {step.label}
                    </span>
                    <Badge variant='outline' className='font-mono text-[11px]'>
                      {step.chainName}
                    </Badge>
                    {done ? (
                      <Badge
                        variant='outline'
                        className='border-foreground/30 bg-muted text-foreground'
                      >
                        <Icons.check className='mr-1 size-3' />
                        DONE
                      </Badge>
                    ) : (
                      <Badge variant='outline' className='text-muted-foreground'>
                        PENDING
                      </Badge>
                    )}
                  </div>
                  <p className='mt-1 text-sm text-muted-foreground'>{step.description}</p>
                  <dl className='mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs tabular-nums'>
                    <div className='flex items-center gap-1.5'>
                      <dt className='text-muted-foreground'>{marker}</dt>
                      <dd>
                        {step.blockTimestamp === null
                          ? '—'
                          : `${formatTimestamp(step.blockTimestamp)} UTC`}
                      </dd>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <dt className='text-muted-foreground'>Δ prev</dt>
                      <dd>
                        {step.deltaSecondsFromPrev === null
                          ? '—'
                          : `+${step.deltaSecondsFromPrev.toFixed(1)} s`}
                      </dd>
                    </div>
                    {step.gasUsed !== null ? (
                      <div className='flex items-center gap-1.5'>
                        <dt className='text-muted-foreground'>Gas</dt>
                        <dd>
                          {step.gasUsed.toLocaleString('en-US')}
                          {step.gasLimit !== null
                            ? ` / ${step.gasLimit.toLocaleString('en-US')}`
                            : ''}
                        </dd>
                      </div>
                    ) : null}
                    <div className='flex items-center gap-1.5'>
                      <dt className='text-muted-foreground'>Tx</dt>
                      <dd>
                        {done ? (
                          <a
                            href={`${step.explorerUrl}/tx/${step.txHash}`}
                            target='_blank'
                            rel='noreferrer'
                            className='inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:underline'
                          >
                            {truncateHash(step.txHash)}
                            <Icons.externalLink className='size-3' />
                          </a>
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ol>
        )}

        {latency ? (
          <div className='rounded-lg border bg-muted px-3 py-2.5'>
            <p className='font-mono text-xs leading-relaxed tabular-nums'>
              <span className='text-muted-foreground'>Event → react</span>{' '}
              {latency.eventToReactSeconds.toFixed(1)} s
              <span className='text-muted-foreground'> · React → callback Base</span>{' '}
              {latency.reactToCallbackBaseSeconds.toFixed(1)} s
              <span className='text-muted-foreground'> · React → callback Unichain</span>{' '}
              {latency.reactToCallbackUnichainSeconds.toFixed(1)} s
              <span className='text-muted-foreground'> · Leg Base</span> {latency.legBaseSeconds.toFixed(1)} s
              <span className='text-muted-foreground'> · Leg Unichain</span>{' '}
              {latency.legUnichainSeconds.toFixed(1)} s
            </p>
          </div>
        ) : null}

        {freezeProof && freezeProof.reverted ? (
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-foreground/40 bg-muted px-3 py-2.5'>
            <Icons.lock className='size-4 text-foreground' />
            <span className='text-sm font-medium text-foreground'>
              deposit() revert — deployment frozen
            </span>
            <span className='text-xs text-muted-foreground'>
              Post-pause deposit() on Vault {freezeProof.siblingId} reverted; funds cannot move.
            </span>
            <a
              href={`${freezeProof.explorerUrl}/tx/${freezeProof.txHash}`}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-1 font-mono text-xs text-primary underline underline-offset-2 hover:underline tabular-nums'
            >
              {truncateHash(freezeProof.txHash)}
              <Icons.externalLink className='size-3' />
            </a>
            {freezeProof.isMock ? (
              <Badge variant='outline' className='border-primary/40 text-primary'>
                RECORDED
              </Badge>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
