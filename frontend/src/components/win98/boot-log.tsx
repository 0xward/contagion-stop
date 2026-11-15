'use client';

import { useEffect, useState } from 'react';

export interface Win98BootLogProps {
  /** Full lines, typed in order (each already includes its `> ` prompt). */
  lines: string[];
}

/**
 * Boot log in a Windows 98 window (replaces the terminal BootSequence):
 * the same recorded-run lines, typed once per tab session (18 ms/char,
 * 150 ms between lines) inside a sunken white panel, with a blinking
 * block cursor at the end. Resting state is the full text: under
 * `prefers-reduced-motion`, with Motion off, or on repeat visits in the
 * same tab, every line renders instantly instead of typing.
 */
export function Win98BootLog({ lines }: Win98BootLogProps) {
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

    // MotionProvider reads localStorage in its own effect, which runs
    // after this one — check the stored value directly so a stored
    // "off" never types for a frame.
    let motionOff = false;
    try {
      motionOff = window.localStorage.getItem('terminal-motion') === 'off';
    } catch {
      // Storage unavailable — type anyway.
    }
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'off' ||
      motionOff
    ) {
      showAll();
      return;
    }
    try {
      if (window.sessionStorage.getItem('win98-bootlog-done') === '1') {
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
        window.sessionStorage.setItem('win98-bootlog-done', '1');
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

  return (
    <div className='window' aria-label='Boot log'>
      <div className='title-bar'>
        <div className='title-bar-text'>BOOT.LOG — C:\CONTAINMENT</div>
      </div>
      <div className='window-body'>
        <div
          className='sunken-panel px-2 py-1 font-mono text-xs leading-relaxed tabular-nums'
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
              <span className='win98-cursor' aria-hidden='true'>
                █
              </span>
            </p>
          ) : (
            <p aria-hidden='true'>
              <span className='win98-cursor'>█</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
