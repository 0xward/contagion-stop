// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AbstractCallback} from "@reactive/src/base/AbstractCallback.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SiblingVault — pausable demo vault (destination callback contract)
/// @notice A minimal stand-in for a real multi-chain protocol deployment.
/// It accepts deposits while active and locks them while paused. It is a
/// CALLBACK contract (AbstractCallback), NOT a reactive contract: one
/// contract cannot be reactive + callback at the same time (both inherit
/// AbstractPayer with a different immutable _SERVICE_PROVIDER).
///
/// Two ways to pause, with different trust:
///  - `emergencyPause(reason)` — the protocol's own security role (owner)
///    pauses this deployment directly and emits `EmergencyPaused`, which the
///    ContagionWatcher subscribes to as the contagion trigger.
///  - `pause(callbackSender_)` — ONLY via the callback proxy, ONLY from the
///    registered ContagionWatcher. This is how a sibling deployment gets
///    frozen when ANOTHER deployment trips.
/// `unpause()` is manual, owner-only, and deliberately never automatic:
/// auto-unpause would let an attacker re-open a deployment the team just
/// froze.
///
/// DEVIATION (forced by reactive-lib-omni v0.1.0, same as WillVault):
/// `AbstractCallback._CALLBACK_SENDER` is `immutable`, so the stock
/// `onlyCallbackSender` modifier cannot support the deploy order (vault
/// deploys before the watcher exists -> `setWatcher()` afterwards). The
/// vault therefore keeps a MUTABLE `watcher` slot and enforces the same
/// property with its own `onlyWatcher` modifier. The security property is
/// identical: only the registered watcher, via the callback proxy, can call
/// `pause()`. `address(0)` is passed as `callbackSender_` to
/// `AbstractCallback` and is unused.
contract SiblingVault is AbstractCallback, Ownable, Pausable, ReentrancyGuard {
    error WatcherNotSet();
    error UnauthorizedWatcher(address sender_, address expected_);
    error ZeroAddress();
    error InsufficientBalance(uint256 requested_, uint256 available_);
    error EthTransferFailed();

    /// @notice Emitted by `emergencyPause`. `protocol` is this vault's own
    /// address; the watcher subscribes to this event from every registered
    /// sibling. `reason` is an opaque operator-chosen code (e.g. a short
    /// incident id); it is recorded by the watcher, not interpreted.
    event EmergencyPaused(address indexed protocol, bytes32 reason);
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event WatcherSet(address indexed oldWatcher, address indexed newWatcher);

    /// @notice Mutable watcher slot (see dev note above).
    address public watcher;
    /// @notice Cumulative ETH accepted via `deposit()` minus withdrawals.
    /// Plain transfers (fee funding for the callback proxy) do NOT count.
    uint256 public totalDeposited;

    modifier onlyWatcher(address callbackSender_) {
        if (watcher == address(0)) revert WatcherNotSet();
        if (callbackSender_ != watcher) revert UnauthorizedWatcher(callbackSender_, watcher);
        _;
    }

    /// @param callbackProxy_ Callback proxy of this vault's chain
    /// (Base Sepolia 0x476F44b11F5C942c58f4c8E3d0300E5710743585,
    /// Unichain Sepolia 0x775c9B990ADe401060B78D0e98684eEf8d2466C1).
    /// @param owner_ Protocol security role (may pause / unpause / withdraw).
    /// @param watcher_ Lasna ContagionWatcher address; may be address(0)
    /// when the vault is deployed before the watcher — call `setWatcher()`
    /// afterwards, before funding.
    constructor(IPayable callbackProxy_, address owner_, address watcher_)
        AbstractCallback(callbackProxy_, address(0))
        Ownable(owner_)
    {
        if (owner_ == address(0)) revert ZeroAddress();
        watcher = watcher_;
    }

    /// @notice Deposit ETH while the vault is active.
    function deposit() external payable whenNotPaused {
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Owner withdraws ETH (deposits first; fee funding is swept
    /// along only if the withdrawal exceeds recorded deposits).
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        if (amount > address(this).balance) revert InsufficientBalance(amount, address(this).balance);
        totalDeposited = amount >= totalDeposited ? 0 : totalDeposited - amount;
        emit Withdrawn(msg.sender, amount);
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }

    /// @notice The protocol's own emergency brake. Deliberately has NO
    /// `whenNotPaused` guard: calling it on an already-paused vault must
    /// still re-emit `EmergencyPaused` (re-trip / retry signal for the
    /// watcher) instead of reverting.
    function emergencyPause(bytes32 reason) external onlyOwner {
        if (!paused()) _pause();
        emit EmergencyPaused(address(this), reason);
    }

    /// @notice Callback entry point: freeze this deployment on the watcher's
    /// instruction. First payload arg is the watcher address, injected by
    /// the callback proxy over the address(0) placeholder. Idempotent:
    /// a retried callback on an already-paused vault succeeds instead of
    /// reverting (a failed callback would still be charged in full).
    function pause(address callbackSender_) external onlyServiceProvider onlyWatcher(callbackSender_) {
        if (!paused()) _pause();
    }

    /// @notice Manual unpause ONLY. Never called by any callback: reopening
    /// a frozen deployment is a human security decision.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Register (or replace) the Lasna watcher. Owner-only.
    function setWatcher(address newWatcher) external onlyOwner {
        if (newWatcher == address(0)) revert ZeroAddress();
        address oldWatcher = watcher;
        watcher = newWatcher;
        emit WatcherSet(oldWatcher, newWatcher);
    }

    /// @notice Pay outstanding callback debt to the proxy from this vault's
    /// balance. Public so anyone can rescue a silently stalled vault.
    function coverDebt() external {
        _coverDebt();
    }

    /// @notice Plain ETH transfers are fee funding for the callback proxy,
    /// NOT user deposits (they do not increase `totalDeposited`).
    /// Inherited from AbstractPayer; kept explicit for clarity.
    receive() external payable override {}
}
