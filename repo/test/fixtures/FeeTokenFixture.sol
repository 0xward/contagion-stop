// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title FeeTokenFixture — local test-only fee-on-transfer token
/// @notice TEST FIXTURE ONLY — never deployed to any chain. A plain ERC-20
/// with 6 decimals that takes a 10% fee on every transfer (except minting),
/// sending the fee to a fixed sink. It exists for exactly one test: a vault
/// deposit must credit the amount that ARRIVED (delta of its balance),
/// never the amount the caller asked to send.
contract FeeTokenFixture is ERC20 {
    /// @notice Fee in basis points: 1000 = 10%.
    uint256 public constant FEE_BPS = 1000;
    /// @notice Where the fee goes.
    address public constant FEE_SINK = 0x000000000000000000000000000000000000Fee5;

    constructor() ERC20("Fee Token", "FEE") {}

    function decimals() public view override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && value > 0) {
            uint256 fee = (value * FEE_BPS) / 10_000;
            if (fee > 0) {
                super._update(from, to, value - fee);
                super._update(from, FEE_SINK, fee);
                return;
            }
        }
        super._update(from, to, value);
    }
}
