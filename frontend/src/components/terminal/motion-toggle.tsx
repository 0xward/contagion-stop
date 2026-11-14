'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useMotionPreference } from '@/components/terminal/motion-provider';

/**
 * Manual motion switch (research §5.1, WCAG 2.2.2 / 2.3.3): lets anyone
 * turn every terminal animation off even when their OS has motion on.
 * State lives in MotionProvider; the button only reflects and toggles it.
 */
export function MotionToggle() {
  const { motionOn, toggleMotion } = useMotionPreference();

  return (
    <Button
      variant='outline'
      size='sm'
      onClick={toggleMotion}
      aria-pressed={motionOn}
      aria-label={motionOn ? 'Turn motion off' : 'Turn motion on'}
      className='w-full justify-start font-mono text-[11px] tracking-[0.14em] uppercase'
    >
      <Icons.activity className='size-3.5' />
      Motion: {motionOn ? 'On' : 'Off'}
    </Button>
  );
}
