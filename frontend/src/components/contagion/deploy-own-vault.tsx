'use client';

import { useEffect, useRef, useState } from 'react';
import {
  decodeEventLog,
  isAddress,
  parseEther,
  parseUnits,
  type Address
} from 'viem';
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract
} from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { Icons } from '@/components/icons';
import { EXPLORERS, USDC_ADDRESSES, V2_FACTORIES, WATCHER_V2 } from '@/lib/config';
import {
  CONTAGION_WATCHER_ABI,
  VAULT_FACTORY_ABI,
  VAULT_FACTORY_ERC20_ABI
} from '@/lib/contracts';
import { AssetLogo } from '@/components/contagion/asset-logo';
import ChainSwitchError from '@/components/web3/chain-switch-error';
import WriteErrorNotice from '@/components/web3/write-error-notice';
import {
  failureOrNull,
  useChainSwitcher,
  type SwitchChainFailure
} from '@/lib/switch-chain';

type ChainKey = 'unichain' | 'base';
type AssetKind = 'ETH' | 'USDC';

const CHAIN_IDS: Record<ChainKey, number> = { unichain: 1301, base: 84532 };
const CHAIN_NAMES: Record<ChainKey, string> = {
  unichain: 'Unichain Sepolia',
  base: 'Base Sepolia'
};
const DEFAULT_NAME: Record<AssetKind, string> = {
  ETH: 'ContagionStop Vault Share',
  USDC: 'ContagionStop USDC Vault Share'
};
const DEFAULT_SYMBOL: Record<AssetKind, string> = {
  ETH: 'CSV',
  USDC: 'CSUSDC'
};
/** Minimum seed for an ETH vault (factory MIN_SEED). */
const MIN_SEED_ETH = '0.001';

function truncateAddress(address: string): string {
  return address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Button variant='ghost' size='icon-xs' onClick={handleCopy} title={label} aria-label={label}>
      {copied ? (
        <Icons.check className='size-3.5 text-foreground' />
      ) : (
        <Icons.copy className='size-3.5' />
      )}
    </Button>
  );
}

/**
 * Deploy your own vault — onboarding through the deployed factories.
 *
 * Flow (all transactions are real, sent from the connected wallet):
 *  1. Pick a chain (Unichain Sepolia / Base Sepolia) and an asset (ETH /
 *     USDC). The factory for that pair is fixed: VaultFactory for ETH,
 *     VaultFactoryERC20 for USDC.
 *  2. Fill in owner, watcher, share name/symbol, min deposit. The owner
 *     defaults to the connected wallet; the watcher defaults to watcher
 *     v2 (Lasna), which already watches the v2 vaults.
 *  3. The predicted vault address is read live (predictVault with the
 *     factory's current vaultCount) BEFORE the transaction is sent.
 *  4. createVault sends the real transaction. An ETH vault needs a seed
 *     of at least 0.001 ETH (sent with the call); a USDC vault is
 *     non-payable and starts empty.
 *  5. After confirmation the created address is taken from the
 *     VaultCreated event in the receipt (falling back to the prediction),
 *     and the panel shows the two remaining manual steps: register the
 *     vault in the watcher (watcher-owner only) and fund it.
 *
 * Buttons are never decorative: create is disabled with a stated reason
 * while the wallet is disconnected, on the wrong chain, or the form is
 * invalid. Register is only offered when the connected wallet owns the
 * watcher; otherwise the exact command for the watcher owner is shown.
 */
export function DeployOwnVault() {
  const { address: connectedAddress, chainId: connectedChainId, isConnected } =
    useAccount();
  const { switchToChain } = useChainSwitcher();
  const [deploySwitchError, setDeploySwitchError] = useState<SwitchChainFailure | null>(null);
  const [lasnaSwitchError, setLasnaSwitchError] = useState<SwitchChainFailure | null>(null);
  const queryClient = useQueryClient();

  const [chainKey, setChainKey] = useState<ChainKey>('unichain');
  const [assetKind, setAssetKind] = useState<AssetKind>('ETH');
  const [owner, setOwner] = useState('');
  const [watcher, setWatcher] = useState<string>(WATCHER_V2.address);
  const [name, setName] = useState(DEFAULT_NAME.ETH);
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL.ETH);
  const [minDepositInput, setMinDepositInput] = useState('');
  const [seedEth, setSeedEth] = useState(MIN_SEED_ETH);
  const [created, setCreated] = useState<{
    vault: Address;
    txHash: `0x${string}`;
    chainId: number;
  } | null>(null);

  const ownerEditedRef = useRef(false);
  const nameEditedRef = useRef(false);
  const symbolEditedRef = useRef(false);

  /** Prefill owner with the connected wallet (until the user edits it). */
  useEffect(() => {
    if (connectedAddress && !ownerEditedRef.current) setOwner(connectedAddress);
  }, [connectedAddress]);

  /** Swap the default share name/symbol when the asset changes. */
  useEffect(() => {
    if (!nameEditedRef.current) setName(DEFAULT_NAME[assetKind]);
    if (!symbolEditedRef.current) setSymbol(DEFAULT_SYMBOL[assetKind]);
  }, [assetKind]);

  const chainId = CHAIN_IDS[chainKey];
  const factory =
    assetKind === 'ETH'
      ? V2_FACTORIES[chainKey].factoryEth
      : V2_FACTORIES[chainKey].factoryErc20;
  const factoryAbi =
    assetKind === 'ETH' ? VAULT_FACTORY_ABI : VAULT_FACTORY_ERC20_ABI;
  const assetAddress = assetKind === 'USDC' ? USDC_ADDRESSES[chainId] : null;

  /* ---- Live prediction: vaultCount + predictVault(creator, owner, nonce) ---- */
  const { data: vaultCount } = useReadContract({
    address: factory.address,
    abi: factoryAbi,
    functionName: 'vaultCount',
    chainId,
    query: { refetchInterval: 15_000, retry: 1, retryDelay: 1000 }
  });
  const ownerValid = isAddress(owner);
  const { data: predicted } = useReadContract({
    address: factory.address,
    abi: factoryAbi,
    functionName: 'predictVault',
    args: [
      connectedAddress ?? '0x0000000000000000000000000000000000000000',
      ownerValid ? (owner as Address) : '0x0000000000000000000000000000000000000000',
      vaultCount ?? BigInt(0)
    ],
    chainId,
    query: {
      enabled: isConnected && ownerValid && vaultCount !== undefined,
      refetchInterval: 15_000,
      retry: 1,
      retryDelay: 1000
    }
  });

  /* ---- Validation ---- */
  const watcherValid = isAddress(watcher);
  const nameValid = name.trim().length >= 1 && name.trim().length <= 64;
  const symbolValid = symbol.trim().length >= 1 && symbol.trim().length <= 16;
  let minDepositRaw: bigint | null = null;
  let minDepositError: string | null = null;
  if (minDepositInput.trim() === '') {
    minDepositRaw = BigInt(0); // factory default: 0.001 ETH / 1 whole asset unit
  } else {
    try {
      minDepositRaw =
        assetKind === 'ETH'
          ? parseEther(minDepositInput.trim())
          : parseUnits(minDepositInput.trim(), 6);
    } catch {
      minDepositError = `Min deposit is not a valid ${assetKind === 'ETH' ? 'ETH' : 'USDC'} amount.`;
    }
  }
  let seedRaw: bigint | null = null;
  let seedError: string | null = null;
  if (assetKind === 'ETH') {
    try {
      seedRaw = parseEther(seedEth.trim() === '' ? '0' : seedEth.trim());
      if (seedRaw < parseEther(MIN_SEED_ETH)) {
        seedError = `Seed must be at least ${MIN_SEED_ETH} ETH (factory MIN_SEED).`;
      }
    } catch {
      seedError = 'Seed is not a valid ETH amount.';
    }
  }
  const onRightChain = isConnected && connectedChainId === chainId;
  const formValid =
    ownerValid &&
    watcherValid &&
    nameValid &&
    symbolValid &&
    minDepositError === null &&
    seedError === null;
  const createDisabledReason = !isConnected
    ? 'Connect a wallet to deploy.'
    : !onRightChain
      ? `Switch to ${CHAIN_NAMES[chainKey]} to deploy here.`
      : !formValid
        ? 'Fix the highlighted fields below.'
        : null;

  /* ---- createVault write + receipt ---- */
  const createTx = useWriteContract();
  const createReceipt = useWaitForTransactionReceipt({
    hash: createTx.data,
    chainId,
    query: { enabled: createTx.data !== undefined }
  });
  const createdRef = useRef<`0x${string}` | null>(null);
  useEffect(() => {
    if (
      !createReceipt.isSuccess ||
      !createReceipt.data ||
      !createTx.data ||
      createdRef.current === createTx.data
    )
      return;
    createdRef.current = createTx.data;
    let vault: Address | null = null;
    for (const log of createReceipt.data.logs) {
      try {
        const decoded = decodeEventLog({
          abi: factoryAbi,
          data: log.data,
          topics: log.topics
        });
        if (decoded.eventName === 'VaultCreated') {
          vault = (decoded.args as { vault: Address }).vault;
          break;
        }
      } catch {
        // Not a VaultCreated log from this factory — keep scanning.
      }
    }
    setCreated({
      vault: vault ?? predicted ?? '0x0000000000000000000000000000000000000000',
      txHash: createTx.data,
      chainId
    });
    void queryClient.invalidateQueries();
  }, [createReceipt.isSuccess, createReceipt.data, createTx.data, factoryAbi, predicted, queryClient]);

  function handleCreate() {
    if (!formValid || !connectedAddress || minDepositRaw === null) return;
    if (assetKind === 'ETH') {
      createTx.writeContract({
        address: factory.address,
        abi: VAULT_FACTORY_ABI,
        functionName: 'createVault',
        args: [
          owner as Address,
          watcher as Address,
          name.trim(),
          symbol.trim(),
          minDepositRaw
        ],
        chainId,
        value: seedRaw ?? parseEther(MIN_SEED_ETH)
      });
    } else {
      createTx.writeContract({
        address: factory.address,
        abi: VAULT_FACTORY_ERC20_ABI,
        functionName: 'createVault',
        args: [
          owner as Address,
          watcher as Address,
          assetAddress as Address,
          name.trim(),
          symbol.trim(),
          minDepositRaw
        ],
        chainId
      });
    }
  }

  /* ---- Watcher registration (after creation) ---- */
  const { data: watcherOwner } = useReadContract({
    address: WATCHER_V2.address,
    abi: CONTAGION_WATCHER_ABI,
    functionName: 'owner',
    chainId: WATCHER_V2.chainId,
    query: { refetchInterval: 30_000, retry: 1, retryDelay: 1000 }
  });
  const isWatcherOwner =
    isConnected &&
    watcherOwner !== undefined &&
    connectedAddress !== undefined &&
    watcherOwner.toLowerCase() === connectedAddress.toLowerCase();
  const { data: createdRegistered } = useReadContract({
    address: WATCHER_V2.address,
    abi: CONTAGION_WATCHER_ABI,
    functionName: 'registeredSibling',
    args: created ? [BigInt(created.chainId), created.vault] : [BigInt(0), '0x0000000000000000000000000000000000000000'],
    chainId: WATCHER_V2.chainId,
    query: {
      enabled: created !== null,
      refetchInterval: 15_000,
      retry: 1,
      retryDelay: 1000
    }
  });
  const registerTx = useWriteContract();
  const registerReceipt = useWaitForTransactionReceipt({
    hash: registerTx.data,
    chainId: WATCHER_V2.chainId,
    query: { enabled: registerTx.data !== undefined }
  });
  useEffect(() => {
    if (registerReceipt.isSuccess) void queryClient.invalidateQueries();
  }, [registerReceipt.isSuccess, queryClient]);
  const onLasna = isConnected && connectedChainId === WATCHER_V2.chainId;

  function handleRegister() {
    if (!created || !isWatcherOwner) return;
    registerTx.writeContract({
      address: WATCHER_V2.address,
      abi: CONTAGION_WATCHER_ABI,
      functionName: 'registerSibling',
      args: [BigInt(created.chainId), created.vault],
      chainId: WATCHER_V2.chainId
    });
  }

  const registerCommand = created
    ? `cast send ${WATCHER_V2.address} "registerSibling(uint256,address)" ${created.chainId} ${created.vault} --rpc-url lasna --private-key $WATCHER_OWNER_KEY`
    : '';

  return (
    <div className='flex flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>1 — Choose chain and asset</CardTitle>
          <CardDescription>
            One factory per chain. VaultFactory creates ETH vaults
            (ContagionVault); VaultFactoryERC20 creates ERC-20 asset vaults
            (ContagionVaultERC20). Both deploy EIP-1167 clones of the
            verified implementation on that chain.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            <Label>Chain</Label>
            <div className='flex flex-wrap gap-2'>
              {(['unichain', 'base'] as const).map((key) => (
                <Button
                  key={key}
                  variant={chainKey === key ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => {
                    setChainKey(key);
                    setCreated(null);
                    createdRef.current = null;
                  }}
                  aria-pressed={chainKey === key}
                >
                  {CHAIN_NAMES[key]} · {CHAIN_IDS[key]}
                </Button>
              ))}
            </div>
          </div>
          <div className='flex flex-col gap-2'>
            <Label>Asset</Label>
            <div className='flex flex-wrap gap-2'>
              {(['ETH', 'USDC'] as const).map((kind) => (
                <Button
                  key={kind}
                  variant={assetKind === kind ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => {
                    setAssetKind(kind);
                    setCreated(null);
                    createdRef.current = null;
                  }}
                  aria-pressed={assetKind === kind}
                >
                  <AssetLogo asset={kind} size={16} />
                  {kind === 'ETH' ? 'ETH — native' : 'USDC — ERC-20 (6 decimals)'}
                </Button>
              ))}
            </div>
            <p className='text-muted-foreground text-xs'>
              Factory:{' '}
              <span className='font-mono break-all tabular-nums'>{factory.address}</span>{' '}
              ·{' '}
              <a
                href={`${EXPLORERS[chainId].url}/address/${factory.address}`}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:underline'
              >
                Explorer
                <Icons.externalLink className='size-3' />
              </a>
              {assetAddress ? (
                <>
                  {' '}· Asset:{' '}
                  <span className='font-mono break-all tabular-nums'>{assetAddress}</span>
                </>
              ) : null}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>2 — Vault settings</CardTitle>
          <CardDescription>
            Owner can pause/unpause and sweep excess. Watcher is the
            ContagionWatcher allowed to pause this vault via callback —
            default is watcher v2 on Lasna, which already watches the v2
            vaults. Share name/symbol are the vault&apos;s ERC-20 metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='flex min-w-0 flex-col gap-2'>
              <Label htmlFor='deploy-owner'>Owner address</Label>
              <Input
                id='deploy-owner'
                value={owner}
                onChange={(e) => {
                  ownerEditedRef.current = true;
                  setOwner(e.target.value.trim());
                }}
                placeholder='0x…'
                className='font-mono'
              />
              {!ownerValid && owner !== '' ? (
                <p className='text-xs text-foreground'>Not a valid address.</p>
              ) : (
                <p className='text-muted-foreground text-xs'>
                  Defaults to the connected wallet.
                </p>
              )}
            </div>
            <div className='flex min-w-0 flex-col gap-2'>
              <Label htmlFor='deploy-watcher'>Watcher address</Label>
              <Input
                id='deploy-watcher'
                value={watcher}
                onChange={(e) => setWatcher(e.target.value.trim())}
                placeholder='0x…'
                className='font-mono'
              />
              {!watcherValid && watcher !== '' ? (
                <p className='text-xs text-foreground'>Not a valid address.</p>
              ) : (
                <p className='text-muted-foreground text-xs'>
                  Default: watcher v2 (Lasna){' '}
                  <span className='font-mono break-all'>{WATCHER_V2.address}</span>
                </p>
              )}
            </div>
            <div className='flex min-w-0 flex-col gap-2'>
              <Label htmlFor='deploy-name'>Share name (1–64 chars)</Label>
              <Input
                id='deploy-name'
                value={name}
                onChange={(e) => {
                  nameEditedRef.current = true;
                  setName(e.target.value);
                }}
                placeholder={DEFAULT_NAME[assetKind]}
              />
              {!nameValid ? (
                <p className='text-xs text-foreground'>Name must be 1–64 characters.</p>
              ) : null}
            </div>
            <div className='flex min-w-0 flex-col gap-2'>
              <Label htmlFor='deploy-symbol'>Share symbol (1–16 chars)</Label>
              <Input
                id='deploy-symbol'
                value={symbol}
                onChange={(e) => {
                  symbolEditedRef.current = true;
                  setSymbol(e.target.value);
                }}
                placeholder={DEFAULT_SYMBOL[assetKind]}
              />
              {!symbolValid ? (
                <p className='text-xs text-foreground'>Symbol must be 1–16 characters.</p>
              ) : null}
            </div>
            <div className='flex min-w-0 flex-col gap-2'>
              <Label htmlFor='deploy-mindeposit'>
                Min deposit ({assetKind === 'ETH' ? 'ETH' : 'USDC'}) — empty = factory default
              </Label>
              <Input
                id='deploy-mindeposit'
                value={minDepositInput}
                onChange={(e) => setMinDepositInput(e.target.value.trim())}
                placeholder={assetKind === 'ETH' ? '0.001' : '1'}
                inputMode='decimal'
                className='font-mono'
              />
              {minDepositError ? (
                <p className='text-xs text-foreground'>{minDepositError}</p>
              ) : (
                <p className='text-muted-foreground text-xs'>
                  Default: {assetKind === 'ETH' ? '0.001 ETH' : '1 USDC'} (one whole
                  asset unit).
                </p>
              )}
            </div>
            {assetKind === 'ETH' ? (
              <div className='flex min-w-0 flex-col gap-2'>
                <Label htmlFor='deploy-seed'>Seed (ETH, sent with createVault)</Label>
                <Input
                  id='deploy-seed'
                  value={seedEth}
                  onChange={(e) => setSeedEth(e.target.value.trim())}
                  placeholder={MIN_SEED_ETH}
                  inputMode='decimal'
                  className='font-mono'
                />
                {seedError ? (
                  <p className='text-xs text-foreground'>{seedError}</p>
                ) : (
                  <p className='text-muted-foreground text-xs'>
                    The seed is locked as dead shares and sets the initial
                    share price; it is part of totalAssets.
                  </p>
                )}
              </div>
            ) : (
              <div className='flex min-w-0 flex-col gap-2'>
                <Label>Seed</Label>
                <p className='text-muted-foreground text-xs'>
                  No seed: a USDC vault starts empty (totalAssets 0) until
                  funded via deposit(). createVault sends no ETH.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>3 — Predicted address, then create</CardTitle>
          <CardDescription>
            The address is predicted from the factory&apos;s current nonce
            (vaultCount
            {vaultCount !== undefined ? ` = ${vaultCount.toString()}` : ''}) before any
            transaction is sent. It is valid only if no other vault is
            created from this factory first — the nonce is shown so the
            prediction can be re-checked.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1 rounded-none border p-2 text-xs'>
            <span className='text-muted-foreground'>Predicted vault address</span>
            <span className='font-mono break-all tabular-nums'>
              {predicted ?? '—'}
            </span>
            <span className='text-muted-foreground'>
              Creator (msg.sender):{' '}
              <span className='font-mono break-all tabular-nums'>
                {connectedAddress ?? 'wallet not connected'}
              </span>
            </span>
          </div>
          {!isConnected ? (
            <p className='text-muted-foreground text-xs'>
              Connect a wallet (header, top right) to deploy. The transaction
              is signed by the connected wallet on {CHAIN_NAMES[chainKey]}.
            </p>
          ) : !onRightChain ? (
            <>
              <div className='flex flex-wrap items-center gap-2'>
                <p className='text-muted-foreground text-xs'>
                  Connected to chain {connectedChainId ?? 'unknown'} — switch to{' '}
                  {CHAIN_NAMES[chainKey]} to deploy here.
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    void switchToChain(chainId).then((result) =>
                      setDeploySwitchError(failureOrNull(result))
                    )
                  }
                >
                  Switch to {CHAIN_NAMES[chainKey]}
                </Button>
              </div>
              {deploySwitchError ? (
                <ChainSwitchError
                  failure={deploySwitchError}
                  onDismiss={() => setDeploySwitchError(null)}
                />
              ) : null}
            </>
          ) : null}
          <div className='flex flex-col gap-2'>
            <div>
              <LoadingButton
                loading={createTx.isPending || createReceipt.isLoading}
                disabled={!isConnected || !onRightChain || !formValid || createTx.isPending}
                onClick={handleCreate}
              >
                <Icons.add className='size-4' />
                Create vault — {assetKind} on {CHAIN_NAMES[chainKey]}
              </LoadingButton>
            </div>
            {createDisabledReason ? (
              <p className='text-muted-foreground text-xs'>{createDisabledReason}</p>
            ) : null}
            {createTx.isError ? (
              <WriteErrorNotice
                error={createTx.error}
                chainId={chainId}
                txHash={createTx.data}
                crossChainWrite={!onRightChain}
              />
            ) : null}
            {createTx.data ? (
              <p className='text-xs'>
                <a
                  href={`${EXPLORERS[chainId].url}/tx/${createTx.data}`}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-1 font-mono break-all text-primary underline underline-offset-2 hover:underline'
                >
                  {createTx.data}
                  <Icons.externalLink className='size-3 shrink-0' />
                </a>
                <span className='text-muted-foreground'>
                  {' '}
                  — {createReceipt.isSuccess ? 'confirmed.' : 'waiting for confirmation…'}
                </span>
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {created ? (
        <Card>
          <CardHeader>
            <div className='flex flex-wrap items-center gap-2'>
              <CardTitle className='text-base'>Vault created — next steps</CardTitle>
              <Badge variant='outline' className='border-primary/40 text-primary'>
                <Icons.circleCheck className='mr-1 size-3.5' />
                CONFIRMED
              </Badge>
            </div>
            <CardDescription>
              Your vault exists on-chain. It is not protected by the watcher
              until registered, and it holds{' '}
              {assetKind === 'ETH'
                ? `the ${seedEth} ETH seed`
                : 'no funds'}{' '}
              until funded.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4 text-sm'>
            <div className='flex flex-col gap-1 rounded-none border p-2 text-xs'>
              <span className='text-muted-foreground'>Vault address</span>
              <span className='flex items-center gap-1'>
                <span className='font-mono break-all tabular-nums'>{created.vault}</span>
                <CopyButton text={created.vault} label='Copy vault address' />
              </span>
              <a
                href={`${EXPLORERS[created.chainId].url}/address/${created.vault}`}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:underline'
              >
                View on explorer
                <Icons.externalLink className='size-3' />
              </a>
              <span className='text-muted-foreground'>
                Creation tx:{' '}
                <a
                  href={`${EXPLORERS[created.chainId].url}/tx/${created.txHash}`}
                  target='_blank'
                  rel='noreferrer'
                  className='font-mono break-all text-primary underline underline-offset-2 hover:underline'
                >
                  {created.txHash}
                </a>
              </span>
            </div>

            <div className='flex flex-col gap-2 border-t pt-3'>
              <p className='font-medium'>Step 1 — Register in the watcher</p>
              {createdRegistered === true ? (
                <p className='flex items-center gap-2 text-xs'>
                  <Badge variant='outline' className='border-primary/40 text-primary'>
                    <Icons.circleCheck className='mr-1 size-3.5' />
                    REGISTERED
                  </Badge>
                  <span className='text-muted-foreground'>
                    Watcher v2 already lists this vault for chain {created.chainId}.
                  </span>
                </p>
              ) : isWatcherOwner ? (
                <div className='flex flex-col gap-2'>
                  <p className='text-muted-foreground text-xs'>
                    You own watcher v2, so you can register from here. This
                    sends registerSibling({created.chainId}, vault) on Lasna.
                  </p>
                  {!onLasna ? (
                    <div className='flex flex-col gap-2'>
                      <div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            void switchToChain(WATCHER_V2.chainId).then((result) =>
                              setLasnaSwitchError(failureOrNull(result))
                            )
                          }
                        >
                          Switch to Lasna
                        </Button>
                      </div>
                      {lasnaSwitchError ? (
                        <ChainSwitchError
                          failure={lasnaSwitchError}
                          onDismiss={() => setLasnaSwitchError(null)}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      <LoadingButton
                        loading={registerTx.isPending || registerReceipt.isLoading}
                        disabled={registerTx.isPending}
                        onClick={handleRegister}
                      >
                        <Icons.check className='size-4' />
                        Register in watcher v2 (Lasna)
                      </LoadingButton>
                    </div>
                  )}
                  {registerTx.isError ? (
                    <WriteErrorNotice
                      error={registerTx.error}
                      chainId={WATCHER_V2.chainId}
                      txHash={registerTx.data}
                      crossChainWrite={!onLasna}
                    />
                  ) : null}
                  {registerTx.data ? (
                    <p className='text-xs'>
                      <a
                        href={`${EXPLORERS[WATCHER_V2.chainId].url}/tx/${registerTx.data}`}
                        target='_blank'
                        rel='noreferrer'
                        className='inline-flex items-center gap-1 font-mono break-all text-primary underline underline-offset-2 hover:underline'
                      >
                        {registerTx.data}
                        <Icons.externalLink className='size-3 shrink-0' />
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className='flex flex-col gap-2'>
                  <p className='text-muted-foreground text-xs'>
                    registerSibling is watcher-owner only, and the connected
                    wallet is not the watcher owner — so this step cannot run
                    from here. The watcher owner runs:
                  </p>
                  <div className='flex items-start gap-1 rounded-none border bg-muted p-2'>
                    <code className='min-w-0 flex-1 font-mono text-xs break-all'>
                      {registerCommand}
                    </code>
                    <CopyButton text={registerCommand} label='Copy register command' />
                  </div>
                </div>
              )}
            </div>

            <div className='flex flex-col gap-2 border-t pt-3'>
              <p className='font-medium'>Step 2 — Fund the vault</p>
              {assetKind === 'ETH' ? (
                <p className='text-muted-foreground text-xs'>
                  The {seedEth} ETH seed is already in the vault and counted
                  in totalAssets. Add more with deposit() (payable) on the
                  vault, or send ETH to the vault address — but a plain
                  transfer does not update the totalAssets ledger; only
                  deposit() does.
                </p>
              ) : (
                <p className='text-muted-foreground text-xs'>
                  1. Approve the vault on the USDC contract
                  (approve(vault, amount)). 2. Call deposit(amount, your
                  address) on the vault — that mints shares and updates
                  totalAssets. A plain USDC transfer to the vault does NOT
                  update totalAssets: the tokens sit in the vault but the
                  ledger stays 0. Minimum first deposit: 1 USDC (factory
                  default minDeposit).
                </p>
              )}
            </div>

            <div className='flex flex-col gap-2 border-t pt-3'>
              <p className='font-medium'>Step 3 — Callback fees (USDC vaults)</p>
              <p className='text-muted-foreground text-xs'>
                The first pause callback still runs (the proxy fronts the
                fee), but the debt it leaves can only be covered from ETH
                held by the vault (coverDebt). A USDC vault holds no ETH
                unless the owner sends some — decide the ETH reserve before
                the first live loop.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
