'use client';

import { useAppKit } from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

/**
 * Shared Win98 guidance box for the "wallet session does not cover this
 * chain" problem: disconnect the dApp, then reconnect and approve every
 * chain offered. Used by the chain-switch error panel and by write-error
 * notices (a deposit/trip rejected because the session lacks the chain).
 * The message stays general on purpose: the observed failure was between
 * two standard chains (Unichain Sepolia → Base Sepolia), so no single
 * chain is blamed.
 *
 * "Disconnect & reconnect" ends the current wallet session and reopens
 * the AppKit modal, so the user can connect again and approve every
 * chain offered in the fresh session.
 */
export default function ReconnectGuidance({
  title,
  children,
  onDismiss
}: {
  title: string;
  children: ReactNode;
  onDismiss: () => void;
}) {
  const { disconnectAsync } = useDisconnect();
  const { open } = useAppKit();

  async function handleReconnect() {
    try {
      await disconnectAsync();
    } catch {
      // A failing disconnect must not block the reconnect — the modal
      // still lets the user connect again from the site.
    }
    onDismiss();
    open();
  }

  return (
    <div
      className='flex flex-col gap-2 rounded-none border border-foreground/40 bg-muted p-2 text-xs'
      role='alert'
    >
      <p className='flex items-start gap-1.5 font-medium'>
        <Icons.warning className='mt-0.5 size-3.5 shrink-0' aria-hidden='true' />
        <span>{title}</span>
      </p>
      {children}
      <div className='flex flex-wrap gap-2'>
        <Button variant='default' size='sm' onClick={() => void handleReconnect()}>
          Disconnect &amp; reconnect
        </Button>
        <Button variant='outline' size='sm' onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
