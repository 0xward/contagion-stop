// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ContagionVaultERC20} from "./ContagionVaultERC20.sol";

/// @title VaultFactoryERC20 — deploys ContagionVaultERC20 clones (EIP-1167) per chain
/// @author ContagionStop (0xward)
/// @notice Mirror of VaultFactory for the ERC-20 vault variant. One factory
/// per chain; it holds a single immutable implementation and creates
/// minimal-proxy clones of it, each initialized atomically in the same
/// transaction (an uninitialized clone never exists on-chain). One
/// implementation serves every ERC-20 asset: the asset is a per-clone
/// `initialize()` parameter, validated here (non-zero, has code, decimals
/// readable and <= 18) and again in the vault.
///
/// @dev CREATE2 salt — same shape as VaultFactory: keccak256(creator,
/// owner, vaultCount). The salt deliberately does NOT bind the watcher or
/// the asset: the watcher needs the vault addresses up front, and binding
/// the asset would split one factory's namespace per asset for no gain.
/// Uniqueness is guaranteed by the global nonce (`vaultCount`), and
/// anti-squatting by the creator + owner in the salt.
contract VaultFactoryERC20 {
    // ---------- Errors ----------

    error ZeroAddress();
    error InvalidName();
    error InvalidSymbol();
    error InvalidAsset();
    error InvalidAssetDecimals();

    // ---------- Constants ----------

    /// @notice Maximum share name length.
    uint256 public constant MAX_NAME_LEN = 64;
    /// @notice Maximum share symbol length.
    uint256 public constant MAX_SYMBOL_LEN = 16;

    // ---------- Storage ----------

    /// @notice The ContagionVaultERC20 implementation this factory clones. Immutable, no setter.
    address public immutable implementation;
    /// @notice Number of vaults created by this factory. Also the CREATE2
    /// nonce for the NEXT vault — the app reads this to predict addresses.
    uint256 public vaultCount;

    // ---------- Events ----------

    /// @notice A vault clone was created and initialized.
    event VaultCreated(
        address indexed owner,
        address indexed vault,
        address indexed watcher,
        uint256 chainId,
        address asset,
        string name,
        string symbol
    );

    /// @param implementation_ ContagionVaultERC20 implementation for this chain (non-zero).
    constructor(address implementation_) {
        if (implementation_ == address(0)) revert ZeroAddress();
        implementation = implementation_;
    }

    /// @notice Create a vault clone and initialize it atomically.
    /// @param owner_ Vault owner (any address; a multisig is recommended).
    /// @param watcher_ ContagionWatcher that may pause this vault (non-zero).
    /// @param asset_ ERC-20 asset of the vault (non-zero, must have code).
    /// @param name_ Share token name (1..64 chars).
    /// @param symbol_ Share token symbol (1..16 chars).
    /// @param minDeposit_ Minimum deposit in asset units; 0 means the
    /// default — one whole token (10 ** assetDecimals).
    /// @return vault Address of the created clone.
    /// @dev NON-payable: the ERC-20 vault has no seed (see
    /// ContagionVaultERC20). No ETH is forwarded to `initialize()`.
    function createVault(
        address owner_,
        address watcher_,
        address asset_,
        string calldata name_,
        string calldata symbol_,
        uint256 minDeposit_
    ) external returns (address vault) {
        if (owner_ == address(0)) revert ZeroAddress();
        if (watcher_ == address(0)) revert ZeroAddress();
        if (asset_ == address(0) || asset_.code.length == 0) revert InvalidAsset();
        if (bytes(name_).length == 0 || bytes(name_).length > MAX_NAME_LEN) revert InvalidName();
        if (bytes(symbol_).length == 0 || bytes(symbol_).length > MAX_SYMBOL_LEN) revert InvalidSymbol();

        uint256 minDep = minDeposit_;
        if (minDep == 0) {
            (bool ok, uint8 dec) = SafeERC20.tryGetDecimals(IERC20(asset_));
            if (!ok || dec > 18) revert InvalidAssetDecimals();
            minDep = 10 ** uint256(dec);
        }

        bytes32 salt = keccak256(abi.encodePacked(msg.sender, owner_, vaultCount));
        vault = Clones.cloneDeterministic(implementation, salt);
        vaultCount++;
        ContagionVaultERC20(payable(vault)).initialize(owner_, watcher_, asset_, name_, symbol_, minDep);
        emit VaultCreated(owner_, vault, watcher_, block.chainid, asset_, name_, symbol_);
    }

    /// @notice Predict the address `createVault` will deploy for
    /// (`creator_`, `owner_`) at the given `nonce_`. Pass `vaultCount`
    /// as `nonce_` for the next vault.
    function predictVault(address creator_, address owner_, uint256 nonce_) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(creator_, owner_, nonce_));
        return Clones.predictDeterministicAddress(implementation, salt, address(this));
    }
}
