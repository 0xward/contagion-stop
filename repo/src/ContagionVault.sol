// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {SiblingVault} from "./SiblingVault.sol";

/// @title ContagionVault — v2 vault: SiblingVault + ERC-20 shares (ERC-4626-style, ETH-native)
/// @author ContagionStop (0xward)
/// @notice A circuit-breaker vault whose deposits are accounted as ERC-20
/// shares. ETH-native: the asset IS ETH (no WETH), and the accounting follows
/// ERC-4626 rounding semantics (deposit mints round down, withdraw burns
/// round up). This contract is NOT ERC-4626-compliant (the asset is ETH,
/// not an ERC-20) — the correct claim is "ERC-4626-style share accounting,
/// ETH-native". A stablecoin variant is deliberately NOT built in: the
/// share-accounting shape is asset-agnostic, but the asset here is ETH by
/// design; a stablecoin vault would be a separate implementation, not a
/// parameter flip.
///
/// @dev Deployment model: this contract is the IMPLEMENTATION for EIP-1167
/// clones created by VaultFactory. The implementation itself is LOCKED in
/// the constructor (`_disableInitializers()` + ownership renounced), so it
/// can never be initialized or used as a vault. Clones are initialized
/// atomically inside `VaultFactory.createVault` — an uninitialized clone
/// never exists on-chain.
///
/// SECURITY INVARIANTS (design §3, all covered by tests):
/// - `totalAssets` is an internal ledger (`totalDeposited`), NEVER
///   `address(this).balance`. Fee funding (ETH sent to `receive()`) and
///   donations sit in the same contract and must NEVER inflate the share
///   price. Only `deposit()`/`initialize()` add to the ledger; only
///   `withdraw()`/`redeem()` subtract from it.
/// - First-depositor inflation is mitigated in layers: a virtual share
///   offset of 10^6 (ERC-4626-style), an internal ledger (donations are
///   invisible to pricing), a dead-share seed at deploy, and a minimum
///   deposit of 0.001 ETH.
/// - `withdraw()`/`redeem()` stay OPEN while paused (only deposits are
///   frozen). Pausing must never trap user funds.
/// - `coverDebt()` pays ONLY from the excess above the user ledger. User
///   deposits are never spent on callback debt. NOTE: the proxy-initiated
///   `pay()` (inherited from AbstractPayer, NOT virtual, cannot be
///   overridden) still pays whatever the proxy requests; it is bounded in
///   practice because debt only grows by executed callbacks (~0.00000061
///   ETH each, measured) and the operator funds an excess buffer. Keep the
///   excess funded above expected callback debt.
contract ContagionVault is SiblingVault, ERC20, Initializable {
    using Math for uint256;

    // ---------- Errors ----------

    /// @notice Deposit below the vault's minimum.
    error BelowMinDeposit(uint256 sent_, uint256 minimum_);
    /// @notice Deposit would mint zero shares.
    error ZeroShares();
    /// @notice Withdraw/redeem would move zero assets.
    error ZeroAssets();
    /// @notice Caller holds fewer shares than required.
    error InsufficientShares(uint256 required_, uint256 held_);
    /// @notice Seed sent with initialize() below the minimum.
    error InsufficientSeed(uint256 sent_, uint256 required_);
    /// @notice Share name empty or too long.
    error InvalidName();
    /// @notice Share symbol empty or too long.
    error InvalidSymbol();
    /// @notice Minimum deposit of zero.
    error InvalidMinDeposit();
    /// @notice The v1 owner-sweep `withdraw(uint256)` is removed in v2.
    error WithdrawV1Removed();
    /// @notice `sweepExcess()` called with no excess above the ledger.
    error NoExcess();

    // ---------- Events ----------

    /// @notice A deposit minted shares to `sender`.
    event Deposit(address indexed sender, uint256 assets, uint256 shares);
    /// @notice A withdrawal/redeem burned shares and paid ETH to `receiver`.
    event Withdraw(address indexed sender, address indexed receiver, uint256 assets, uint256 shares);
    /// @notice Excess ETH above the user ledger swept to the owner.
    event ExcessSwept(address indexed to, uint256 amount);
    /// @notice A clone was initialized (name/symbol/minDeposit set, seed minted).
    event VaultInitialized(
        address indexed owner, address indexed watcher, string name, string symbol, uint256 minDeposit
    );

    // ---------- Constants ----------

    /// @notice Virtual share offset (ERC-4626-style) against first-depositor inflation.
    uint256 internal constant _SHARE_OFFSET = 1_000_000;
    /// @notice Minimum seed (dead-share deposit) sent with `initialize()`.
    uint256 public constant MIN_SEED = 0.001 ether;
    /// @notice Default minimum deposit when the factory caller passes 0.
    uint256 public constant DEFAULT_MIN_DEPOSIT = 0.001 ether;
    /// @notice Burn address for the dead-share seed (locked forever).
    address internal constant _DEAD = 0x000000000000000000000000000000000000dEaD;

    // ---------- Storage (clone) ----------

    /// @notice Share token name (set in `initialize()`).
    string private _vaultName;
    /// @notice Share token symbol (set in `initialize()`).
    string private _vaultSymbol;
    /// @notice Minimum deposit for this vault (set in `initialize()`).
    uint256 public minDeposit;

    /// @notice Implementation constructor. Locks the implementation:
    /// `_disableInitializers()` blocks `initialize()` on this contract, and
    /// ownership is renounced so no `onlyOwner` function can ever be called
    /// on it. The placeholder ERC20 name/symbol are never used — clones
    /// override them from storage (see `name()`/`symbol()`).
    constructor(IPayable callbackProxy_)
        SiblingVault(callbackProxy_, msg.sender, address(0))
        ERC20("ContagionVault Share", "CVS")
    {
        _disableInitializers();
        renounceOwnership();
    }

    // ---------- Initialization (clone) ----------

    /// @notice Initialize a clone. Atomic with deployment — called by
    /// `VaultFactory.createVault` in the same transaction as the clone.
    /// @param owner_ Vault owner (any address; a multisig is recommended).
    /// @param watcher_ ContagionWatcher that may pause this vault (non-zero).
    /// @param name_ Share token name (1..64 chars).
    /// @param symbol_ Share token symbol (1..16 chars).
    /// @param minDeposit_ Minimum deposit (must be > 0).
    /// @dev Payable: the ETH sent becomes the seed deposit — its shares are
    /// minted to the dead address and locked forever (first-depositor
    /// inflation mitigation, design §3.3.3). Requires at least MIN_SEED.
    function initialize(address owner_, address watcher_, string calldata name_, string calldata symbol_, uint256 minDeposit_)
        external
        payable
        initializer
    {
        if (owner_ == address(0)) revert ZeroAddress();
        if (watcher_ == address(0)) revert ZeroAddress();
        if (bytes(name_).length == 0 || bytes(name_).length > 64) revert InvalidName();
        if (bytes(symbol_).length == 0 || bytes(symbol_).length > 16) revert InvalidSymbol();
        if (minDeposit_ == 0) revert InvalidMinDeposit();
        if (msg.value < MIN_SEED) revert InsufficientSeed(msg.value, MIN_SEED);

        _transferOwnership(owner_);
        watcher = watcher_;
        _vaultName = name_;
        _vaultSymbol = symbol_;
        minDeposit = minDeposit_;

        // Seed: price it with an empty ledger (totalSupply = 0,
        // totalDeposited = 0) so seed shares = seed * 1e6, then record the
        // seed in the ledger and lock its shares at the dead address.
        uint256 seedShares = _convertToShares(msg.value, Math.Rounding.Floor);
        totalDeposited += msg.value;
        _mint(_DEAD, seedShares);
        emit Deposit(msg.sender, msg.value, seedShares);
        emit VaultInitialized(owner_, watcher_, name_, symbol_, minDeposit_);
    }

    // ---------- ERC-20 share metadata (clone) ----------

    /// @notice Share name (from `initialize()`; overrides the ERC20 placeholder).
    function name() public view override returns (string memory) {
        return _vaultName;
    }

    /// @notice Share symbol (from `initialize()`; overrides the ERC20 placeholder).
    function symbol() public view override returns (string memory) {
        return _vaultSymbol;
    }

    // ---------- Accounting views (ERC-4626-style, ETH-native) ----------

    /// @notice Total user funds, from the internal ledger. NEVER the
    /// contract balance (fee funding + donations are not user funds).
    function totalAssets() public view returns (uint256) {
        return totalDeposited;
    }

    /// @notice Shares minted for `assets` (rounds down — depositor-favourable bound).
    function convertToShares(uint256 assets) public view returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    /// @notice Assets returned for `shares` (rounds down).
    function convertToAssets(uint256 shares) public view returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Floor);
    }

    /// @notice Shares `deposit(assets)` would mint (rounds down).
    function previewDeposit(uint256 assets) public view returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    /// @notice Shares `withdraw(assets)` would burn (rounds UP — the vault never under-charges).
    function previewWithdraw(uint256 assets) public view returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Ceil);
    }

    /// @notice Assets `redeem(shares)` would return (rounds down).
    function previewRedeem(uint256 shares) public view returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Floor);
    }

    /// @notice shares = assets * (totalSupply + 1e6) / (totalAssets + 1).
    /// The +1e6 virtual shares and +1 virtual asset keep the price defined
    /// (and bounded) even when the vault is empty.
    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view returns (uint256) {
        return assets.mulDiv(totalSupply() + _SHARE_OFFSET, totalDeposited + 1, rounding);
    }

    /// @notice assets = shares * (totalAssets + 1) / (totalSupply + 1e6).
    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view returns (uint256) {
        return shares.mulDiv(totalDeposited + 1, totalSupply() + _SHARE_OFFSET, rounding);
    }

    // ---------- Deposits (frozen while paused) ----------

    /// @notice Deposit ETH while active; mints shares to the sender.
    /// @dev Overrides `SiblingVault.deposit`. The base signature has no
    /// return value, so the minted amount is reported in the `Deposit`
    /// event and readable beforehand via `previewDeposit` / `balanceOf`.
    function deposit() external payable override whenNotPaused {
        if (msg.value < minDeposit) revert BelowMinDeposit(msg.value, minDeposit);
        uint256 shares = _convertToShares(msg.value, Math.Rounding.Floor);
        if (shares == 0) revert ZeroShares();
        totalDeposited += msg.value;
        _mint(msg.sender, shares);
        emit Deposit(msg.sender, msg.value, shares);
    }

    // ---------- Withdrawals (OPEN while paused — funds are never trapped) ----------

    /// @notice The v1 owner-sweep `withdraw(uint256)` is REMOVED in v2.
    /// The owner is a depositor like everyone else: use
    /// `withdraw(uint256,address)` or `redeem(uint256,address)`.
    /// @dev Overrides the v1 function with an explicit revert so a caller
    /// using the old signature fails loudly instead of silently doing
    /// something else.
    function withdraw(uint256 /*amount*/) external pure override {
        revert WithdrawV1Removed();
    }

    /// @notice Burn shares to withdraw `assets` ETH to `receiver`.
    /// @dev NO `whenNotPaused`: withdrawals stay open during a pause
    /// (design decision 3). Checks-effects-interactions: the ledger is
    /// reduced and shares burned BEFORE the ETH call, and the function is
    /// `nonReentrant`.
    function withdraw(uint256 assets, address receiver) external nonReentrant returns (uint256 shares) {
        if (assets == 0) revert ZeroAssets();
        if (receiver == address(0)) revert ZeroAddress();
        if (assets > totalDeposited) revert InsufficientBalance(assets, totalDeposited);
        shares = _convertToShares(assets, Math.Rounding.Ceil);
        if (shares == 0) revert ZeroShares();
        if (shares > balanceOf(msg.sender)) revert InsufficientShares(shares, balanceOf(msg.sender));
        totalDeposited -= assets;
        _burn(msg.sender, shares);
        emit Withdraw(msg.sender, receiver, assets, shares);
        (bool ok,) = payable(receiver).call{value: assets}("");
        if (!ok) revert EthTransferFailed();
    }

    /// @notice Burn `shares` to withdraw the corresponding ETH to `receiver`.
    /// @dev Same guarantees as `withdraw`: open while paused, burn before
    /// the ETH call, `nonReentrant`.
    function redeem(uint256 shares, address receiver) external nonReentrant returns (uint256 assets) {
        if (shares == 0) revert ZeroShares();
        if (receiver == address(0)) revert ZeroAddress();
        assets = _convertToAssets(shares, Math.Rounding.Floor);
        if (assets == 0) revert ZeroAssets();
        if (assets > totalDeposited) revert InsufficientBalance(assets, totalDeposited);
        totalDeposited -= assets;
        _burn(msg.sender, shares);
        emit Withdraw(msg.sender, receiver, assets, shares);
        (bool ok,) = payable(receiver).call{value: assets}("");
        if (!ok) revert EthTransferFailed();
    }

    // ---------- Fee funding / debt (guarded) ----------

    /// @notice Pay outstanding callback debt to the proxy — ONLY from the
    /// excess above the user ledger (`balance - totalAssets`). User deposits
    /// are never spent on debt. If the debt exceeds the excess, only the
    /// excess is paid and the remainder stays outstanding until the vault
    /// is topped up (the vault will stay paused for callbacks until then —
    /// by design, same as v1).
    function coverDebt() external override {
        uint256 debt = _SERVICE_PROVIDER.debt(address(this));
        uint256 excess =
            address(this).balance > totalDeposited ? address(this).balance - totalDeposited : 0;
        uint256 amount = debt > excess ? excess : debt;
        if (amount > 0) {
            _pay(payable(_SERVICE_PROVIDER), amount);
        }
    }

    /// @notice Sweep ONLY the excess above the user ledger to the owner
    /// (fee funding the operator no longer needs, or donations). Reverts
    /// when there is no excess — it can never draw below `totalAssets`.
    function sweepExcess() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        if (bal <= totalDeposited) revert NoExcess();
        uint256 excess = bal - totalDeposited;
        emit ExcessSwept(msg.sender, excess);
        (bool ok,) = payable(msg.sender).call{value: excess}("");
        if (!ok) revert EthTransferFailed();
    }
}
