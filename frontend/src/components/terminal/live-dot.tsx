/**
 * LIVE pulse dot (research rank 5) — the one ambient animation allowed
 * to run continuously. 8px green dot, 2s pulse (transform + opacity
 * only). Static green, no pulse, under reduced-motion / motion off
 * (see `src/styles/terminal.css`).
 */
export function LiveDot({ className }: { className?: string }) {
  return <span className={`live-dot ${className ?? ''}`} aria-hidden='true' />;
}
