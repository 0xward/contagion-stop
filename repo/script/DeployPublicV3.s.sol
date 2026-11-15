// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {PublicVaultV3} from "../src/PublicVaultV3.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";

/// @title Deploy PublicVaultV3 implementation + VaultFactory (one chain)
/// @notice Deploys the v3 PUBLIC vault implementation (ContagionVault +
/// permissionless trip + OWNER-ONLY reopen + 60 s trip cooldown) and its
/// factory on ONE chain (Base Sepolia or Unichain Sepolia). Run once per
/// chain. The implementation is LOCKED at construction
/// (`_disableInitializers()` + ownership renounced) — clones are created
/// by the factory.
/// @dev Requires env: CALLBACK_PROXY, DEPLOYER_PRIVATE_KEY.
/// Callback proxies: Base Sepolia 0x476F44b11F5C942c58f4c8E3d0300E5710743585,
/// Unichain Sepolia 0x775c9B990ADe401060B78D0e98684eEf8d2466C1.
/// Run (example, Unichain Sepolia):
///   forge script script/DeployPublicV3.s.sol --rpc-url unichain-sepolia --broadcast
contract DeployPublicV3 is Script {
    function run() external {
        address proxy = vm.envAddress("CALLBACK_PROXY");
        require(
            proxy == ContagionTopics.BASE_SEPOLIA_CALLBACK_PROXY
                || proxy == ContagionTopics.UNICHAIN_SEPOLIA_CALLBACK_PROXY,
            "unknown callback proxy: check ContagionTopics"
        );
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        PublicVaultV3 implementation = new PublicVaultV3(IPayable(payable(proxy)));
        VaultFactory factory = new VaultFactory(address(implementation));
        console.log("PublicVaultV3 implementation:", address(implementation));
        console.log("VaultFactory:", address(factory));
        console.log("chainId:", block.chainid);
        console.log("proxy:", proxy);
        console.log("implementation owner (renounced):", implementation.owner());
        vm.stopBroadcast();

        console.log("NEXT: predict the vault address BEFORE deploying the watcher:");
        console.log("  cast call <FACTORY> 'predictVault(address,address,uint256)' <CREATOR> <OWNER> 0 --rpc-url <chain>");
        console.log("NEXT: deploy the watcher with the predicted addresses,");
        console.log("      then create the vault (script/CreateVaultV2.s.sol).");
    }
}
