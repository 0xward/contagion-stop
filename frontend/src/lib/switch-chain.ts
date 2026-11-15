import { useCallback } from 'react';
import { useSwitchChain } from 'wagmi';

/**
 * Shared chain-switch helper — one place that turns a wagmi switchChain
 * failure into a typed outcome the UI can act on.
 *
 * Why this exists: WalletConnect v2 sessions only include the chains the
 * wallet approved when the session started. Switching to a chain that is
 * not in the session is refused by the wallet — some wallets (e.g. OKX
 * Wallet) answer with a prompt to disconnect the dApp first. Before this
 * helper the failure was swallowed silently (chain badge) or the raw
 * promise was left floating (every "Switch" button), so the user saw
 * nothing and had no idea what to do.
 *
 * Outcomes:
 * - ok: the switch worked (including the no-wallet case, where wagmi
 *   only updates the app's active chainId).
 * - user-rejected (code 4001): the user said no in the wallet — silent,
 *   not an error, no message shown.
 * - chain-not-approved (code 4902 / 4100, or a message about a chain not
 *   being added / approved / recognised / in the session): the wallet
 *   never approved the target chain in this session. The fix is to
 *   disconnect and reconnect, approving every chain offered.
 * - failed: anything else — same reconnect advice, generic wording.
 */

export type SwitchChainResult =
  | { kind: 'ok' }
  | { kind: 'user-rejected' }
  | { kind: 'chain-not-approved'; chainId: number; message: string }
  | { kind: 'failed'; chainId: number; message: string };

/** A switch failure worth showing to the user. */
export type SwitchChainFailure =
  | Extract<SwitchChainResult, { kind: 'chain-not-approved' }>
  | Extract<SwitchChainResult, { kind: 'failed' }>;

function errorCode(error: unknown): number | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== null && typeof current === 'object'; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'number') return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== null && typeof current === 'object'; depth++) {
    const message = (current as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) parts.push(message);
    const shortMessage = (current as { shortMessage?: unknown }).shortMessage;
    if (typeof shortMessage === 'string' && shortMessage.length > 0) parts.push(shortMessage);
    current = (current as { cause?: unknown }).cause;
  }
  if (typeof error === 'string') parts.push(error);
  return parts.join(' ');
}

function errorName(error: unknown): string {
  if (error !== null && typeof error === 'object') {
    const name = (error as { name?: unknown }).name;
    if (typeof name === 'string') return name;
  }
  return '';
}

const USER_REJECTED_PATTERN = /user rejected|rejected the request|user denied|user cancelled/i;
const NOT_APPROVED_PATTERN =
  /4902|unrecognized chain|chain .* not (been )?(added|approved|configured|supported)|unsupported chain|not approved|not (in|part of) .* session|session .* chain|disconnect (the )?dapp|disconnect.*(before|first)|switch.*not (allowed|supported)/i;

export function classifySwitchChainError(
  error: unknown,
  chainId: number
): SwitchChainResult {
  const code = errorCode(error);
  const message = errorMessage(error);
  const name = errorName(error);
  if (
    code === 4001 ||
    name === 'UserRejectedRequestError' ||
    USER_REJECTED_PATTERN.test(message)
  ) {
    return { kind: 'user-rejected' };
  }
  if (
    code === 4902 ||
    code === 4100 ||
    NOT_APPROVED_PATTERN.test(message)
  ) {
    return { kind: 'chain-not-approved', chainId, message };
  }
  return { kind: 'failed', chainId, message };
}

/**
 * Map a switch outcome to the failure to display, or null when nothing
 * should be shown (success, or a silent user rejection).
 */
export function failureOrNull(result: SwitchChainResult): SwitchChainFailure | null {
  return result.kind === 'ok' || result.kind === 'user-rejected' ? null : result;
}

/**
 * Hook wrapping wagmi's switchChainAsync. Returns the typed outcome of
 * the attempt plus the pending flag for disabling the button while the
 * wallet prompt is open. Never throws.
 */
export function useChainSwitcher() {
  const { switchChainAsync, isPending } = useSwitchChain();

  const switchToChain = useCallback(
    async (chainId: number): Promise<SwitchChainResult> => {
      try {
        await switchChainAsync({ chainId });
        return { kind: 'ok' };
      } catch (error) {
        return classifySwitchChainError(error, chainId);
      }
    },
    [switchChainAsync]
  );

  return { switchToChain, isSwitching: isPending };
}
