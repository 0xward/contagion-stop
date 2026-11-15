'use client';

import { useEffect, useState } from 'react';
import { useMotionAllowed } from '@/components/terminal/use-motion-allowed';

const STORAGE_KEY = 'win98-boot-done';

/**
 * Windows 98-style boot splash: full-screen teal overlay with a small
 * window ("ContagionStop — Starting…") and a segmented progress bar.
 * Shows ONCE per tab session (~1.7s, click to skip). Skipped entirely
 * on repeat visits in the same tab, under `prefers-reduced-motion`,
 * and when the manual Motion switch is off.
 */
export function Win98BootSplash() {
  const motionAllowed = useMotionAllowed();
  const [phase, setPhase] = useState<'pending' | 'show' | 'leaving' | 'done'>(
    'pending'
  );

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const finish = () => {
      if (cancelled) return;
      try {
        window.sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // Storage unavailable — harmless.
      }
      setPhase('done');
    };

    if (!motionAllowed) {
      setPhase('done');
      return;
    }
    // MotionProvider reads the same key in its own effect, which runs
    // after this one — check localStorage directly so a stored "off"
    // never flashes the splash for a frame.
    try {
      if (window.localStorage.getItem('terminal-motion') === 'off') {
        setPhase('done');
        return;
      }
    } catch {
      // Storage unavailable — show the splash anyway.
    }
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === '1') {
        setPhase('done');
        return;
      }
    } catch {
      // Storage unavailable — show the splash anyway.
    }
    setPhase('show');
    later(() => {
      if (cancelled) return;
      setPhase('leaving');
    }, 1700);
    later(finish, 1950);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [motionAllowed]);

  if (phase === 'pending' || phase === 'done') return null;

  const skip = () => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Storage unavailable — harmless.
    }
    setPhase('done');
  };

  return (
    <div
      className='win98-boot-splash fixed inset-0 z-[100] flex items-center justify-center bg-[#008080] p-4'
      data-leaving={phase === 'leaving' ? 'true' : 'false'}
      role='status'
      aria-label='Starting ContagionStop'
      onClick={skip}
    >
      <div className='window w-full max-w-sm' onClick={(e) => e.stopPropagation()}>
        <div className='title-bar'>
          <div className='title-bar-text'>ContagionStop</div>
        </div>
        <div className='window-body'>
          <p className='text-[22px] font-bold tracking-tight text-[#000080]'>
            ContagionStop
          </p>
          <p className='mt-1 text-[12px]'>Cross-chain circuit breaker</p>
          <p className='mt-3 text-[12px]'>Starting ContagionStop…</p>
          <div
            className='progress-indicator segmented mt-2'
            role='progressbar'
            aria-label='Loading ContagionStop'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={phase === 'leaving' ? 100 : 50}
          >
            <span className='progress-indicator-bar win98-boot-bar' />
          </div>
          <p className='mt-3 text-[11px] text-[#404040]'>
            Testnet only
          </p>
          <p className='mt-1 text-[11px] text-[#404040]'>Click anywhere to skip.</p>
        </div>
      </div>
    </div>
  );
}
