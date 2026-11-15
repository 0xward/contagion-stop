// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {SiblingVault} from "./SiblingVault.sol";

/// @title PublicVault — public test deployment of SiblingVault
/// @notice PUBLIC TEST DEPLOYMENT — a live instance of the product that
/// anyone can test.
///
/// Anyone (any wallet, no role) may trip and reopen this vault:
///  - `trip(reason)` pauses the vault and emits the SAME
///    `EmergencyPaused` event the ContagionWatcher subscribes to, so a
///    trip triggers the full cross-chain containment loop exactly
///    like the main deployment's owner-only `emergencyPause`.
///  - `reopen()` reopens the vault, again for anyone.
///
/// This exists because the main SiblingVaults only let the deployer
/// (owner) pause/unpause, so a visitor with an ordinary wallet
/// could only watch a recorded run, never trigger a new incident. The
/// public instance removes that gate BY DESIGN so the product can be
/// tested by anybody. The trade-off is explicit: a public vault holds
/// only testnet dust and its pause state is public test state, not a
/// security control.
///
/// Everything else is inherited unchanged from SiblingVault:
///  - `emergencyPause` / `unpause` / `withdraw` / `setWatcher` stay
///    owner-only (the owner is still the deployer).
///  - `deposit()` stays permissionless, `coverDebt()` stays public.
///  - `pause()` stays reachable only via the watcher callback.
///  - `trip` deliberately has NO `whenNotPaused` guard, mirroring
///    `emergencyPause`: re-tripping an already-paused vault still
///    re-emits `EmergencyPaused` (re-trip / retry signal for the watcher).
///  - `reopen` calls `_unpause()` directly, so it reverts
///    (OpenZeppelin `ExpectedPause`) when the vault is already active —
///    unpausing something that is not paused is a no-op error, not a
///    state change.
contract PublicVault is SiblingVault {
    /// @param callbackProxy_ Callback proxy of this vault's chain (same
    /// values as SiblingVault: Base Sepolia
    /// 0x476F44b11F5C942c58f4c8E3d0300E5710743585, Unichain Sepolia
    /// 0x775c9B990ADe401060B78D0e98684eEf8d2466C1).
    /// @param owner_ Deployer (keeps setWatcher / withdraw / sweep and the
    /// owner-only emergencyPause/unpause); the public functions ignore it.
    /// @param watcher_ Lasna public ContagionWatcher address; may be
    /// address(0) at deploy time — call `setWatcher()` afterwards.
    constructor(IPayable callbackProxy_, address owner_, address watcher_)
        SiblingVault(callbackProxy_, owner_, watcher_)
    {}

    /// @notice Permissionless trip: pause this vault (if active) and
    /// emit `EmergencyPaused` with this vault as `protocol`, exactly as
    /// `emergencyPause` does — minus the owner check. Anyone may call it.
    function trip(bytes32 reason) external {
        if (!paused()) _pause();
        emit EmergencyPaused(address(this), reason);
    }

    /// @notice Permissionless reopen: reopen this vault. Anyone may
    /// call it. Reverts when the vault is already active (see contract
    /// notice above).
    function reopen() external {
        _unpause();
    }
}
