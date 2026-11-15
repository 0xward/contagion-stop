// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Minimal interface the reentrant asset fixture uses to notify the
/// payout recipient during a transfer out of the vault.
interface IAssetReceivedHook {
    function onAssetReceived() external;
}

/// @title ReentrantAssetFixture — local test-only asset that notifies on payout
/// @notice TEST FIXTURE ONLY — never deployed to any chain. A plain ERC-20
/// with 6 decimals. When armed, any transfer OUT of the vault to the armed
/// attacker first calls `onAssetReceived()` on the attacker — the exact
/// reentrancy path a malicious asset (or a token with a receiver hook)
/// would use against a vault payout. A correct vault (burn-before-transfer
/// + nonReentrant) makes the inner `redeem` fail; the fixture records
/// whether it ever succeeded.
contract ReentrantAssetFixture is ERC20 {
    address public reenterVault;
    address public reenterAttacker;

    constructor() ERC20("Reentrant Asset", "REENT") {}

    function decimals() public view override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Arm the callback: transfers from `vault_` to `attacker_`
    /// will notify the attacker before the tokens move.
    function arm(address vault_, address attacker_) external {
        reenterVault = vault_;
        reenterAttacker = attacker_;
    }

    function disarm() external {
        reenterVault = address(0);
        reenterAttacker = address(0);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (reenterVault != address(0) && from == reenterVault && to == reenterAttacker) {
            try IAssetReceivedHook(reenterAttacker).onAssetReceived() {} catch {}
        }
        super._update(from, to, value);
    }
}
