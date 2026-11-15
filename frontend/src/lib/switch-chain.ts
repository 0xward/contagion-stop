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
  return summarizeError(error).code;
}

function errorMessage(error: unknown): string {
  return summarizeError(error).text;
}

function errorName(error: unknown): string {
  return summarizeError(error).name;
}

/**
 * One summary of any thrown error: the numeric code (4001, 4902, …),
 * the error class name, and all message/shortMessage text found while
 * walking the `cause` chain. Shared by the chain-switch classifier and
 * the write-error mapper (lib/format-write-error.ts) so both read the
 * same evidence — viem wraps the wallet's own message (e.g. an OKX
 * "disconnect the dApp first" sentence) deep inside `cause`.
 */
export interface ErrorSummary {
  code?: number;
  name: string;
  text: string;
}

export function summarizeError(error: unknown): ErrorSummary {
  let code: number | undefined;
  let name = '';
  const parts: string[] = [];
  let current: unknown = error;
  for (
    let depth = 0;
    depth < 5 && current !== null && typeof current === 'object';
    depth++
  ) {
    const record = current as {
      code?: unknown;
      name?: unknown;
      message?: unknown;
      shortMessage?: unknown;
      cause?: unknown;
    };
    if (code === undefined && typeof record.code === 'number') code = record.code;
    if (!name && typeof record.name === 'string') name = record.name;
    if (typeof record.message === 'string' && record.message.length > 0) {
      parts.push(record.message);
    }
    if (typeof record.shortMessage === 'string' && record.shortMessage.length > 0) {
      parts.push(record.shortMessage);
    }
    current = record.cause;
  }
  if (typeof error === 'string') parts.push(error);
  return { code, name, text: parts.join(' ') };
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
