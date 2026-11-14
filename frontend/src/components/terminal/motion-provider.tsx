'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'terminal-motion';

interface MotionContextValue {
  /** `false` = all terminal motion off (ambient + typing + marquee + canvas). */
  motionOn: boolean;
  toggleMotion: () => void;
}

const MotionContext = createContext<MotionContextValue>({
  motionOn: true,
  toggleMotion: () => {}
});

export function useMotionPreference(): MotionContextValue {
  return useContext(MotionContext);
}

/**
 * Manual motion switch (research §5.1) + `prefers-reduced-motion` default.
 *
 * Mirrors the state onto `document.documentElement.dataset.motion`
 * (`'on'` | `'off'`), which `src/styles/terminal.css` uses as a kill
 * switch for every ambient animation. Persisted in localStorage; when
 * nothing is stored yet, a reduced-motion OS setting defaults to off.
 * The initial server render has no attribute, so CSS defaults to motion
 * on unless the OS media query says otherwise.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [motionOn, setMotionOn] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'off') {
        setMotionOn(false);
      } else if (stored === 'on') {
        setMotionOn(true);
      } else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setMotionOn(false);
      }
    } catch {
      // Storage unavailable — keep the default.
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = motionOn ? 'on' : 'off';
    try {
      window.localStorage.setItem(STORAGE_KEY, motionOn ? 'on' : 'off');
    } catch {
      // Storage unavailable — state still applies for this session.
    }
  }, [motionOn]);

  const toggleMotion = useCallback(() => {
    setMotionOn((prev) => !prev);
  }, []);

  return (
    <MotionContext.Provider value={{ motionOn, toggleMotion }}>
      {children}
    </MotionContext.Provider>
  );
}
