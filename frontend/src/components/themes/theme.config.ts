/**
 * Default theme that loads when no user preference is set
 * Change this value to set a different default theme
 */
export const DEFAULT_THEME = 'contagionstop-win98';

/**
 * Windows 98 is the ONLY theme (round 2, 15 Nov 2026).
 *
 * The Terminal theme was retired, not just demoted: returning visitors
 * kept getting dark Terminal panels because the `active_theme` cookie
 * (1-year, set while Terminal was the default) overrode DEFAULT_THEME
 * on every server render — the Win98 shell chrome is hardcoded silver
 * / navy, so the chrome looked right while every token-driven panel
 * (cards, log, tables) stayed near-black with a violet accent. The
 * cookie is now ignored server-side (see layout.tsx), overwritten with
 * Win98 client-side (see active-theme.tsx), the Terminal CSS is no
 * longer imported (see styles/theme.css), and the Win98 tokens are
 * pinned on `.win98-scope` (see styles/win98.css) so no stale stored
 * value can resurrect the dark tokens again. Do NOT re-add a dark
 * theme here without also fixing all four of those layers.
 */
export const THEMES = [
  {
    name: 'ContagionStop Windows 98',
    value: 'contagionstop-win98'
  }
];
