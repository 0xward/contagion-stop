// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {ContagionWatcher} from "../src/ContagionWatcher.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";

/// @title Deploy public ContagionWatcher on Lasna (DRAFT — do not run until the deploy phase)
/// @notice Deploys the SAME ContagionWatcher contract (no subclass, no new
/// watcher code) on Lasna (chain 5318007), subscribed to the 3 TEST vaults
/// only — never mixed with the main set. The public watcher is a separate
/// deployment with its own sibling list, so a public trip can never freeze
/// a main vault. Funded with 2 lREACT at deploy (covers many public loops;
/// one loop costs ~0.10-0.11 lREACT, see gas-report.md).
/// If the constructor-subscribe step reverts under `forge script`
/// simulation (a known pre-Omni footgun), deploy with
/// `cast send --create` instead so the constructor only runs on-chain.
/// @dev Requires env: DEPLOYER_PRIVATE_KEY, PUBLIC_UNICHAIN_SIBLING (origin),
/// PUBLIC_BASE_SIBLING, PUBLIC_UNICHAIN_SIBLING_2 (optional second Unichain
/// public sibling; defaults to address(0) = skipped). Optional:
/// PUBLIC_WATCHER_FUNDING (default 2 lREACT). Run:
///   forge script script/DeployPublicWatcher.s.sol --rpc-url lasna --broadcast
contract DeployPublicWatcher is Script {
    function run() external {
        address uniSibling = vm.envAddress("PUBLIC_UNICHAIN_SIBLING");
        address baseSibling = vm.envAddress("PUBLIC_BASE_SIBLING");
        address uniSibling2 = vm.envOr("PUBLIC_UNICHAIN_SIBLING_2", address(0));
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 watcherFunding = vm.envOr("PUBLIC_WATCHER_FUNDING", uint256(2 ether));

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
        console.log("Public ContagionWatcher:", address(watcher));
        console.log("publicUnichainSibling:", uniSibling);
        console.log("publicBaseSibling:", baseSibling);
        if (count == 3) console.log("publicUnichainSibling2:", uniSibling2);
        vm.stopBroadcast();

        console.log("NEXT: wire each public vault to this public watcher:");
        console.log("  cast send <PUBLIC_VAULT> 'setWatcher(address)' <PUBLIC_WATCHER> --rpc-url <chain>");
        console.log("NEXT: fund the public watcher reserves if needed (see script/FundPublic.s.sol).");
    }
}
