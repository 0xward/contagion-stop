'use client';

import { useEffect, useState } from 'react';
import { useMotionPreference } from '@/components/terminal/motion-provider';

/**
 * `true` only when JS-driven motion is actually wanted: the manual Motion
 * switch is on AND the OS does not ask for reduced motion. Use it to gate
 * JS animations (`motion` springs, typing, replay streaming, canvas)
 * that the CSS kill-switches in `terminal.css` cannot stop. Listens to
 * `prefers-reduced-motion` changes while mounted.
 */
export function useMotionAllowed(): boolean {
  const { motionOn } = useMotionPreference();
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return motionOn && !reduced;
}
