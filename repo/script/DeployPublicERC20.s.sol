// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {PublicVaultERC20} from "../src/PublicVaultERC20.sol";
import {VaultFactoryERC20} from "../src/VaultFactoryERC20.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";

/// @title Deploy PublicVaultERC20 implementation + VaultFactoryERC20 (one chain)
/// @notice Deploys the public ERC-20 vault implementation
/// (ContagionVaultERC20 + permissionless trip/reopen + 60 s trip
/// cooldown) and its factory on ONE chain. Run once per chain. The
/// implementation is LOCKED at construction (`_disableInitializers()` +
/// ownership renounced) — clones are created by the factory.
/// @dev Requires env: CALLBACK_PROXY, DEPLOYER_PRIVATE_KEY.
/// Callback proxies: Base Sepolia 0x476F44b11F5C942c58f4c8E3d0300E5710743585,
/// Unichain Sepolia 0x775c9B990ADe401060B78D0e98684eEf8d2466C1.
/// Run (example, Unichain Sepolia):
///   forge script script/DeployPublicERC20.s.sol --rpc-url unichain-sepolia --broadcast
contract DeployPublicERC20 is Script {
    function run() external {
        address proxy = vm.envAddress("CALLBACK_PROXY");
        require(
            proxy == ContagionTopics.BASE_SEPOLIA_CALLBACK_PROXY
                || proxy == ContagionTopics.UNICHAIN_SEPOLIA_CALLBACK_PROXY,
            "unknown callback proxy: check ContagionTopics"
        );
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        PublicVaultERC20 implementation = new PublicVaultERC20(IPayable(payable(proxy)));
        VaultFactoryERC20 factory = new VaultFactoryERC20(address(implementation));
        console.log("PublicVaultERC20 implementation:", address(implementation));
        console.log("VaultFactoryERC20:", address(factory));
        console.log("chainId:", block.chainid);
        console.log("proxy:", proxy);
        console.log("implementation owner (renounced):", implementation.owner());
        vm.stopBroadcast();

        console.log("NEXT: create a vault (script/CreateVaultERC20.s.sol),");
        console.log("      then register it on the public watcher (Lasna).");
    }
}
