// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {ContagionWatcher} from "../src/ContagionWatcher.sol";
import {SiblingVault} from "../src/SiblingVault.sol";

/// @title Top up reserves / pay down debt on all sides (PLAN ONLY)
/// @notice If any side goes into debt it stops silently (status `inactive`
/// on Reactscan, no error). Anyone can call `coverDebt()` on any contract;
/// this script does it for the watcher + every sibling, then tops up the
/// side this run is broadcast on (Lasna -> watcher funding; per-chain runs
/// -> reserves per sibling).
/// @dev Requires env: DEPLOYER_PRIVATE_KEY, WATCHER, BASE_SIBLING,
/// UNICHAIN_SIBLING (+ optional UNICHAIN_SIBLING_2). Optional overrides
/// (defaults = design §7c): FUND_WATCHER_LREACT (default 0.1 lREACT),
/// FUND_SIBLING_ETH (default 0.02 ETH). Lower them when funds are thin —
/// e.g. FUND_SIBLING_ETH=0.002 ether still covers hundreds of callbacks
/// at ~0.000003 ETH each. Run on the matching chain per call (see
/// DEPLOY-PLAN.md).
contract Fund is Script {
    function run() external {
        address watcherAddr = vm.envAddress("WATCHER");
        address baseSibling = vm.envAddress("BASE_SIBLING");
        address uniSibling = vm.envAddress("UNICHAIN_SIBLING");
        address uniSibling2 = vm.envOr("UNICHAIN_SIBLING_2", address(0));
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 watcherTopUp = vm.envOr("FUND_WATCHER_LREACT", uint256(0.1 ether));
        uint256 siblingTopUp = vm.envOr("FUND_SIBLING_ETH", uint256(0.02 ether));

        vm.startBroadcast(key);
        // Pay down any outstanding debt first (public, anyone can call).
        // coverDebt on a sibling only works on its own chain; guard by
        // chain so one run never calls a contract on the wrong chain.
        if (block.chainid == 5318007) {
            ContagionWatcher(payable(watcherAddr)).coverDebt();
            (bool ok,) = payable(watcherAddr).call{value: watcherTopUp}("");
            require(ok, "fund watcher failed");
            console.log("Watcher topped up with", watcherTopUp, "lREACT (wei)");
        } else if (block.chainid == 84532) {
            SiblingVault(payable(baseSibling)).coverDebt();
            (bool ok,) = payable(baseSibling).call{value: siblingTopUp}("");
            require(ok, "fund base sibling failed");
            console.log("Base sibling topped up with", siblingTopUp, "ETH (wei) reserves");
        } else if (block.chainid == 1301) {
            SiblingVault(payable(uniSibling)).coverDebt();
            (bool ok,) = payable(uniSibling).call{value: siblingTopUp}("");
            require(ok, "fund unichain sibling failed");
            console.log("Unichain sibling topped up with", siblingTopUp, "ETH (wei) reserves");
            if (uniSibling2 != address(0)) {
                SiblingVault(payable(uniSibling2)).coverDebt();
                (bool ok2,) = payable(uniSibling2).call{value: siblingTopUp}("");
                require(ok2, "fund unichain sibling 2 failed");
                console.log("Unichain sibling 2 topped up with", siblingTopUp, "ETH (wei) reserves");
            }
        }
        vm.stopBroadcast();
    }
}
