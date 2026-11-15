// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title UsdcFixture — local test-only stand-in for canonical USDC
/// @notice TEST FIXTURE ONLY — never deployed to any chain. A plain ERC-20
/// with 6 decimals, symbol USDC, and an open `mint` so tests can fund
/// users. It mirrors the on-chain facts that matter for the vault: 6
/// decimals (Base Sepolia 0x036CbD53842c5426634e7929541eC2318f3dCF7e,
/// Unichain Sepolia 0x31d0220469e10c4E71834a79b1f276d740d3768F).
contract UsdcFixture is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public view override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
