// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {ContagionVaultERC20} from "../src/ContagionVaultERC20.sol";
import {VaultFactoryERC20} from "../src/VaultFactoryERC20.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";

/// @title Deploy ContagionVaultERC20 implementation + VaultFactoryERC20 (one chain)
/// @notice Deploys the ERC-20 vault implementation and its factory on ONE
/// chain (Base Sepolia or Unichain Sepolia). Run once per chain. The
/// implementation is LOCKED at construction (`_disableInitializers()` +
/// ownership renounced) — it can never be initialized or used as a vault;
/// clones are created by the factory. The implementation's callback proxy
/// is the one for THIS chain (immutables are per-chain), so a separate
/// implementation + factory pair is required per chain. One
/// implementation + factory pair serves EVERY ERC-20 asset on that chain:
/// the asset is a per-clone `initialize()` parameter.
/// @dev Requires env: CALLBACK_PROXY, DEPLOYER_PRIVATE_KEY.
/// Callback proxies (verified docs + on-chain code, 14 Nov 2026):
///   Base Sepolia     0x476F44b11F5C942c58f4c8E3d0300E5710743585
///   Unichain Sepolia 0x775c9B990ADe401060B78D0e98684eEf8d2466C1
/// Do NOT use the old pre-Omni proxy 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4.
/// Run (example, Base Sepolia):
///   forge script script/DeployVaultERC20.s.sol --rpc-url base-sepolia --broadcast
contract DeployVaultERC20 is Script {
    function run() external {
        address proxy = vm.envAddress("CALLBACK_PROXY");
        require(
            proxy == ContagionTopics.BASE_SEPOLIA_CALLBACK_PROXY
                || proxy == ContagionTopics.UNICHAIN_SEPOLIA_CALLBACK_PROXY,
            "unknown callback proxy: check ContagionTopics"
        );
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        ContagionVaultERC20 implementation = new ContagionVaultERC20(IPayable(payable(proxy)));
        VaultFactoryERC20 factory = new VaultFactoryERC20(address(implementation));
        console.log("ContagionVaultERC20 implementation:", address(implementation));
        console.log("VaultFactoryERC20:", address(factory));
        console.log("chainId:", block.chainid);
        console.log("proxy:", proxy);
        console.log("implementation owner (renounced):", implementation.owner());
        vm.stopBroadcast();

        console.log("NEXT: create a vault (script/CreateVaultERC20.s.sol),");
        console.log("      then register it on the watcher v2 (Lasna).");
    }
}
