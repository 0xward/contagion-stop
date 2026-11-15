'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { LiveDot } from '@/components/terminal/live-dot';
import { useMotionAllowed } from '@/components/terminal/use-motion-allowed';
import { getChainName } from '@/lib/wagmi';
import type { FreezeProof, Incident, TimelineStep } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface LiveLogProps {
  steps: TimelineStep[];
  incidents: Incident[];
  freezeProof?: FreezeProof | null;
}

interface LogRow {
  key: string;
  time: number | null;
  kind: 'LIVE' | 'RECORDED';
  text: string;
}

const MAX_ROWS = 50;
const REPLAY_STEP_MS = 350;

function formatClock(unixSeconds: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }).format(new Date(unixSeconds * 1000));
}

function truncateHash(hash: string): string {
  return hash.length > 13 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
}

/**
 * LIVE LOG (research rank 1) — a terminal log stream built ONLY from real
 * data, with the source of every row labeled:
 * - `[LIVE]` rows come from the current wallet connection (wagmi state).
 * - `[RECORDED]` rows replay the measured testnet run #1–#3 (14 Nov 2026):
 *   timeline steps, incident trips and the freeze proof, in time order.
 * Nothing here is invented: no random log lines are generated to look
 * alive. Replay streams the recorded rows one by one (or all at once
 * under reduced-motion / Motion off); Pause halts the stream (WCAG 2.2.2).
 * Auto-scroll only fires while the user is already at the bottom.
 */
export function LiveLog({ steps, incidents, freezeProof }: LiveLogProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const motionAllowed = useMotionAllowed();

  const [rows, setRows] = useState<LogRow[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [paused, setPaused] = useState(false);
  /** Wall-clock for the LIVE row — client-only, set after hydration. */
  const [now, setNow] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const pausedRef = useRef(false);
  const streamingRef = useRef(false);

  const recordedRows = useMemo<LogRow[]>(() => {
    const out: LogRow[] = [];
    for (const step of steps) {
      if (step.blockTimestamp === null) {
        out.push({
          key: `step-${step.step}-pending`,
          time: null,
          kind: 'RECORDED',
          text: `${step.label} — ${step.chainName} — PENDING`
        });
      } else {
        out.push({
          key: `step-${step.step}`,
          time: step.blockTimestamp,
          kind: 'RECORDED',
          text: `${step.label} — ${step.chainName} — TX ${truncateHash(step.txHash)} — GAS ${step.gasUsed?.toLocaleString('en-US') ?? '—'}`
        });
      }
    }
    incidents.forEach((incident, i) => {
      out.push({
        key: `incident-${incident.id}`,
        time: incident.trippedAt,
        kind: 'RECORDED',
        text: `INCIDENT #${i + 1} TRIPPED — ORIGIN ${incident.originSiblingId} — ${incident.reasonLabel ?? 'EXPLOIT'} — CONTAINED IN ${incident.containedInSeconds ?? '—'} S`
      });
    });
    if (freezeProof?.reverted) {
      out.push({
        key: 'freeze-proof',
        time: null,
        kind: 'RECORDED',
        text: `DEPOSIT() REVERT — VAULT ${freezeProof.siblingId} FROZEN — TX ${truncateHash(freezeProof.txHash)}`
      });
    }
    return out.sort((a, b) => (a.time ?? 0) - (b.time ?? 0)).slice(-MAX_ROWS);
  }, [steps, incidents, freezeProof]);

  const liveRows = useMemo<LogRow[]>(() => {
    // `now` is null on the server and on the first client render (set by
    // the effect below after hydration), so the clock never mismatches
    // between server HTML and the hydrated client.
    if (isConnected && address) {
      return [
        {
          key: 'live-wallet',
          time: now,
          kind: 'LIVE',
          text: `WALLET ${address.slice(0, 6)}…${address.slice(-4)} CONNECTED — CHAIN ${getChainName(chainId).toUpperCase()}`
        }
      ];
    }
    return [
      {
        key: 'live-wallet',
        time: now,
        kind: 'LIVE',
        text: 'WALLET NOT CONNECTED — CONNECT TO SEND TRANSACTIONS'
      }
    ];
  }, [isConnected, address, chainId, now]);

  const allRows = useMemo(() => [...recordedRows, ...liveRows], [recordedRows, liveRows]);

  // Resting state: the full log is visible (no animation required).
  useEffect(() => {
    setRows(allRows);
  }, [allRows]);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
  }, [isConnected, address, chainId]);

  // Auto-scroll only while the user is already at the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottomRef.current && !pausedRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [rows]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }

  /** Replay the recorded run, row by row (instant when motion is off). */
  function handleReplay() {
    if (streamingRef.current) return;
    setPaused(false);
    setStreaming(true);
    nearBottomRef.current = true;
    if (!motionAllowed) {
      setRows(allRows);
      setStreaming(false);
      return;
    }
    setRows([]);
    let i = 0;
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      i += 1;
      setRows(allRows.slice(0, i));
      if (i >= allRows.length) {
        window.clearInterval(timer);
        setStreaming(false);
      }
    }, REPLAY_STEP_MS);
  }

  return (
    <Card>
      <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
        <div className='min-w-0'>
          <CardTitle className='flex items-center gap-2'>
            <LiveDot />
            Live log
          </CardTitle>
          <CardDescription>
            Wallet state as it is now (LIVE) + the measured testnet run
            (RECORDED). No generated lines.
          </CardDescription>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline' className='border-primary/40 text-primary'>
            RECORDED RUN — TESTNET
          </Badge>
          <Button
            variant='outline'
            size='sm'
            onClick={handleReplay}
            disabled={streaming}
            className='font-mono text-[11px] tracking-[0.14em] uppercase'
          >
            <Icons.play className='size-3.5' />
            Replay run
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPaused((prev) => !prev)}
            disabled={!streaming}
            aria-pressed={paused}
            className='font-mono text-[11px] tracking-[0.14em] uppercase'
          >
            {paused ? <Icons.play className='size-3.5' /> : <Icons.pause className='size-3.5' />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role='log'
          aria-live='off'
          aria-label='Live log — wallet state and recorded run events'
          className='h-64 overflow-y-auto border bg-white p-3 font-mono text-xs leading-relaxed tabular-nums'
        >
          {rows.length === 0 ? (
            <p className='text-muted-foreground'>Replaying recorded run…</p>
          ) : (
            rows.map((row) => (
              <p key={row.key} className='break-words whitespace-pre-wrap'>
                <span className='text-muted-foreground'>
                  [{row.time === null ? '--:--:--' : formatClock(row.time)}]{' '}
                </span>
                <span
                  className={cn(
                    'font-semibold',
                    row.kind === 'LIVE' ? 'text-success' : 'text-primary'
                  )}
                >
                  [{row.kind}]
                </span>{' '}
                <span>{row.text}</span>
              </p>
            ))
          )}
        </div>
        <p className='mt-2 text-xs text-muted-foreground'>
          Rows labeled RECORDED are the measured testnet run #1–#3 (14 Nov
          2026). Rows labeled LIVE reflect the current wallet connection.
        </p>
      </CardContent>
    </Card>
  );
}
