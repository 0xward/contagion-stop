'use client';

import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { useMotionAllowed } from '@/components/terminal/use-motion-allowed';
import type { Incident, LatencyMetrics } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface HeroStatusProps {
  /** `null` when no incident is in progress (calm state). */
  incident: Incident | null;
  /** `null` before any loop has been measured (calm state). */
  latency: LatencyMetrics | null;
}

/** UTC timestamp, e.g. "Fri, 14 Nov 2026 05:00:00 GMT". */
export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toUTCString();
}

function formatSeconds(value: number): string {
  return `${value.toFixed(1)} s`;
}

function truncateHex(hex: string): string {
  return hex.length > 14 ? `${hex.slice(0, 10)}…${hex.slice(-4)}` : hex;
}

function LatencyMetric({
  label,
  value,
  sub,
  large = false,
  numericValue,
  decimalPlaces = 1,
  suffix = ''
}: {
  label: string;
  value: string;
  sub?: string;
  large?: boolean;
  /** When set, the value counts via NumberTicker (only on meaningful change). */
  numericValue?: number;
  decimalPlaces?: number;
  suffix?: string;
}) {
  const motionAllowed = useMotionAllowed();

  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-primary tabular-nums',
          large ? 'text-3xl font-semibold' : 'text-lg font-medium'
        )}
      >
        {numericValue !== undefined ? (
          motionAllowed ? (
            <>
              <NumberTicker
                value={numericValue}
                decimalPlaces={decimalPlaces}
                className='text-primary'
              />
              {suffix}
            </>
          ) : (
            `${numericValue.toFixed(decimalPlaces)}${suffix}`
          )
        ) : (
          value
        )}
      </span>
      {sub ? <span className='text-muted-foreground text-xs'>{sub}</span> : null}
    </div>
  );
}

/**
 * Global status hero: incident banner + confirmation ring + latency numbers.
 *
 * Ring: `react-countdown-circle-timer` reused as a confirmation-progress
 * ring (ux-ui-notes §4b). `duration` = number of siblings to confirm (2);
 * `initialRemainingTime` = still unconfirmed, so the filled arc grows with
 * confirmations. The timer never ticks (`isPlaying={false}`) — it is a
 * progress gauge, not a countdown.
 */
export function HeroStatus({ incident, latency }: HeroStatusProps) {
  const confirmed = incident?.confirmedCount ?? 0;
  const total = incident?.confirmedTotal ?? 2;
  const ringTotal = Math.max(total, 1);
  const ringColor =
    confirmed === 0 ? '#525252' : confirmed < total ? '#000080' : '#008000';

  const isMock = incident?.isMock ?? latency?.isMock ?? false;
  const isContained = incident?.status === 'CONTAINED';
  const isTripped = incident?.status === 'ACTIVE';

  return (
    <Card>
      <CardContent className='flex flex-col gap-6 p-4 md:p-6'>
        {/* ---- Incident banner ---- */}
        <div
          className={cn(
            'flex flex-col gap-3 rounded-none border p-3 sm:flex-row sm:flex-wrap sm:items-start',
            isTripped && 'border-foreground/40 bg-muted',
            isContained && 'border-foreground/40 bg-muted',
            !incident && 'border-foreground/30 bg-muted'
          )}
          role='status'
        >
          {isTripped ? (
            <Icons.warning className='mt-0.5 size-5 shrink-0 text-foreground' />
          ) : isContained ? (
            <Icons.circleCheck className='mt-0.5 size-5 shrink-0 text-foreground' />
          ) : (
            <Icons.circleCheck className='mt-0.5 size-5 shrink-0 text-foreground' />
          )}
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold'>
              {isTripped && (
                <>
                  <span key='tripped' className='term-glitch'>
                    TRIPPED
                  </span>
                  {` — Incident ACTIVE, containment in progress ${confirmed}/${total}`}
                </>
              )}
              {isContained && (
                <>
                  <span key='contained' className='term-glitch'>
                    CONTAINED
                  </span>
                  {` — all siblings confirmed paused${
                    incident?.containedInSeconds != null
                      ? ` in ${formatSeconds(incident.containedInSeconds)} (T2 − T0)`
                      : ''
                  }. Unpause manually per deployment after audit.`}
                </>
              )}
              {!incident && 'All deployments ACTIVE — no incident in progress.'}
            </p>
            {incident ? (
              <p className='text-muted-foreground mt-1 font-mono text-xs break-all tabular-nums'>
                Origin {incident.originSiblingId} · reason{' '}
                {truncateHex(incident.reason)}
                {incident.reasonLabel ? ` (${incident.reasonLabel})` : ''} ·
                trippedAt {formatTimestamp(incident.trippedAt)}
              </p>
            ) : null}
          </div>
          {isMock ? (
            <Badge variant='outline' className='border-primary/40 text-primary shrink-0'>
              <Icons.circleCheck className='mr-1 size-3.5' />
              RECORDED
            </Badge>
          ) : null}
        </div>

        {/* ---- Containment progress (transform scaleX, never width) ---- */}
        {incident ? (
          <div>
            <div className='flex items-center justify-between font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase'>
              <span>Containment</span>
              <span className='tabular-nums'>
                {confirmed}/{total} — {Math.round((confirmed / ringTotal) * 100)}%
              </span>
            </div>
            <div
              className='mt-1.5 h-2 w-full overflow-hidden bg-muted'
              role='progressbar'
              aria-valuenow={Math.round((confirmed / ringTotal) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label='Containment progress'
            >
              <div
                className={cn(
                  'containment-fill containment-shimmer h-full',
                  confirmed >= total ? 'bg-success' : 'bg-primary'
                )}
                style={{ transform: `scaleX(${confirmed / ringTotal})` }}
              />
            </div>
          </div>
        ) : null}

        <div className='flex flex-col gap-6 lg:flex-row lg:items-start'>
          {/* ---- Confirmation ring ---- */}
          <div className='flex shrink-0 items-center gap-4'>
            <CountdownCircleTimer
              isPlaying={false}
              duration={ringTotal}
              initialRemainingTime={ringTotal - confirmed}
              size={132}
              strokeWidth={10}
              trailStrokeWidth={10}
              colors={ringColor}
              trailColor='#dfdfdf'
            >
              {() => (
                <div className='flex flex-col items-center'>
                  <span className='font-mono text-2xl font-semibold tabular-nums'>
                    {confirmed}/{total}
                  </span>
                  <span className='text-muted-foreground text-[10px] tracking-wide uppercase'>
                    confirmed
                  </span>
                </div>
              )}
            </CountdownCircleTimer>
            <div className='flex flex-col gap-1 text-sm'>
              <span className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
                Sibling confirmed paused
              </span>
              {incident ? (
                <>
                  {incident.confirmedSiblings.map((id) => (
                    <span key={id} className='inline-flex items-center gap-1 text-foreground'>
                      {id}
                      <Icons.check className='size-3.5' />
                    </span>
                  ))}
                  {incident.pendingSiblings.map((id) => (
                    <span key={id} className='text-muted-foreground'>
                      {id} …
                    </span>
                  ))}
                  {incident.confirmedSiblings.length === 0 &&
                  incident.pendingSiblings.length === 0 ? (
                    <span className='text-muted-foreground'>—</span>
                  ) : null}
                </>
              ) : (
                <span className='text-muted-foreground'>
                  No siblings confirmed — no incident in progress.
                </span>
              )}
            </div>
          </div>

          {/* ---- Latency numbers ---- */}
          <div className='grid flex-1 grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3'>
            <LatencyMetric
              label='Full loop (T2 − T0)'
              value={latency ? formatSeconds(latency.fullLoopSeconds) : '—'}
              sub={latency ? 'max(T2a, T2b) − T0' : 'Not measured yet'}
              large
              numericValue={latency?.fullLoopSeconds}
              decimalPlaces={1}
              suffix=' s'
            />
            <LatencyMetric
              label='Event → react (T1 − T0)'
              value={latency ? formatSeconds(latency.eventToReactSeconds) : '—'}
              sub={latency ? 'Unichain → Lasna' : 'Not measured yet'}
              numericValue={latency?.eventToReactSeconds}
              decimalPlaces={1}
              suffix=' s'
            />
            <LatencyMetric
              label='React → callback · Base'
              value={latency ? formatSeconds(latency.reactToCallbackBaseSeconds) : '—'}
              sub={latency ? `Leg B: ${formatSeconds(latency.legBaseSeconds)}` : 'Not measured yet'}
              numericValue={latency?.reactToCallbackBaseSeconds}
              decimalPlaces={1}
              suffix=' s'
            />
            <LatencyMetric
              label='React → callback · Unichain'
              value={latency ? formatSeconds(latency.reactToCallbackUnichainSeconds) : '—'}
              sub={
                latency
                  ? `Leg C: ${formatSeconds(latency.legUnichainSeconds)}`
                  : 'Not measured yet'
              }
              numericValue={latency?.reactToCallbackUnichainSeconds}
              decimalPlaces={1}
              suffix=' s'
            />
            <LatencyMetric
              label='Gas react()'
              value={
                latency
                  ? `${latency.gasReact.toLocaleString('en-US')} / ${latency.gasReactLimit.toLocaleString('en-US')}`
                  : '—'
              }
              sub='gas used / limit'
            />
            <LatencyMetric
              label='Gas callback'
              value={
                latency
                  ? `${latency.gasCallbackBase.toLocaleString('en-US')} (B) · ${latency.gasCallbackUnichain.toLocaleString('en-US')} (C)`
                  : '—'
              }
              sub={
                latency
                  ? `/ ${latency.gasCallbackLimit.toLocaleString('en-US')} gas per destination`
                  : 'Not measured yet'
              }
            />
          </div>
        </div>

        {latency?.isMock ? (
          <div className='border-t pt-4'>
            <p className='text-xs text-foreground'>
              Measured on-chain 14 Nov 2026 (scenario 1) — static snapshot, not live-polled.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
