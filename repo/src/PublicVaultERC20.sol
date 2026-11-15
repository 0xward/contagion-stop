// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {ContagionVaultERC20} from "./ContagionVaultERC20.sol";

/// @title PublicVaultERC20 — public test deployment of ContagionVaultERC20
/// @notice PUBLIC TEST DEPLOYMENT — the ERC-20-asset v2 vault (USDC shares,
/// deposit/withdraw, guarded coverDebt) that anyone can test.
///
/// Same public surface as `PublicVaultV2` (ETH), on top of
/// `ContagionVaultERC20`:
///  - `trip(reason)` — permissionless, pauses the vault and emits the SAME
///    `EmergencyPaused` event the ContagionWatcher subscribes to.
///  - `reopen()` — permissionless, reopens the vault.
///  - `TRIP_COOLDOWN` 60 s per vault (F4, audit 15 Nov 2026).
///
/// Deployment model: IMPLEMENTATION for EIP-1167 clones created by
/// `VaultFactoryERC20` (same as `ContagionVaultERC20`). The implementation
/// itself is LOCKED in the constructor (`_disableInitializers()` +
/// ownership renounced, inherited); clones are initialized atomically
/// inside `VaultFactoryERC20.createVault`.
///
/// Everything else is inherited unchanged from `ContagionVaultERC20`:
///  - `emergencyPause` / `unpause` / `sweepExcess` stay owner-only.
///  - `deposit(uint256,address)` / `mint(uint256,address)` stay
///    permissionless, `coverDebt()` stays public and guarded (pays only
///    from the contract's ETH balance; the user ledger is in the asset).
///  - `pause()` stays reachable only via the watcher callback, and (F1
///    fix, inherited from `SiblingVault`) re-emits `Paused` when the vault
///    is already paused.
///  - `withdraw(uint256,address)` / `redeem(uint256,address)` stay open
///    while paused. The 0-arg ETH `deposit()` still reverts
///    (`EthDepositNotSupported`): ETH here is only fee funding.
contract PublicVaultERC20 is ContagionVaultERC20 {
    /// @notice Revert when `trip()` is called before the cooldown expires.
    error TripCooldown(uint256 nextAllowedAt_);

    /// @notice Minimum delay between two `trip()` calls on the SAME vault
    /// (F4). Per vault; `reopen()` does NOT reset it. A genuine urgent
    /// re-trip stays possible via the owner-only `emergencyPause()`.
    uint256 public constant TRIP_COOLDOWN = 60;

    /// @notice Timestamp of the last accepted `trip()` on this vault.
    /// 0 = never tripped (sentinel: the first trip is always allowed).
    uint256 public lastTripAt;

    /// @param callbackProxy_ Callback proxy of this vault's chain (Base
    /// Sepolia 0x476F44b11F5C942c58f4c8E3d0300E5710743585, Unichain Sepolia
    /// 0x775c9B990ADe401060B78D0e98684eEf8d2466C1).
    constructor(IPayable callbackProxy_) ContagionVaultERC20(callbackProxy_) {}

    /// @notice Permissionless trip: pause this vault (if active) and emit
    /// `EmergencyPaused` with this vault as `protocol`, exactly as
    /// `emergencyPause` does — minus the owner check. Anyone may call it.
    function trip(bytes32 reason) external {
        if (lastTripAt != 0 && block.timestamp < lastTripAt + TRIP_COOLDOWN) {
            revert TripCooldown(lastTripAt + TRIP_COOLDOWN);
        }
        lastTripAt = block.timestamp;
        if (!paused()) _pause();
        emit EmergencyPaused(address(this), reason);
    }

    /// @notice Permissionless reopen: reopen this vault. Anyone may call
    /// it. Reverts when the vault is already active (OpenZeppelin
    /// `ExpectedPause`).
    function reopen() external {
        _unpause();
    }
}
