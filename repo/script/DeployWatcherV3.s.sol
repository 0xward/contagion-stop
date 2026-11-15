// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {ContagionWatcherV3} from "../src/ContagionWatcherV3.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";

/// @title Deploy public ContagionWatcherV3 on Lasna (5-vault set)
/// @notice Deploys the v3 public watcher (ContagionWatcher + aggregate
/// incident cap: at most 5 NEW incidents per rolling hour) on Lasna
/// (chain 5318007), subscribed to the 5 PREDICTED v3 vault addresses —
/// never mixed with the main set or the v2 public set. The public
/// watcher v3 is a separate deployment with its own sibling list, so a
/// public trip can never freeze a main or v2 vault. Funded with 1
/// lREACT at deploy by default (covers ~7 loops at ~0.14 lREACT/loop
/// for the 5-vault set; the cap bounds spend to ~0.75 lREACT/hour).
/// The 5 vault addresses MUST be the predicted CREATE2 addresses from
/// the four v3 factories (predict BEFORE deploying the watcher); the
/// vaults are created AFTER, and each creation asserts
/// created == predicted — if it does not match, STOP.
/// @dev Requires env: DEPLOYER_PRIVATE_KEY, PUBLIC_V3_UNI0,
/// PUBLIC_V3_UNI1, PUBLIC_V3_BASE0, PUBLIC_V3_USDC_UNI,
/// PUBLIC_V3_USDC_BASE. Optional: PUBLIC_WATCHER_V3_FUNDING (default
/// 1 lREACT). Run:
///   forge script script/DeployWatcherV3.s.sol --rpc-url lasna --broadcast
contract DeployWatcherV3 is Script {
    function run() external {
        address uni0 = vm.envAddress("PUBLIC_V3_UNI0");
        address uni1 = vm.envAddress("PUBLIC_V3_UNI1");
        address base0 = vm.envAddress("PUBLIC_V3_BASE0");
        address usdcUni = vm.envAddress("PUBLIC_V3_USDC_UNI");
        address usdcBase = vm.envAddress("PUBLIC_V3_USDC_BASE");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 watcherFunding = vm.envOr("PUBLIC_WATCHER_V3_FUNDING", uint256(1 ether));

        uint256[] memory chainIds = new uint256[](5);
        address[] memory siblings = new address[](5);
        chainIds[0] = ContagionTopics.UNICHAIN_SEPOLIA_CHAIN_ID;
        siblings[0] = uni0;
        chainIds[1] = ContagionTopics.UNICHAIN_SEPOLIA_CHAIN_ID;
        siblings[1] = uni1;
        chainIds[2] = ContagionTopics.BASE_SEPOLIA_CHAIN_ID;
        siblings[2] = base0;
        chainIds[3] = ContagionTopics.UNICHAIN_SEPOLIA_CHAIN_ID;
        siblings[3] = usdcUni;
        chainIds[4] = ContagionTopics.BASE_SEPOLIA_CHAIN_ID;
        siblings[4] = usdcBase;

        vm.startBroadcast(deployerKey);
        ContagionWatcherV3 watcher = new ContagionWatcherV3{value: watcherFunding}(chainIds, siblings);
        console.log("ContagionWatcherV3:", address(watcher));
        console.log("cap max new incidents per window:", watcher.MAX_NEW_INCIDENTS_PER_WINDOW());
        console.log("cap window (seconds):", watcher.CAP_WINDOW());
        console.log("funding (wei):", watcherFunding);
        vm.stopBroadcast();

        console.log("NEXT: create the five vaults (CreateVaultV2 / CreateVaultERC20),");
        console.log("      each asserting created == predicted above.");
    }
}
