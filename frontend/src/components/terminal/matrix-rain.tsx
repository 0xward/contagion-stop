'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionAllowed } from '@/components/terminal/use-motion-allowed';

const CHARS = 'CONTAGIONSTOP01';
const FONT_SIZE = 16;
/** ~20 fps (research §2 rank 9): throttle rAF to one draw per 50 ms. */
const TICK_MS = 50;
const MIN_WIDTH_PX = 900;

/**
 * Matrix rain canvas (research rank 9) — characters from the project
 * string falling slowly behind the content, element opacity 7%.
 * Hard gates: never renders when Motion is off / reduced-motion
 * (`useMotionAllowed`), stops entirely below 900px and while the tab is
 * hidden, and clears itself on unmount. One rAF loop, throttled to 50 ms.
 */
export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionAllowed = useMotionAllowed();
  /**
   * `null` until mounted: the server cannot know the viewport width, so
   * the first render (server and client) renders no canvas at all. The
   * effect below fills the real width in — mounting the canvas only
   * after hydration avoids a hydration mismatch.
   */
  const [wide, setWide] = useState<boolean | null>(null);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= MIN_WIDTH_PX);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!motionAllowed || !wide) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = 0;
    let drops: number[] = [];
    let running = false;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const cols = Math.ceil(canvas.width / FONT_SIZE);
      drops = Array.from({ length: cols }, () =>
        Math.floor(Math.random() * (canvas.height / FONT_SIZE))
      );
    };

    const draw = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (now - last < TICK_MS) return;
      last = now;
      ctx.fillStyle = 'rgba(1, 2, 7, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#8b5cf6';
      ctx.font = `${FONT_SIZE}px "JetBrains Mono Variable", monospace`;
      drops.forEach((y, i) => {
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillText(ch, i * FONT_SIZE, y * FONT_SIZE);
        if (y * FONT_SIZE > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i] = y + 1;
        }
      });
    };

    const start = () => {
      if (running) return;
      if (window.innerWidth < MIN_WIDTH_PX) return;
      if (document.hidden) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(draw);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const onResize = () => {
      resize();
      if (window.innerWidth < MIN_WIDTH_PX) stop();
      else start();
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    resize();
    start();
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [motionAllowed, wide]);

  // Dead, not just paused, below 900px: no canvas element at all.
  if (!motionAllowed || wide !== true) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden='true'
      className='pointer-events-none fixed inset-0 z-0 opacity-[0.07]'
    />
  );
}
