// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {PublicVault} from "../src/PublicVault.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";

/// @title Deploy one PublicVault (DRAFT — do not run until the deploy phase)
/// @notice Deploys a PublicVault on ONE destination chain (Base Sepolia or
/// Unichain Sepolia). Run once per chain (3 runs total: 2x Unichain, 1x
/// Base). Same shape as script/DeploySibling.s.sol, but deploys the
/// permissionless public subclass instead of the owner-only main vault.
/// The public watcher does not exist yet at this point, so WATCHER may be
/// address(0) — wire it afterwards with `setWatcher()` (see
/// script/FundPublic.s.sol, or cast send directly).
/// @dev Requires env: CALLBACK_PROXY, OWNER, WATCHER (may be address(0)).
/// Callback proxies (verified docs + on-chain code, 14 Nov 2026):
///   Base Sepolia     0x476F44b11F5C942c58f4c8E3d0300E5710743585
///   Unichain Sepolia 0x775c9B990ADe401060B78D0e98684eEf8d2466C1
/// Do NOT use the old pre-Omni proxy 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4.
/// Run (example, Base Sepolia):
///   forge script script/DeployPublicVaults.s.sol --rpc-url base-sepolia --broadcast
/// NOTE: deploy/verify scripts in this repo MUST use cast/curl, never
/// Python urllib (urllib gets HTTP 403 from this VM to Base/Sepolia RPCs).
contract DeployPublicVaults is Script {
    function run() external {
        address proxy = vm.envAddress("CALLBACK_PROXY");
        address owner = vm.envAddress("OWNER");
        address watcher = vm.envAddress("WATCHER");

        require(
            proxy == ContagionTopics.BASE_SEPOLIA_CALLBACK_PROXY
                || proxy == ContagionTopics.UNICHAIN_SEPOLIA_CALLBACK_PROXY,
            "unknown callback proxy: check ContagionTopics"
        );
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        PublicVault vault = new PublicVault(IPayable(payable(proxy)), owner, watcher);
        console.log("PublicVault:", address(vault));
        console.log("chainId:", block.chainid);
        console.log("proxy:", proxy);
        console.log("owner:", owner);
        console.log("watcher:", watcher);
        vm.stopBroadcast();

        if (watcher == address(0)) {
            console.log("NEXT: after the public watcher is deployed, wire it:");
            console.log("  cast send <PUBLIC_VAULT> 'setWatcher(address)' <PUBLIC_WATCHER> --rpc-url <chain>");
        }
    }
}
