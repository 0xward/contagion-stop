// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {ContagionWatcher} from "../src/ContagionWatcher.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";

/// @title Deploy a scratch ContagionWatcher on Lasna (2 Unichain siblings)
/// @notice Scratch-only watcher for the F8 live coverDebt test: two
/// Unichain Sepolia siblings, one unfunded (debt subject) + one funded
/// (trip trigger). Never mixed with the main set or any public set.
/// @dev Requires env: DEPLOYER_PRIVATE_KEY, SCRATCH_UNI_SIBLING_1,
/// SCRATCH_UNI_SIBLING_2. Optional: SCRATCH_WATCHER_FUNDING (default
/// 0.5 lREACT). Run:
///   forge script script/DeployScratchWatcher.s.sol --rpc-url lasna --broadcast
contract DeployScratchWatcher is Script {
    function run() external {
        address sib1 = vm.envAddress("SCRATCH_UNI_SIBLING_1");
        address sib2 = vm.envAddress("SCRATCH_UNI_SIBLING_2");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 funding = vm.envOr("SCRATCH_WATCHER_FUNDING", uint256(0.5 ether));

        uint256[] memory chainIds = new uint256[](2);
        address[] memory siblings = new address[](2);
        chainIds[0] = ContagionTopics.UNICHAIN_SEPOLIA_CHAIN_ID;
        siblings[0] = sib1;
        chainIds[1] = ContagionTopics.UNICHAIN_SEPOLIA_CHAIN_ID;
        siblings[1] = sib2;

        vm.startBroadcast(deployerKey);
        ContagionWatcher watcher = new ContagionWatcher{value: funding}(chainIds, siblings);
        console.log("Scratch ContagionWatcher:", address(watcher));
        console.log("sibling1:", sib1);
        console.log("sibling2:", sib2);
        console.log("funding lREACT:", funding);
        vm.stopBroadcast();

        console.log("NEXT: wire each scratch vault to this watcher:");
        console.log("  cast send <SCRATCH_VAULT> 'setWatcher(address)' <SCRATCH_WATCHER> --rpc-url unichain-sepolia");
    }
}
