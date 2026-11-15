'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const LOGO_SRC = {
  ETH: '/icons/eth.svg',
  USDC: '/icons/usdc.svg'
} as const;

export type AssetSymbol = keyof typeof LOGO_SRC;

export interface AssetLogoProps {
  asset: AssetSymbol;
  /** Pixel size (square). Default 18 — small, next to a card title. */
  size?: number;
  className?: string;
}

/**
 * Asset logo, local file only (never a hotlink).
 *
 * Source: spothq/cryptocurrency-icons, svg/color/eth.svg + usdc.svg,
 * CC0 1.0 Universal (see public/icons/README.md). The images were
 * verified visually before use: ETH is the white diamond on a blue
 * circle, USDC is the white "$" on a blue circle. Used for asset
 * identification only. If the local file fails to load, the component
 * falls back to a plain text symbol badge — never a broken image.
 */
export function AssetLogo({ asset, size = 18, className }: AssetLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <Badge variant='outline' className='border-primary/40 text-primary'>
        {asset}
      </Badge>
    );
  }

  return (
    <img
      src={LOGO_SRC[asset]}
      alt={`${asset} logo`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn('shrink-0', className)}
      draggable={false}
    />
  );
}
