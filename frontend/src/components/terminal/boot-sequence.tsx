'use client';

import { useEffect, useState } from 'react';
import { Terminal } from '@/components/magicui/terminal';

export interface BootSequenceProps {
  /** Full lines, typed in order (each already includes its `> ` prompt). */
  lines: string[];
}

/**
 * Typing + boot sequence (research rank 3) — runs ONCE per tab session
 * when the Overview loads: 18 ms/char, 150 ms between lines, blinking
 * block cursor at the end. Resting state is the full text: under
 * `prefers-reduced-motion`, with Motion off, or on repeat visits in the
 * same tab, every line renders instantly instead of typing.
 */
export function BootSequence({ lines }: BootSequenceProps) {
  const [doneLines, setDoneLines] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [finished, setFinished] = useState(false);
  const linesKey = lines.join('\n');

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };
    const showAll = () => {
      if (cancelled) return;
      setDoneLines(lines);
      setCurrent('');
      setFinished(true);
    };

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'off'
    ) {
      showAll();
      return;
    }
    try {
      if (window.sessionStorage.getItem('terminal-boot-done') === '1') {
        showAll();
        return;
      }
    } catch {
      // Storage unavailable — type anyway.
    }

    let delay = 0;
    lines.forEach((line, li) => {
      for (let ci = 1; ci <= line.length; ci++) {
        const at = delay + ci * 18;
        later(() => {
          if (cancelled) return;
          setDoneLines(lines.slice(0, li));
          setCurrent(line.slice(0, ci));
        }, at);
      }
      delay += line.length * 18 + 150;
      later(() => {
        if (cancelled) return;
        setDoneLines(lines.slice(0, li + 1));
        setCurrent('');
      }, delay);
    });
    later(() => {
      if (cancelled) return;
      setFinished(true);
      try {
        window.sessionStorage.setItem('terminal-boot-done', '1');
      } catch {
        // Storage unavailable — harmless.
      }
    }, delay + 50);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
    // Lines are static per scenario; re-run only when their content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey]);

  // Window chrome comes from Magic UI `Terminal` (registry copy-paste,
  // `sequence={false}` so it renders plain children); the typing logic
  // above stays custom so the sequence runs once per tab session and
  // renders instantly under reduced-motion / Motion off.
  return (
    <div aria-label='Boot sequence'>
      <Terminal sequence={false} className='max-h-none max-w-none rounded-none'>
        <div
          className='px-1 py-1 font-mono text-xs leading-relaxed tabular-nums'
          role='log'
          aria-live='off'
        >
          {doneLines.map((line) => (
            <p key={line} className='break-words whitespace-pre-wrap'>
              {line}
            </p>
          ))}
          {!finished ? (
            <p className='break-words whitespace-pre-wrap'>
              {current}
              <span className='term-cursor' aria-hidden='true'>
                █
              </span>
            </p>
          ) : (
            <p aria-hidden='true'>
              <span className='term-cursor'>█</span>
            </p>
          )}
        </div>
      </Terminal>
    </div>
  );
}
