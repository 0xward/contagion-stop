// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {SiblingVault} from "./SiblingVault.sol";

/// @title ContagionVaultERC20 — ERC-20-asset variant of ContagionVault (ERC-4626-style)
/// @author ContagionStop (0xward)
/// @notice A circuit-breaker vault whose deposits are accounted as ERC-20
/// shares. The asset is a single ERC-20 token (e.g. canonical USDC, 6
/// decimals), set per clone in `initialize()` — NOT an immutable. One
/// implementation + one factory per chain therefore serve every ERC-20
/// asset; one vault still holds exactly one asset.
///
/// Share accounting mirrors ContagionVault (v2, ETH-native): shares are 18
/// decimals, `decimalsOffset = 18 - assetDecimals` (USDC -> 12), and the
/// conversion formulas are identical, with the virtual offset
/// `10 ** decimalsOffset` in place of v2's fixed 10^6:
/// shares = assets * (totalSupply + 10^offset) / (totalAssets + 1).
///
/// @dev Deployment model: same as v2 — this contract is the IMPLEMENTATION
/// for EIP-1167 clones created by VaultFactoryERC20. The implementation is
/// LOCKED in the constructor (`_disableInitializers()` + ownership
/// renounced). Clones are initialized atomically inside
/// `VaultFactoryERC20.createVault`.
///
/// DELIBERATE DEVIATION FROM v2 — NO SEED: `initialize()` is NOT payable
/// and mints no dead shares. The virtual offset (10^12 for USDC) + the
/// internal ledger + the minimum deposit (1 whole token) make a seed
/// unnecessary: the first depositor can never own the supply with dust,
/// and a direct donation can never move the share price because pricing
/// reads the ledger, never the token balance. Proven by the inflation-
/// attack regression test (no seed, attacker donates, victim made whole).
///
/// SECURITY INVARIANTS (design §3, adapted for an ERC-20 asset):
/// - `totalAssets` is an internal ledger (`totalDeposited`), NEVER
///   `asset.balanceOf(address(this))`. Fee funding (ETH via `receive()`)
///   and direct USDC donations sit in the same contract and must NEVER
///   inflate the share price.
/// - Deposits measure the DELTA of the vault's asset balance around
///   `safeTransferFrom` and credit only what ARRIVED (fee-on-transfer
///   protection). The input amount is never trusted for accounting.
/// - `withdraw()`/`redeem()` stay OPEN while paused. `deposit()`/`mint()`
///   are frozen while paused. The 0-arg ETH `deposit()` reverts outright:
///   this vault takes no ETH deposits — ETH here is only fee funding.
/// - `coverDebt()` pays ONLY from the contract's ETH balance. The user
///   ledger is in the ERC-20 asset, so the entire ETH balance is excess
///   by construction; user asset is never spent on callback debt.
/// - `sweepExcess()` takes only asset above the ledger plus all ETH.
/// - All asset movement uses SafeERC20 (tolerates tokens that return no
///   boolean, e.g. USDT-style).
/// - Freeze risk is an ASSET risk, documented not coded: the issuer
///   (Circle/Tether) can freeze the underlying token; isolation is
///   per-asset — one frozen asset touches only its own vault.
contract ContagionVaultERC20 is SiblingVault, ERC20, Initializable {
    using Math for uint256;
    using SafeERC20 for IERC20;

    // ---------- Errors ----------

    /// @notice Deposit/mint below the vault's minimum (on assets received).
    error BelowMinDeposit(uint256 received_, uint256 minimum_);
    /// @notice Deposit/mint would mint zero shares.
    error ZeroShares();
    /// @notice Withdraw/redeem would move zero assets.
    error ZeroAssets();
    /// @notice Caller holds fewer shares than required.
    error InsufficientShares(uint256 required_, uint256 held_);
    /// @notice Share name empty or too long.
    error InvalidName();
    /// @notice Share symbol empty or too long.
    error InvalidSymbol();
    /// @notice The v1 owner-sweep `withdraw(uint256)` is removed.
    error WithdrawV1Removed();
    /// @notice `sweepExcess()` called with no excess above the ledger and no ETH.
    error NoExcess();
    /// @notice The 0-arg ETH `deposit()` is not supported on an ERC-20 vault.
    error EthDepositNotSupported();
    /// @notice Asset address is zero or has no code.
    error InvalidAsset();
    /// @notice Asset decimals could not be read, or exceed 18.
    error InvalidAssetDecimals();

    // ---------- Events ----------

    /// @notice A deposit/mint credited `assets` and minted `shares` to `receiver`.
    event Deposit(address indexed sender, address indexed receiver, uint256 assets, uint256 shares);
    /// @notice A withdrawal/redeem burned `shares` and paid `assets` to `receiver`.
    event Withdraw(address indexed sender, address indexed receiver, uint256 assets, uint256 shares);
    /// @notice Excess swept to the owner: asset above the ledger + all ETH.
    event ExcessSwept(address indexed to, uint256 assetAmount, uint256 ethAmount);
    /// @notice A clone was initialized (asset, name/symbol/minDeposit set).
    event VaultInitialized(
        address indexed owner,
        address indexed watcher,
        address indexed asset,
        string name,
        string symbol,
        uint256 minDeposit
    );

    // ---------- Storage (clone) ----------

    /// @notice Share token name (set in `initialize()`).
    string private _vaultName;
    /// @notice Share token symbol (set in `initialize()`).
    string private _vaultSymbol;
    /// @notice Minimum deposit for this vault, in asset units (set in `initialize()`).
    uint256 public minDeposit;
    /// @notice The single ERC-20 asset of this vault (set in `initialize()`).
    IERC20 public assetToken;
    /// @notice Decimals of the asset, read in `initialize()` (USDC -> 6).
    uint8 public assetDecimals;
    /// @notice 18 - assetDecimals (USDC -> 12). Shares are always 18 decimals.
    uint256 public decimalsOffset;

    /// @notice Implementation constructor. Locks the implementation:
    /// `_disableInitializers()` blocks `initialize()` on this contract, and
    /// ownership is renounced so no `onlyOwner` function can ever be called
    /// on it. The placeholder ERC20 name/symbol are never used — clones
    /// override them from storage (see `name()`/`symbol()`).
    constructor(IPayable callbackProxy_)
        SiblingVault(callbackProxy_, msg.sender, address(0))
        ERC20("ContagionVaultERC20 Share", "CVS20")
    {
        _disableInitializers();
        renounceOwnership();
    }

    // ---------- Initialization (clone) ----------

    /// @notice Initialize a clone. Atomic with deployment — called by
    /// `VaultFactoryERC20.createVault` in the same transaction as the clone.
    /// @param owner_ Vault owner (any address; a multisig is recommended).
    /// @param watcher_ ContagionWatcher that may pause this vault (non-zero).
    /// @param asset_ ERC-20 asset (non-zero, must have code, decimals readable and <= 18).
    /// @param name_ Share token name (1..64 chars).
    /// @param symbol_ Share token symbol (1..16 chars).
    /// @param minDeposit_ Minimum deposit in asset units; 0 means the
    /// default — one whole token (10 ** assetDecimals, e.g. 1 USDC = 1e6).
    /// @dev NOT payable: there is no seed in this variant (see the deviation
    /// note in the contract header).
    function initialize(
        address owner_,
        address watcher_,
        address asset_,
        string calldata name_,
        string calldata symbol_,
        uint256 minDeposit_
    ) external initializer {
        if (owner_ == address(0)) revert ZeroAddress();
        if (watcher_ == address(0)) revert ZeroAddress();
        if (asset_ == address(0) || asset_.code.length == 0) revert InvalidAsset();

        (bool ok, uint8 dec) = SafeERC20.tryGetDecimals(IERC20(asset_));
        if (!ok || dec > 18) revert InvalidAssetDecimals();

        _transferOwnership(owner_);
        watcher = watcher_;
        assetToken = IERC20(asset_);
        assetDecimals = dec;
        decimalsOffset = 18 - uint256(dec);
        _initShareMetadata(name_, symbol_, minDeposit_);
    }

    /// @notice Set share name/symbol/minDeposit and emit the init event.
    /// Split out of `initialize()` to keep the initializer's stack shallow
    /// (solc non-IR "stack too deep" without this split).
    function _initShareMetadata(string calldata name_, string calldata symbol_, uint256 minDeposit_) internal {
        if (bytes(name_).length == 0 || bytes(name_).length > 64) revert InvalidName();
        if (bytes(symbol_).length == 0 || bytes(symbol_).length > 16) revert InvalidSymbol();
        _vaultName = name_;
        _vaultSymbol = symbol_;
        minDeposit = minDeposit_ == 0 ? 10 ** uint256(assetDecimals) : minDeposit_;
        emit VaultInitialized(owner(), watcher, address(assetToken), _vaultName, _vaultSymbol, minDeposit);
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

    /// @notice Shares are always 18 decimals, whatever the asset decimals.
    function decimals() public view override returns (uint8) {
        return 18;
    }

    /// @notice The underlying ERC-20 asset address.
    function asset() public view returns (address) {
        return address(assetToken);
    }

    // ---------- Accounting views (ERC-4626-style) ----------

    /// @notice Total user funds, from the internal ledger. NEVER the
    /// asset balance (donations are not user funds).
    function totalAssets() public view returns (uint256) {
        return totalDeposited;
    }

    /// @notice Shares minted for `assets` (rounds down).
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

    /// @notice Assets `mint(shares)` would pull (rounds UP — the vault never under-charges).
    function previewMint(uint256 shares) public view returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Ceil);
    }

    /// @notice Shares `withdraw(assets)` would burn (rounds UP).
    function previewWithdraw(uint256 assets) public view returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Ceil);
    }

    /// @notice Assets `redeem(shares)` would return (rounds down).
    function previewRedeem(uint256 shares) public view returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Floor);
    }

    /// @notice shares = assets * (totalSupply + 10^offset) / (totalAssets + 1).
    /// The virtual shares and +1 virtual asset keep the price defined (and
    /// bounded) even when the vault is empty.
    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view returns (uint256) {
        return assets.mulDiv(totalSupply() + 10 ** decimalsOffset, totalDeposited + 1, rounding);
    }

    /// @notice assets = shares * (totalAssets + 1) / (totalSupply + 10^offset).
    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view returns (uint256) {
        return shares.mulDiv(totalDeposited + 1, totalSupply() + 10 ** decimalsOffset, rounding);
    }

    // ---------- Deposits (frozen while paused) ----------

    /// @notice ETH deposits are NOT supported on an ERC-20 vault. ETH sent
    /// to `receive()` stays fee funding for the callback proxy; it is never
    /// a deposit. Use `deposit(uint256,address)` with the ERC-20 asset.
    function deposit() external payable override {
        revert EthDepositNotSupported();
    }

    /// @notice Deposit `assets` of the ERC-20 asset; mints shares to `receiver`.
    /// @dev Measures the balance DELTA around `safeTransferFrom` and credits
    /// only what arrived (fee-on-transfer protection). `nonReentrant`: the
    /// asset transfer is an external call to untrusted code.
    function deposit(uint256 assets, address receiver) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (assets == 0) revert ZeroAssets();
        if (receiver == address(0)) revert ZeroAddress();
        uint256 received = _pullAsset(assets);
        if (received < minDeposit) revert BelowMinDeposit(received, minDeposit);
        shares = _convertToShares(received, Math.Rounding.Floor);
        if (shares == 0) revert ZeroShares();
        totalDeposited += received;
        _mint(receiver, shares);
        emit Deposit(msg.sender, receiver, received, shares);
    }

    /// @notice Mint exactly `shares` to `receiver`, pulling the needed assets.
    /// @dev Same delta + minimum guarantees as `deposit()`.
    function mint(uint256 shares, address receiver) external nonReentrant whenNotPaused returns (uint256 assets) {
        if (shares == 0) revert ZeroShares();
        if (receiver == address(0)) revert ZeroAddress();
        assets = _convertToAssets(shares, Math.Rounding.Ceil);
        if (assets == 0) revert ZeroAssets();
        uint256 received = _pullAsset(assets);
        if (received < minDeposit) revert BelowMinDeposit(received, minDeposit);
        // Fee-on-transfer tokens may deliver less than the exact amount
        // `mint` asked for: credit the shares for what arrived, never more
        // than requested, and never mint shares without backing assets.
        uint256 mintShares = _convertToShares(received, Math.Rounding.Floor);
        if (mintShares == 0) revert ZeroShares();
        if (mintShares > shares) mintShares = shares;
        totalDeposited += received;
        _mint(receiver, mintShares);
        emit Deposit(msg.sender, receiver, received, mintShares);
        // Report what actually arrived (== the requested amount for a
        // well-behaved token, less for a fee-on-transfer token).
        return received;
    }

    /// @notice Pull `assets` from the caller and return what actually arrived.
    function _pullAsset(uint256 assets) internal returns (uint256 received) {
        uint256 before = assetToken.balanceOf(address(this));
        assetToken.safeTransferFrom(msg.sender, address(this), assets);
        uint256 afterBal = assetToken.balanceOf(address(this));
        // A fee-on-transfer (or otherwise short-delivering) token arrives
        // with less; a balance that fell cannot happen here, but guard the
        // subtraction anyway.
        received = afterBal > before ? afterBal - before : 0;
    }

    // ---------- Withdrawals (OPEN while paused — funds are never trapped) ----------

    /// @notice The v1 owner-sweep `withdraw(uint256)` is REMOVED.
    /// The owner is a depositor like everyone else: use
    /// `withdraw(uint256,address)` or `redeem(uint256,address)`.
    function withdraw(uint256 /*amount*/) external pure override {
        revert WithdrawV1Removed();
    }

    /// @notice Burn shares to withdraw `assets` of the ERC-20 asset to `receiver`.
    /// @dev NO `whenNotPaused`: withdrawals stay open during a pause.
    /// Checks-effects-interactions: the ledger is reduced and shares burned
    /// BEFORE the asset transfer, and the function is `nonReentrant`.
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
        assetToken.safeTransfer(receiver, assets);
    }

    /// @notice Burn `shares` to withdraw the corresponding asset to `receiver`.
    /// @dev Same guarantees as `withdraw`: open while paused, burn before
    /// the asset transfer, `nonReentrant`.
    function redeem(uint256 shares, address receiver) external nonReentrant returns (uint256 assets) {
        if (shares == 0) revert ZeroShares();
        if (receiver == address(0)) revert ZeroAddress();
        assets = _convertToAssets(shares, Math.Rounding.Floor);
        if (assets == 0) revert ZeroAssets();
        if (assets > totalDeposited) revert InsufficientBalance(assets, totalDeposited);
        totalDeposited -= assets;
        _burn(msg.sender, shares);
        emit Withdraw(msg.sender, receiver, assets, shares);
        assetToken.safeTransfer(receiver, assets);
    }

    // ---------- Fee funding / debt (guarded) ----------

    /// @notice Pay outstanding callback debt to the proxy — ONLY from the
    /// contract's ETH balance. The user ledger is in the ERC-20 asset, so
    /// ALL ETH in this contract is fee funding (excess by construction);
    /// user asset is never touched. If the debt exceeds the ETH balance,
    /// only the balance is paid and the remainder stays outstanding.
    function coverDebt() external override {
        uint256 debt = _SERVICE_PROVIDER.debt(address(this));
        uint256 ethBal = address(this).balance;
        uint256 amount = debt > ethBal ? ethBal : debt;
        if (amount > 0) {
            _pay(payable(_SERVICE_PROVIDER), amount);
        }
    }

    /// @notice Sweep ONLY the excess to the owner: asset above the user
    /// ledger (donations) plus the ENTIRE ETH balance (unused fee funding).
    /// Reverts when there is nothing to sweep — it can never draw the asset
    /// below `totalAssets`.
    function sweepExcess() external nonReentrant onlyOwner {
        uint256 assetBal = assetToken.balanceOf(address(this));
        uint256 assetExcess = assetBal > totalDeposited ? assetBal - totalDeposited : 0;
        uint256 ethBal = address(this).balance;
        if (assetExcess == 0 && ethBal == 0) revert NoExcess();
        emit ExcessSwept(msg.sender, assetExcess, ethBal);
        if (assetExcess > 0) {
            assetToken.safeTransfer(msg.sender, assetExcess);
        }
        if (ethBal > 0) {
            (bool ok,) = payable(msg.sender).call{value: ethBal}("");
            if (!ok) revert EthTransferFailed();
        }
    }
}
