'use client';

import { useEffect, useState } from 'react';
import { EXPLORERS } from '@/lib/config';
import { Icons } from '@/components/icons';
import { formatWriteError } from '@/lib/format-write-error';
import ReconnectGuidance from '@/components/web3/reconnect-guidance';

/**
 * One short human line for a failed write (deposit / trip / approve /
 * create / register). Never renders a raw viem error dump — no request
 * arguments, calldata, docs links, or versions.
 *
 * When the wallet rejected the write because its session does not cover
 * the chain, the full disconnect + reconnect guidance box is shown
 * instead of the one-liner. When the transaction was mined and reverted,
 * the explorer link to the hash is shown next to the message.
 */
export default function WriteErrorNotice({
  error,
  chainId,
  txHash,
  crossChainWrite
}: {
  error: unknown;
  chainId: number;
  txHash?: `0x${string}`;
  crossChainWrite?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  // A new failure re-shows the notice after a previous dismiss.
  useEffect(() => {
    setDismissed(false);
  }, [error]);

  if (dismissed) return null;
  const formatted = formatWriteError(error, { crossChainWrite });

  if (formatted.needsReconnect) {
    return (
      <ReconnectGuidance
        title='Could not send this transaction.'
        onDismiss={() => setDismissed(true)}
      >
        <p>{formatted.shortMessage}</p>
        <p>
          To fix it: disconnect this site in your wallet, then connect again
          from this site and approve all chains offered. If the network is
          missing from your wallet entirely, add it manually first — the
          network details are in the{' '}
          <a href='/faq' className='text-primary underline underline-offset-2 hover:underline'>
            FAQ
          </a>
          .
        </p>
      </ReconnectGuidance>
    );
  }

  return (
    <p className='text-xs text-foreground' role='alert'>
      <span className='inline-flex items-start gap-1.5'>
        <Icons.alertCircle className='mt-0.5 size-3.5 shrink-0' aria-hidden='true' />
        <span>
          {formatted.shortMessage}
          {formatted.kind === 'reverted' && txHash ? (
            <>
              {' '}
              <a
                href={`${EXPLORERS[chainId].url}/tx/${txHash}`}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-1 font-mono break-all text-primary underline underline-offset-2 hover:underline'
              >
                {txHash.slice(0, 10)}…{txHash.slice(-4)}
                <Icons.externalLink className='size-3 shrink-0' />
              </a>
            </>
          ) : null}
        </span>
      </span>
    </p>
  );
}
