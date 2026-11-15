'use client';

import { useEffect, useState } from 'react';
import { formatEther, type Address } from 'viem';
import { useBalance, useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { SIBLING_VAULT_ABI } from '@/lib/contracts';

/**
 * Live reads for one vault: paused() + eth balance + totalDeposited().
 * Reads run against the vault's own chain (wagmi routes by chainId).
 * When a read is still loading or fails (e.g. a public RPC refusing
 * eth_call), the caller falls back to the recorded snapshot and labels
 * it RECORDED — never a silent stale value presented as live.
 */
export function useLiveVault(address: Address, chainId: number) {
  const queryClient = useQueryClient();

  const paused = useReadContract({
    address,
    abi: SIBLING_VAULT_ABI,
    functionName: 'paused',
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const balance = useBalance({
    address,
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const totalDeposited = useReadContract({
    address,
    abi: SIBLING_VAULT_ABI,
    functionName: 'totalDeposited',
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });

  const isLoading =
    paused.isLoading || balance.isLoading || totalDeposited.isLoading;
  /** True once every read has resolved at least once. */
  const isLive = !isLoading && paused.data !== undefined;
  /**
   * Display-level timeout: if the reads have not resolved after 12 s
   * (slow RPC, retry backoff, blocked network), show the failed-read
   * state instead of LOADING forever. The queries keep retrying in the
   * background and flip the card to LIVE the moment they resolve.
   */
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (isLive) return;
    const id = window.setTimeout(() => setTimedOut(true), 12_000);
    return () => window.clearTimeout(id);
  }, [isLive]);
  /** True once the reads have settled with an error (RPC unreachable, ...).
   * The caller must then show a failed-read state, never eternal loading. */
  const hasFailed =
    timedOut || (!isLoading && (paused.isError || balance.isError || totalDeposited.isError));

  return {
    /** Live paused() — undefined until the read resolves. */
    paused: paused.data,
    /** Live ETH balance, formatted (e.g. "0.002") — undefined until resolved. */
    balanceEth:
      balance.data !== undefined ? formatEther(balance.data.value) : undefined,
    /** Live totalDeposited(), formatted — undefined until resolved. */
    totalDepositedEth:
      totalDeposited.data !== undefined
        ? formatEther(totalDeposited.data)
        : undefined,
    isLoading,
    isLive,
    hasFailed,
    isError: paused.isError || balance.isError || totalDeposited.isError,
    /** Re-read all three values now (after a transaction confirms). */
    refetch: () => {
      void paused.refetch();
      void balance.refetch();
      void totalDeposited.refetch();
    },
    /** Invalidate every wagmi query (vaults + watcher + wallet). */
    invalidateAll: () => queryClient.invalidateQueries()
  };
}
