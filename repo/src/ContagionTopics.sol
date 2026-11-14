// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title ContagionTopics — single source of truth for chain/topic constants
/// @notice Topic0 values are computed PROGRAMMATICALLY with keccak256 in
/// Solidity — never re-typed from memory (hand-typed hashes have silently
/// broken event matching before). Chain IDs and callback proxy addresses
/// below are assumptions for the Lasna testnet deployment: re-verify them
/// against https://dev.reactive.network/origins-and-destinations at deploy
/// time (see repo README, "Assumptions to verify before deploy").
library ContagionTopics {
    // -- chains (Lasna testnet) ---------------------------------------------
    uint256 internal constant UNICHAIN_SEPOLIA_CHAIN_ID = 1301;
    uint256 internal constant BASE_SEPOLIA_CHAIN_ID = 84532;
    uint256 internal constant LASNA_CHAIN_ID = 5318007;

    // -- Reactive system / callback proxies (Lasna testnet) -----------------
    address internal constant SYSTEM_CONTRACT = 0x8888888888888888888888888888888888888888;
    address internal constant BASE_SEPOLIA_CALLBACK_PROXY = 0x476F44b11F5C942c58f4c8E3d0300E5710743585;
    address internal constant UNICHAIN_SEPOLIA_CALLBACK_PROXY = 0x775c9B990ADe401060B78D0e98684eEf8d2466C1;

    // -- event topics (computed, not typed from memory) ----------------------
    uint256 internal constant EMERGENCY_PAUSED_TOPIC = uint256(keccak256("EmergencyPaused(address,bytes32)"));
    uint256 internal constant PAUSED_TOPIC = uint256(keccak256("Paused(address)"));

    // -- callback gas ---------------------------------------------------------
    // Measured (prebuild research, 14 Nov 2026, live eth_call / cast call
    // on both proxies): network minimum 100_000 gas per callback; proxy
    // overhead `_extraGas` 80_000 + `_maxChargeGas` 50_000 = 130_000 gas.
    // `pause()` on the destination costs ~45_000-60_000 gas, so 200_000
    // forwards ~70_000 — enough. 150_000 is NOT enough. Do not lower this
    // without re-measuring on-chain.
    uint64 internal constant CALLBACK_GAS_LIMIT = 200_000;
}
