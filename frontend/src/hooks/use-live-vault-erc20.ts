'use client';

import { useEffect, useState } from 'react';
import { formatUnits, type Address } from 'viem';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import {
  CONTAGION_WATCHER_ABI,
  ERC20_ABI,
  ERC20_VAULT_ABI
} from '@/lib/contracts';
import { USDC_ADDRESSES, WATCHER_V2 } from '@/lib/config';

/**
 * Live reads for one ERC-20 vault (ContagionVaultERC20): paused() +
 * totalAssets() + totalSupply() + share metadata + the vault's asset
 * balance + the connected wallet's share balance + watcher registration.
 * Reads run against the vault's own chain (wagmi routes by chainId),
 * except the watcher registration, which is read on Lasna.
 * When a read is still loading or fails (e.g. a public RPC refusing
 * eth_call), the caller falls back to an honest failed-read state and
 * labels it — never a silent stale value presented as live.
 * All numbers come from chain. No value here is a placeholder.
 */
export function useLiveVaultErc20(address: Address, chainId: number) {
  const queryClient = useQueryClient();
  const { address: connectedAddress } = useAccount();
  const asset = USDC_ADDRESSES[chainId];

  const paused = useReadContract({
    address,
    abi: ERC20_VAULT_ABI,
    functionName: 'paused',
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const totalAssets = useReadContract({
    address,
    abi: ERC20_VAULT_ABI,
    functionName: 'totalAssets',
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const totalSupply = useReadContract({
    address,
    abi: ERC20_VAULT_ABI,
    functionName: 'totalSupply',
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const shareName = useReadContract({
    address,
    abi: ERC20_VAULT_ABI,
    functionName: 'name',
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const shareSymbol = useReadContract({
    address,
    abi: ERC20_VAULT_ABI,
    functionName: 'symbol',
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const minDeposit = useReadContract({
    address,
    abi: ERC20_VAULT_ABI,
    functionName: 'minDeposit',
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const watcher = useReadContract({
    address,
    abi: ERC20_VAULT_ABI,
    functionName: 'watcher',
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const owner = useReadContract({
    address,
    abi: ERC20_VAULT_ABI,
    functionName: 'owner',
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  /** USDC actually sitting in the vault (may differ from the ledger). */
  const assetBalance = useReadContract({
    address: asset,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  /** Shares held by the connected wallet (undefined while disconnected). */
  const userShares = useReadContract({
    address,
    abi: ERC20_VAULT_ABI,
    functionName: 'balanceOf',
    args: [connectedAddress ?? '0x0000000000000000000000000000000000000000'],
    chainId,
    query: {
      enabled: connectedAddress !== undefined,
      refetchInterval: 30_000,
      retry: 1,
      retryDelay: 1000
    }
  });
  /** ETH in the vault — the reserve coverDebt() pays callback debt from. */
  const ethBalance = useBalance({
    address,
    chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  /** Registration in watcher v2, read on Lasna. */
  const registered = useReadContract({
    address: WATCHER_V2.address,
    abi: CONTAGION_WATCHER_ABI,
    functionName: 'registeredSibling',
    args: [BigInt(chainId), address],
    chainId: WATCHER_V2.chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });

  const isLoading =
    paused.isLoading ||
    totalAssets.isLoading ||
    totalSupply.isLoading ||
    assetBalance.isLoading ||
    registered.isLoading;
  /** True once the core reads have resolved at least once. */
  const isLive =
    !isLoading && paused.data !== undefined && totalAssets.data !== undefined;
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
    timedOut ||
    (!isLoading &&
      (paused.isError ||
        totalAssets.isError ||
        totalSupply.isError ||
        assetBalance.isError ||
        registered.isError));

  return {
    /** Live paused() — undefined until the read resolves. */
    paused: paused.data,
    /** Live totalAssets(), raw units (USDC has 6 decimals). */
    totalAssetsRaw: totalAssets.data,
    /** Live totalAssets(), formatted USDC (e.g. "0"). */
    totalAssetsUsdc:
      totalAssets.data !== undefined ? formatUnits(totalAssets.data, 6) : undefined,
    /** Live totalSupply() of shares (18 decimals), formatted. */
    totalSupplyShares:
      totalSupply.data !== undefined ? formatUnits(totalSupply.data, 18) : undefined,
    /** Live share name / symbol — undefined until resolved. */
    shareName: shareName.data,
    shareSymbol: shareSymbol.data,
    /** Live minDeposit(), formatted USDC. */
    minDepositUsdc:
      minDeposit.data !== undefined ? formatUnits(minDeposit.data, 6) : undefined,
    /** Live watcher() of this vault. */
    watcher: watcher.data,
    /** Live owner() of this vault. */
    owner: owner.data,
    /** Live USDC balance of the vault, formatted. */
    assetBalanceUsdc:
      assetBalance.data !== undefined ? formatUnits(assetBalance.data, 6) : undefined,
    /** Live shares of the connected wallet, formatted (undefined while disconnected). */
    userShares:
      userShares.data !== undefined ? formatUnits(userShares.data, 18) : undefined,
    /** Live ETH balance of the vault, raw wei. */
    ethBalanceRaw: ethBalance.data?.value,
    /** Live registration flag in watcher v2 (Lasna). */
    registered: registered.data,
    isLoading,
    isLive,
    hasFailed,
    isError:
      paused.isError ||
      totalAssets.isError ||
      totalSupply.isError ||
      assetBalance.isError ||
      registered.isError,
    /** Re-read all values now (after a transaction confirms). */
    refetch: () => {
      void paused.refetch();
      void totalAssets.refetch();
      void totalSupply.refetch();
      void assetBalance.refetch();
      void registered.refetch();
      void userShares.refetch();
    },
    /** Invalidate every wagmi query (vaults + watcher + wallet). */
    invalidateAll: () => queryClient.invalidateQueries()
  };
}
