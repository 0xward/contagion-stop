// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {ContagionVault} from "./ContagionVault.sol";

/// @title PublicVaultV3 — public test deployment of ContagionVault (v3)
/// @notice PUBLIC TEST DEPLOYMENT — the v2 product (ERC-20 shares,
/// deposit/withdraw, guarded coverDebt) that anyone can test.
///
/// Same public surface as `PublicVaultV2`, with ONE change (audit pass 2,
/// finding N2 [Medium], 15 Nov 2026): `reopen()` is OWNER-ONLY here.
/// On v2, permissionless `reopen()` let anyone cancel CONTAINED mid-incident
/// (the watcher never re-pauses and never tracks `Unpaused`), so a trip
/// could be undone while the incident was still active. On v3 only the
/// vault owner (the deployer) reopens — the same rule as the main
/// deployment, which is the correct product behavior.
///
///  - `trip(reason)` — permissionless, pauses the vault and emits the SAME
///    `EmergencyPaused` event the ContagionWatcher subscribes to.
///  - `reopen()` — OWNER-ONLY, reopens the vault. A non-owner call reverts
///    (`NotOwner`); reopening a vault that is already active reverts
///    (OpenZeppelin `ExpectedPause`).
///  - `TRIP_COOLDOWN` 60 s per vault (F4, audit 15 Nov 2026): each trip
///    past containment is a new incident = a full fan-out charged to the
///    public watcher (~0.13-0.15 lREACT for the 5-vault set). The cooldown
///    only SLOWS aggregate drain — it does not prevent it: rotating trips
///    across the five vaults still drains the watcher, just ~10x slower.
///    The aggregate bound is the watcher-side incident cap
///    (`ContagionWatcherV3`: at most 5 new incidents per rolling hour).
///
/// Deployment model: this contract is the IMPLEMENTATION for EIP-1167
/// clones created by `VaultFactory` (same as `ContagionVault`). The
/// implementation itself is LOCKED in the constructor
/// (`_disableInitializers()` + ownership renounced, inherited from
/// `ContagionVault`); clones are initialized atomically inside
/// `VaultFactory.createVault`. `trip`/`reopen` live on the implementation
/// so every clone of it is public by construction.
///
/// Everything else is inherited unchanged from `ContagionVault`:
///  - `emergencyPause` / `unpause` / `sweepExcess` stay owner-only.
///  - `deposit()` stays permissionless, `coverDebt()` stays public and
///    guarded (pays only from the excess above the user ledger).
///  - `pause()` stays reachable only via the watcher callback, and (F1
///    fix, inherited from `SiblingVault`) re-emits `Paused` when the vault
///    is already paused, so a second origin tripping mid-incident still
///    reaches CONTAINED.
///  - `withdraw(uint256,address)` / `redeem(uint256,address)` stay open
///    while paused.
contract PublicVaultV3 is ContagionVault {
    /// @notice Revert when `trip()` is called before the cooldown expires.
    /// `nextAllowedAt_` is the earliest timestamp a new trip is accepted.
    error TripCooldown(uint256 nextAllowedAt_);

    /// @notice Minimum delay between two `trip()` calls on the SAME vault
    /// (F4). Per vault; a trip on vault A never blocks vault B. `reopen()`
    /// does NOT reset it. A genuine urgent re-trip stays possible via the
    /// owner-only `emergencyPause()` (bypasses this gate by design).
    uint256 public constant TRIP_COOLDOWN = 60;

    /// @notice Timestamp of the last accepted `trip()` on this vault.
    /// 0 = never tripped (sentinel: the first trip is always allowed).
    uint256 public lastTripAt;

    /// @param callbackProxy_ Callback proxy of this vault's chain (Base
    /// Sepolia 0x476F44b11F5C942c58f4c8E3d0300E5710743585, Unichain Sepolia
    /// 0x775c9B990ADe401060B78D0e98684eEf8d2466C1).
    constructor(IPayable callbackProxy_) ContagionVault(callbackProxy_) {}

    /// @notice Permissionless trip: pause this vault (if active) and emit
    /// `EmergencyPaused` with this vault as `protocol`, exactly as
    /// `emergencyPause` does — minus the owner check. Anyone may call it.
    /// @dev F4: at most one accepted trip per `TRIP_COOLDOWN` per vault.
    function trip(bytes32 reason) external {
        if (lastTripAt != 0 && block.timestamp < lastTripAt + TRIP_COOLDOWN) {
            revert TripCooldown(lastTripAt + TRIP_COOLDOWN);
        }
        lastTripAt = block.timestamp;
        if (!paused()) _pause();
        emit EmergencyPaused(address(this), reason);
    }

    /// @notice Owner-only reopen (N2 fix): reopen this vault. Only the
    /// vault owner (the deployer) may call it — a stranger's call reverts
    /// (`NotOwner`). Reverts when the vault is already active
    /// (OpenZeppelin `ExpectedPause`). After a test trip, the deployer
    /// reopens every vault in the set; visitors cannot cancel CONTAINED
    /// mid-incident anymore.
    function reopen() external onlyOwner {
        _unpause();
    }
}
