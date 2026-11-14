'use client';

import type { Address } from 'viem';
import type { Sibling, SiblingId } from '@/lib/types';
import { SiblingCard } from '@/components/contagion/sibling-card';

export interface SiblingGridProps {
  siblings: Sibling[];
  /** `false` = mock simulation, `true` = real contract calls. */
  live: boolean;
  /** Connected wallet address (undefined when disconnected). */
  connectedAddress?: Address;
  /** Mock mode: parent applies the TRIPPED state for this reason. */
  onMockEmergencyPause: (reasonHex: `0x${string}`) => void;
  /** Mock mode: parent marks this vault ACTIVE. */
  onMockUnpause: (siblingId: SiblingId) => void;
}

/** Grid of the three sibling vault cards: A (Origin), B, C. */
export function SiblingGrid({
  siblings,
  live,
  connectedAddress,
  onMockEmergencyPause,
  onMockUnpause
}: SiblingGridProps) {
  return (
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {siblings.map((sibling) => (
        <SiblingCard
          key={sibling.id}
          sibling={sibling}
          live={live}
          connectedAddress={connectedAddress}
          onMockEmergencyPause={onMockEmergencyPause}
          onMockUnpause={onMockUnpause}
        />
      ))}
    </div>
  );
}
