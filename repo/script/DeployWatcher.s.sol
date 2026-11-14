// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {ContagionWatcher} from "../src/ContagionWatcher.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";

/// @title Deploy ContagionWatcher on Lasna (PLAN ONLY — do not run until funded)
/// @notice Deploys the watcher on Lasna (chain 5318007) with 0.5 lREACT of
/// funding. The constructor subscribes immediately (EmergencyPaused /
/// Paused from every sibling). If the constructor-subscribe step reverts
/// under `forge script` simulation (a known pre-Omni footgun), deploy with
/// `cast send --create` instead so the constructor only runs on-chain.
/// @dev Requires env: DEPLOYER_PRIVATE_KEY, UNICHAIN_SIBLING (origin),
/// BASE_SIBLING, UNICHAIN_SIBLING_2 (optional second Unichain sibling;
/// defaults to address(0) = skipped). Optional: WATCHER_FUNDING (default
/// 0.5 lREACT, design §7c; lower it only if funds are thin — one loop
/// costs ≈0.10–0.11 lREACT (see gas-report.md), so keep >= ~0.15 lREACT
/// for the first loop plus margin. Note: the deploy tx gas itself
/// (≈0.28 lREACT) is paid separately by the deployer EOA, not from
/// this funding. Run:
///   forge script script/DeployWatcher.s.sol --rpc-url lasna --broadcast
contract DeployWatcher is Script {
    function run() external {
        address uniSibling = vm.envAddress("UNICHAIN_SIBLING");
        address baseSibling = vm.envAddress("BASE_SIBLING");
        address uniSibling2 = vm.envOr("UNICHAIN_SIBLING_2", address(0));
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 watcherFunding = vm.envOr("WATCHER_FUNDING", uint256(0.5 ether));

        uint256 count = uniSibling2 == address(0) ? 2 : 3;
        uint256[] memory chainIds = new uint256[](count);
        address[] memory siblings = new address[](count);
        chainIds[0] = ContagionTopics.UNICHAIN_SEPOLIA_CHAIN_ID;
        siblings[0] = uniSibling;
        chainIds[1] = ContagionTopics.BASE_SEPOLIA_CHAIN_ID;
        siblings[1] = baseSibling;
        if (count == 3) {
            chainIds[2] = ContagionTopics.UNICHAIN_SEPOLIA_CHAIN_ID;
            siblings[2] = uniSibling2;
        }

        vm.startBroadcast(deployerKey);
        ContagionWatcher watcher = new ContagionWatcher{value: watcherFunding}(chainIds, siblings);
        console.log("ContagionWatcher:", address(watcher));
        console.log("unichainSibling:", uniSibling);
        console.log("baseSibling:", baseSibling);
        if (count == 3) console.log("unichainSibling2:", uniSibling2);
        vm.stopBroadcast();

        console.log("NEXT: wire each sibling vault to this watcher:");
        console.log("  cast send <SIBLING> 'setWatcher(address)' <WATCHER> --rpc-url <chain>");
        console.log("NEXT: fund the watcher reserves if needed (see script/Fund.s.sol).");
    }
}
