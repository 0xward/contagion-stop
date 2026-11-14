'use client';

import { useState } from 'react';
import { Marquee } from '@/components/magicui/marquee';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import {
  ACTIVE_INCIDENT_SCENARIO,
  RECORDED_INCIDENT_HISTORY,
  RECORDED_TIMELINE
} from '@/lib/mock-data';

interface StripItem {
  hash: string;
  label: string;
  chain: string;
}

function truncateHash(hash: string): string {
  return hash.length > 13 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
}

/**
 * Tx strip (research rank 8) — Magic UI `Marquee` over REAL recorded
 * hashes only: the 4 loop txs, the 3 incident emergencyPause txs and the
 * freeze-proof tx from the measured testnet run #1–#3 (14 Nov 2026),
 * deduplicated by hash. Plain text, no links — a moving strip must not
 * carry links that are hard to read or click. Seamless loop: every item
 * carries its own horizontal margin and the marquee gap is 0, so a
 * -50% shift lands exactly on the duplicate copy. Pause button (WCAG
 * 2.2.2) + pause on hover; static under reduced-motion / Motion off.
 */
export function TxMarquee() {
  const [paused, setPaused] = useState(false);

  const items: StripItem[] = [];
  const seen = new Set<string>();
  const push = (hash: string, label: string, chain: string) => {
    if (!hash || seen.has(hash)) return;
    seen.add(hash);
    items.push({ hash, label, chain });
  };
  push(RECORDED_TIMELINE[0]?.txHash ?? '', 'EMERGENCYPAUSE', 'UNICHAIN');
  push(RECORDED_TIMELINE[1]?.txHash ?? '', 'REACT()', 'LASNA');
  push(RECORDED_TIMELINE[2]?.txHash ?? '', 'CALLBACK PAUSE() B', 'BASE');
  push(RECORDED_TIMELINE[3]?.txHash ?? '', 'CALLBACK PAUSE() C', 'UNICHAIN');
  RECORDED_INCIDENT_HISTORY.forEach((incident, i) => {
    push(incident.emergencyPauseTxHash, `INCIDENT #${i + 1} TRIPPED`, 'UNICHAIN');
  });
  const freeze = ACTIVE_INCIDENT_SCENARIO.freezeProof;
  if (freeze) push(freeze.txHash, 'DEPOSIT() REVERT — FROZEN', 'BASE');

  const row = (hidden: boolean) => (
    <span aria-hidden={hidden || undefined} className='contents'>
      {items.map((item) => (
        <span
          key={`${hidden ? 'dup-' : ''}${item.hash}`}
          className='mx-2 flex items-center gap-2 font-mono text-[11px] whitespace-nowrap tabular-nums'
        >
          <span className='text-primary'>{truncateHash(item.hash)}</span>
          <span className='text-muted-foreground'>
            {item.label} · {item.chain}
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <div
      className='tx-marquee flex items-stretch border-b bg-card'
      data-paused={paused ? 'true' : 'false'}
      aria-label='Latest recorded transactions'
    >
      <Marquee
        className='min-w-0 flex-1'
        style={{ '--gap': '0rem' } as React.CSSProperties}
        pauseOnHover
        repeat={2}
      >
        {row(false)}
        {row(true)}
      </Marquee>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setPaused((prev) => !prev)}
        aria-pressed={paused}
        aria-label={paused ? 'Resume transaction ticker' : 'Pause transaction ticker'}
        className='shrink-0 self-center rounded-none border-l font-mono text-[11px] tracking-[0.14em] uppercase'
      >
        {paused ? <Icons.play className='size-3.5' /> : <Icons.pause className='size-3.5' />}
        {paused ? 'Resume' : 'Pause'}
      </Button>
    </div>
  );
}
