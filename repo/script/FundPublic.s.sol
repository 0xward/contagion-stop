// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {ContagionWatcher} from "../src/ContagionWatcher.sol";
import {PublicVault} from "../src/PublicVault.sol";

/// @title Wire + fund the public set (DRAFT — do not run until the deploy phase)
/// @notice One run per chain, broadcast with the deployer key (the vaults'
/// owner). Per chain it does:
///  - Lasna (5318007): pay down the public watcher's debt, then top it up
///    with PUBLIC_FUND_WATCHER_LREACT (default 0.1 lREACT).
///  - Base Sepolia (84532): setWatcher on the public Base vault, pay down
///    its debt, fund it with PUBLIC_FUND_SIBLING_ETH (default 0.001 ETH)
///    for callback gas.
///  - Unichain Sepolia (1301): same as Base, for the public Unichain vault
///    and, if set, the second public Unichain vault.
/// If any side goes into debt it stops silently (status `inactive` on
/// Reactscan, no error). Anyone can call `coverDebt()` on any contract;
/// this script does it for the watcher + every public sibling on its chain.
/// @dev Requires env: DEPLOYER_PRIVATE_KEY, PUBLIC_WATCHER,
/// PUBLIC_BASE_SIBLING, PUBLIC_UNICHAIN_SIBLING (+ optional
/// PUBLIC_UNICHAIN_SIBLING_2). Optional overrides:
/// PUBLIC_FUND_WATCHER_LREACT (default 0.1 lREACT), PUBLIC_FUND_SIBLING_ETH
/// (default 0.001 ETH). Run on the matching chain per call, e.g.:
///   forge script script/FundPublic.s.sol --rpc-url lasna --broadcast
///   forge script script/FundPublic.s.sol --rpc-url base-sepolia --broadcast
///   forge script script/FundPublic.s.sol --rpc-url unichain-sepolia --broadcast
contract FundPublic is Script {
    function run() external {
        address watcherAddr = vm.envAddress("PUBLIC_WATCHER");
        address baseSibling = vm.envAddress("PUBLIC_BASE_SIBLING");
        address uniSibling = vm.envAddress("PUBLIC_UNICHAIN_SIBLING");
        address uniSibling2 = vm.envOr("PUBLIC_UNICHAIN_SIBLING_2", address(0));
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 watcherTopUp = vm.envOr("PUBLIC_FUND_WATCHER_LREACT", uint256(0.1 ether));
        uint256 siblingTopUp = vm.envOr("PUBLIC_FUND_SIBLING_ETH", uint256(0.001 ether));

        vm.startBroadcast(key);
        if (block.chainid == 5318007) {
            ContagionWatcher(payable(watcherAddr)).coverDebt();
            (bool ok,) = payable(watcherAddr).call{value: watcherTopUp}("");
            require(ok, "fund public watcher failed");
            console.log("Public watcher topped up with", watcherTopUp, "lREACT (wei)");
        } else if (block.chainid == 84532) {
            PublicVault(payable(baseSibling)).setWatcher(watcherAddr);
            console.log("Public Base vault wired to watcher", watcherAddr);
            PublicVault(payable(baseSibling)).coverDebt();
            (bool ok,) = payable(baseSibling).call{value: siblingTopUp}("");
            require(ok, "fund public base sibling failed");
            console.log("Public Base sibling topped up with", siblingTopUp, "ETH (wei) reserves");
        } else if (block.chainid == 1301) {
            PublicVault(payable(uniSibling)).setWatcher(watcherAddr);
            console.log("Public Unichain vault wired to watcher", watcherAddr);
            PublicVault(payable(uniSibling)).coverDebt();
            (bool ok,) = payable(uniSibling).call{value: siblingTopUp}("");
            require(ok, "fund public unichain sibling failed");
            console.log("Public Unichain sibling topped up with", siblingTopUp, "ETH (wei) reserves");
            if (uniSibling2 != address(0)) {
                PublicVault(payable(uniSibling2)).setWatcher(watcherAddr);
                console.log("Public Unichain vault 2 wired to watcher", watcherAddr);
                PublicVault(payable(uniSibling2)).coverDebt();
                (bool ok2,) = payable(uniSibling2).call{value: siblingTopUp}("");
                require(ok2, "fund public unichain sibling 2 failed");
                console.log("Public Unichain sibling 2 topped up with", siblingTopUp, "ETH (wei) reserves");
            }
        }
        vm.stopBroadcast();
    }
}
