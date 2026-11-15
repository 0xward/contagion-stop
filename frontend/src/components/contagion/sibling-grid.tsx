'use client';

import type { Address } from 'viem';
import type { Sibling } from '@/lib/types';
import { SiblingCard } from '@/components/contagion/sibling-card';

export interface SiblingGridProps {
  siblings: Sibling[];
  /** Connected wallet address (undefined when disconnected). */
  connectedAddress?: Address;
  /** Called with the reason bytes32 + tx hash when a real emergencyPause confirms. */
  onEmergencyPauseSuccess?: (reasonHex: `0x${string}`, hash: `0x${string}`) => void;
}

/** Grid of the three sibling vault cards: A (Origin), B, C — live reads. */
export function SiblingGrid({
  siblings,
  connectedAddress,
  onEmergencyPauseSuccess
}: SiblingGridProps) {
  return (
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {siblings.map((sibling) => (
        <SiblingCard
          key={sibling.id}
          sibling={sibling}
          connectedAddress={connectedAddress}
          onEmergencyPauseSuccess={onEmergencyPauseSuccess}
        />
      ))}
    </div>
  );
}
