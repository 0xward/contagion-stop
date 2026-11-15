// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ContagionVault} from "./ContagionVault.sol";

/// @title VaultFactory — deploys ContagionVault clones (EIP-1167) per chain
/// @author ContagionStop (0xward)
/// @notice One factory per chain. It holds a single immutable implementation
/// and creates minimal-proxy clones of it, each initialized atomically in
/// the same transaction (an uninitialized clone never exists on-chain).
/// A clone costs ~41k gas to create vs ~739k gas for a full vault deploy
/// (v1 measured); the implementation is deployed once per chain.
///
/// @dev CREATE2 salt. The salt binds (creator, owner, nonce) — deliberately
/// NOT the watcher. The watcher constructor needs the sibling vault
/// addresses up front, so the app must predict the vault address BEFORE
/// the watcher exists; a salt that bound the watcher would make that
/// impossible. Uniqueness is still guaranteed by the global nonce
/// (`vaultCount`), and anti-squatting is guaranteed because the creator
/// and owner are part of the salt: nobody can pre-create YOUR next vault.
/// `predictVault(creator, owner, vaultCount)` returns the address
/// `createVault` will deploy next — read `vaultCount` for the current
/// nonce. One watcher per team (design §4): a new team deploys its own
/// watcher + vaults; the watcher itself is unchanged from v1.
contract VaultFactory {
    // ---------- Errors ----------

    error ZeroAddress();
    error InvalidName();
    error InvalidSymbol();
    error InsufficientSeed(uint256 sent_, uint256 required_);

    // ---------- Constants ----------

    /// @notice Minimum seed (dead-share deposit) sent with `createVault`.
    uint256 public constant MIN_SEED = 0.001 ether;
    /// @notice Default minimum deposit when the caller passes 0.
    uint256 public constant DEFAULT_MIN_DEPOSIT = 0.001 ether;
    /// @notice Maximum share name length.
    uint256 public constant MAX_NAME_LEN = 64;
    /// @notice Maximum share symbol length.
    uint256 public constant MAX_SYMBOL_LEN = 16;

    // ---------- Storage ----------

    /// @notice The ContagionVault implementation this factory clones. Immutable, no setter.
    address public immutable implementation;
    /// @notice Number of vaults created by this factory. Also the CREATE2
    /// nonce for the NEXT vault — the app reads this to predict addresses.
    uint256 public vaultCount;

    // ---------- Events ----------

    /// @notice A vault clone was created and initialized.
    event VaultCreated(
        address indexed owner, address indexed vault, address indexed watcher, uint256 chainId, string name, string symbol
    );

    /// @param implementation_ ContagionVault implementation for this chain (non-zero).
    constructor(address implementation_) {
        if (implementation_ == address(0)) revert ZeroAddress();
        implementation = implementation_;
    }

    /// @notice Create a vault clone and initialize it atomically.
    /// @param owner_ Vault owner (any address; a multisig is recommended).
    /// @param watcher_ ContagionWatcher that may pause this vault (non-zero).
    /// @param name_ Share token name (1..64 chars).
    /// @param symbol_ Share token symbol (1..16 chars).
    /// @param minDeposit_ Minimum deposit; 0 means the default (0.001 ETH).
    /// @return vault Address of the created clone.
    /// @dev Payable: `msg.value` is the seed deposit (at least MIN_SEED),
    /// forwarded to `initialize()` — its shares are locked at the dead
    /// address. The seed is part of `totalAssets`, so the vault starts
    /// with a defined share price.
    function createVault(address owner_, address watcher_, string calldata name_, string calldata symbol_, uint256 minDeposit_)
        external
        payable
        returns (address vault)
    {
        if (owner_ == address(0)) revert ZeroAddress();
        if (watcher_ == address(0)) revert ZeroAddress();
        if (bytes(name_).length == 0 || bytes(name_).length > MAX_NAME_LEN) revert InvalidName();
        if (bytes(symbol_).length == 0 || bytes(symbol_).length > MAX_SYMBOL_LEN) revert InvalidSymbol();
        if (msg.value < MIN_SEED) revert InsufficientSeed(msg.value, MIN_SEED);

        uint256 minDep = minDeposit_ == 0 ? DEFAULT_MIN_DEPOSIT : minDeposit_;
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, owner_, vaultCount));
        vault = Clones.cloneDeterministic(implementation, salt);
        vaultCount++;
        ContagionVault(payable(vault)).initialize{value: msg.value}(owner_, watcher_, name_, symbol_, minDep);
        emit VaultCreated(owner_, vault, watcher_, block.chainid, name_, symbol_);
    }

    /// @notice Predict the address `createVault` will deploy for
    /// (`creator_`, `owner_`) at the given `nonce_`. Pass `vaultCount`
    /// as `nonce_` for the next vault.
    function predictVault(address creator_, address owner_, uint256 nonce_) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(creator_, owner_, nonce_));
        return Clones.predictDeterministicAddress(implementation, salt, address(this));
    }
}
