// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {VaultFactoryERC20} from "../src/VaultFactoryERC20.sol";

/// @title Create a ContagionVaultERC20 clone via VaultFactoryERC20
/// @notice Creates one ERC-20 vault clone and initializes it atomically.
/// NO seed, NO value: the ERC-20 vault has no dead-share seed and
/// `initialize()` is not payable. The vault address is deterministic
/// (CREATE2): it must match the address predicted with
/// `predictVault(creator, owner, nonce)` — if it does not match, STOP.
/// @dev Requires env: FACTORY, OWNER, WATCHER, ASSET, VAULT_NAME,
/// VAULT_SYMBOL, DEPLOYER_PRIVATE_KEY. Optional: MIN_DEPOSIT (default 0 =
/// one whole token, e.g. 1 USDC = 1e6).
/// The caller (deployer key) is the CREATE2 creator — it must be the same
/// address used in the `predictVault` call. Run (example, Base Sepolia):
///   forge script script/CreateVaultERC20.s.sol --rpc-url base-sepolia --broadcast
contract CreateVaultERC20 is Script {
    function run() external {
        address factoryAddr = vm.envAddress("FACTORY");
        address owner = vm.envAddress("OWNER");
        address watcher = vm.envAddress("WATCHER");
        address asset = vm.envAddress("ASSET");
        string memory name = vm.envString("VAULT_NAME");
        string memory symbol = vm.envString("VAULT_SYMBOL");
        uint256 minDeposit = vm.envOr("MIN_DEPOSIT", uint256(0));
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        VaultFactoryERC20 factory = VaultFactoryERC20(factoryAddr);
        address creator = vm.addr(deployerKey);
        uint256 nonce = factory.vaultCount();
        address predicted = factory.predictVault(creator, owner, nonce);
        console.log("predicted vault:", predicted);
        console.log("factory vaultCount (nonce):", nonce);

        vm.startBroadcast(deployerKey);
        address vault = factory.createVault(owner, watcher, asset, name, symbol, minDeposit);
        console.log("created vault:", vault);
        console.log("chainId:", block.chainid);
        console.log("owner:", owner);
        console.log("watcher:", watcher);
        console.log("asset:", asset);
        console.log("name:", name);
        console.log("symbol:", symbol);
        vm.stopBroadcast();

        require(vault == predicted, "created address != predicted: STOP");
        console.log("OK: created == predicted. Vault is live.");
        console.log("NEXT: register the vault on the watcher v2 (Lasna)");
        console.log("      cast send <WATCHER_V2> 'registerSibling(uint256,address)' <CHAIN_ID> <VAULT> --rpc-url lasna --private-key $DEPLOYER_PRIVATE_KEY");
    }
}
