// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {VaultFactory} from "../src/VaultFactory.sol";

/// @title Create a ContagionVault clone via VaultFactory (v2)
/// @notice Creates one vault clone and initializes it atomically (seed
/// included). The vault address is deterministic (CREATE2): it must match
/// the address predicted with `predictVault(creator, owner, nonce)` BEFORE
/// the watcher was deployed — if it does not match, STOP: the watcher was
/// deployed with the wrong sibling addresses.
/// @dev Requires env: FACTORY, OWNER, WATCHER, VAULT_NAME, VAULT_SYMBOL,
/// DEPLOYER_PRIVATE_KEY. Optional: MIN_DEPOSIT (default 0 = 0.001 ETH),
/// SEED (default 0.001 ether, the dead-share seed; must be >= 0.001 ether).
/// The caller (deployer key) is the CREATE2 creator — it must be the same
/// address used in the `predictVault` call. Run (example, Base Sepolia):
///   forge script script/CreateVaultV2.s.sol --rpc-url base-sepolia --broadcast
/// Measured gas (local, 15 Nov 2026): createVault ~315,606.
contract CreateVaultV2 is Script {
    function run() external {
        address factoryAddr = vm.envAddress("FACTORY");
        address owner = vm.envAddress("OWNER");
        address watcher = vm.envAddress("WATCHER");
        string memory name = vm.envString("VAULT_NAME");
        string memory symbol = vm.envString("VAULT_SYMBOL");
        uint256 minDeposit = vm.envOr("MIN_DEPOSIT", uint256(0));
        uint256 seed = vm.envOr("SEED", uint256(0.001 ether));
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        VaultFactory factory = VaultFactory(factoryAddr);
        address creator = vm.addr(deployerKey);
        uint256 nonce = factory.vaultCount();
        address predicted = factory.predictVault(creator, owner, nonce);
        console.log("predicted vault:", predicted);
        console.log("factory vaultCount (nonce):", nonce);

        vm.startBroadcast(deployerKey);
        address vault = factory.createVault{value: seed}(owner, watcher, name, symbol, minDeposit);
        console.log("created vault:", vault);
        console.log("chainId:", block.chainid);
        console.log("owner:", owner);
        console.log("watcher:", watcher);
        console.log("name:", name);
        console.log("symbol:", symbol);
        vm.stopBroadcast();

        require(vault == predicted, "created address != predicted: STOP, watcher has wrong siblings");
        console.log("OK: created == predicted. Vault is live.");
        console.log("NEXT: fund the vault reserves (plain ETH transfer to the vault address).");
    }
}
