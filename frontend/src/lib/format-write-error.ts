import { summarizeError } from './switch-chain';

/**
 * Shared write-error mapper — turns a raw viem/wagmi write failure into
 * one short human sentence. NEVER render `error.message` raw: a viem
 * dump buries the one actionable sentence (e.g. a wallet's own
 * "disconnect the dApp first" line) under request arguments, calldata,
 * docs links, and a version string.
 *
 * Kinds:
 * - disconnect-needed: the wallet refused the write because its
 *   session does not cover the target chain. Detected by the wallet's
 *   own wording ("Putuskan sambungan dApp", "disconnect the dApp
 *   first", …) carried inside the viem error, or by a user-rejection
 *   on a write that targets a different chain than the connected one.
 *   The fix is disconnect + reconnect (see WriteErrorNotice).
 * - user-rejected (code 4001): the user said no in the wallet.
 * - reverted: the transaction was mined and reverted on-chain.
 * - failed: anything else.
 */

export type WriteErrorKind =
  | 'disconnect-needed'
  | 'user-rejected'
  | 'reverted'
  | 'failed';

export interface FormattedWriteError {
  kind: WriteErrorKind;
  /** One short sentence, safe to render. Never a raw viem dump. */
  shortMessage: string;
  /** True when the fix is disconnect + reconnect. */
  needsReconnect: boolean;
}

const DISCONNECT_PATTERN =
  /putuskan sambungan|disconnect (the )?dapp|disconnect.*(before|first)/i;
const USER_REJECTED_PATTERN =
  /user rejected|rejected the request|user denied|user cancelled/i;
const REVERT_PATTERN = /revert/i;

export function formatWriteError(
  error: unknown,
  opts?: { crossChainWrite?: boolean }
): FormattedWriteError {
  const { code, name, text } = summarizeError(error);
  const userRejected =
    code === 4001 ||
    name === 'UserRejectedRequestError' ||
    USER_REJECTED_PATTERN.test(text);
  if (
    DISCONNECT_PATTERN.test(text) ||
    (userRejected && opts?.crossChainWrite === true)
  ) {
    return {
      kind: 'disconnect-needed',
      shortMessage:
        'Your wallet asked to disconnect this site first, then reconnect.',
      needsReconnect: true
    };
  }
  if (userRejected) {
    return {
      kind: 'user-rejected',
      shortMessage: 'Transaction rejected in your wallet.',
      needsReconnect: false
    };
  }
  if (name.includes('Revert') || REVERT_PATTERN.test(text)) {
    return {
      kind: 'reverted',
      shortMessage: 'Transaction reverted on-chain.',
      needsReconnect: false
    };
  }
  return {
    kind: 'failed',
    shortMessage: 'Transaction failed. Please try again.',
    needsReconnect: false
  };
}
