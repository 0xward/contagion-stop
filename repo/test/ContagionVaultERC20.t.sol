// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test, console} from "forge-std/Test.sol";
import {ContagionVaultERC20} from "../src/ContagionVaultERC20.sol";
import {VaultFactoryERC20} from "../src/VaultFactoryERC20.sol";
import {SiblingVault} from "../src/SiblingVault.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {LocalCallbackProxy} from "./fixtures/LocalCallbackProxy.sol";
import {UsdcFixture} from "./fixtures/UsdcFixture.sol";
import {FeeTokenFixture} from "./fixtures/FeeTokenFixture.sol";
import {ReentrantAssetFixture} from "./fixtures/ReentrantAssetFixture.sol";

/// @title ContagionVaultERC20 unit tests — USDC-variant share accounting + §3 security properties
/// @notice Tests run against a factory-created clone (the real deployment
/// path), not against the implementation directly. The asset is the local
/// UsdcFixture (6 decimals, plain ERC-20) standing in for canonical USDC
/// (Base Sepolia 0x036CbD53842c5426634e7929541eC2318f3dCF7e, Unichain
/// Sepolia 0x31d0220469e10c4E71834a79b1f276d740d3768F — both 6 decimals).
contract ContagionVaultERC20Test is Test {
    // Real Base Sepolia callback proxy address (local stand-in etched there, same
    // pattern as SiblingVault.t.sol).
    IPayable internal constant PROXY = IPayable(payable(0x476F44b11F5C942c58f4c8E3d0300E5710743585));
    address internal constant WATCHER = address(0xBEEF);

    uint256 internal constant ONE_USDC = 1e6;
    uint256 internal constant MIN_DEPOSIT = 1e6; // 1 whole USDC (default)

    VaultFactoryERC20 internal factory;
    ContagionVaultERC20 internal implementation;
    ContagionVaultERC20 internal vault;
    LocalCallbackProxy internal proxy;
    UsdcFixture internal usdc;

    address internal owner;
    address internal alice;
    address internal bob;

    function setUp() public {
        owner = makeAddr("owner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        proxy = new LocalCallbackProxy();
        vm.etch(address(PROXY), address(proxy).code);

        usdc = new UsdcFixture();
        usdc.mint(alice, 1_000_000 * ONE_USDC);
        usdc.mint(bob, 1_000_000 * ONE_USDC);
        usdc.mint(owner, 1_000_000 * ONE_USDC);

        implementation = new ContagionVaultERC20(PROXY);
        factory = new VaultFactoryERC20(address(implementation));

        vm.prank(owner);
        address v = factory.createVault(
            owner, WATCHER, address(usdc), "ContagionStop USDC Vault Share", "CSUSDC", 0
        );
        vault = ContagionVaultERC20(payable(v));
    }

    // ---------- helpers ----------

    /// @notice Pause the vault through the local proxy, as the watcher would.
    function _pauseViaProxy() internal {
        LocalCallbackProxy(payable(address(PROXY))).executeCallback(
            address(vault), abi.encodeWithSelector(SiblingVault.pause.selector, address(0)), WATCHER
        );
    }

    /// @notice Set the local proxy's debt bookkeeping for this vault.
    function _setDebt(uint256 amount) internal {
        LocalCallbackProxy(payable(address(PROXY))).setDebt(address(vault), amount);
    }

    function _approve(address who, uint256 amount) internal {
        vm.prank(who);
        usdc.approve(address(vault), amount);
    }

    function _deposit(address who, uint256 amount) internal returns (uint256 shares) {
        uint256 before = vault.balanceOf(who);
        _approve(who, amount);
        vm.prank(who);
        shares = vault.deposit(amount, who);
        assertEq(vault.balanceOf(who) - before, shares);
    }

    // ---------- initialize / factory path ----------

    function test_InitializeSetsFields() public view {
        assertEq(vault.name(), "ContagionStop USDC Vault Share");
        assertEq(vault.symbol(), "CSUSDC");
        assertEq(vault.decimals(), 18, "shares are 18 decimals");
        assertEq(vault.asset(), address(usdc));
        assertEq(vault.assetDecimals(), 6);
        assertEq(vault.decimalsOffset(), 12);
        assertEq(vault.minDeposit(), MIN_DEPOSIT);
        assertEq(vault.owner(), owner);
        assertEq(vault.watcher(), WATCHER);
        assertEq(vault.totalAssets(), 0, "no seed in the ERC-20 variant");
        assertEq(vault.totalSupply(), 0);
        assertFalse(vault.paused());
    }

    function test_InitializeTwiceReverts() public {
        vm.expectRevert(abi.encodeWithSignature("InvalidInitialization()"));
        vault.initialize(owner, WATCHER, address(usdc), "X", "X", MIN_DEPOSIT);
    }

    function test_ImplementationLocked() public {
        vm.expectRevert(abi.encodeWithSignature("InvalidInitialization()"));
        implementation.initialize(owner, WATCHER, address(usdc), "X", "X", MIN_DEPOSIT);
        assertEq(implementation.owner(), address(0));
        assertEq(implementation.watcher(), address(0));
    }

    function test_EthDepositReverts() public {
        vm.deal(alice, 10 ether);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(ContagionVaultERC20.EthDepositNotSupported.selector)
        );
        vault.deposit{value: 1 ether}();
        // Plain ETH still lands as fee funding (receive), not a deposit.
        vm.prank(alice);
        (bool ok,) = payable(address(vault)).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(vault.totalAssets(), 0);
        assertEq(address(vault).balance, 1 ether);
    }

    // ---------- deposit / mint ----------

    function test_DepositMintsShares() public {
        uint256 preview = vault.previewDeposit(100 * ONE_USDC);
        uint256 shares = _deposit(alice, 100 * ONE_USDC);
        assertEq(shares, preview);
        assertEq(vault.balanceOf(alice), preview);
        assertEq(vault.totalAssets(), 100 * ONE_USDC);
        assertEq(usdc.balanceOf(address(vault)), 100 * ONE_USDC);
    }

    function test_DepositFirstGetsOneShareUnitPerUsdc() public {
        // Offset 10^12: first deposit of 1 USDC (1e6) mints 1e18 shares.
        uint256 shares = _deposit(alice, ONE_USDC);
        assertEq(shares, 1e18);
    }

    function test_DepositBelowMinReverts() public {
        _approve(alice, ONE_USDC - 1);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ContagionVaultERC20.BelowMinDeposit.selector, ONE_USDC - 1, MIN_DEPOSIT
            )
        );
        vault.deposit(ONE_USDC - 1, alice);
    }

    function test_DepositZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ContagionVaultERC20.ZeroAssets.selector));
        vault.deposit(0, alice);
    }

    function test_DepositToZeroAddressReverts() public {
        _approve(alice, 10 * ONE_USDC);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        vault.deposit(10 * ONE_USDC, address(0));
    }

    function test_DepositWhenPausedReverts() public {
        _deposit(alice, 100 * ONE_USDC);
        _pauseViaProxy();
        assertTrue(vault.paused());
        _approve(alice, 100 * ONE_USDC);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        vault.deposit(100 * ONE_USDC, alice);
        // No tokens moved: the revert happened before transferFrom.
        assertEq(usdc.balanceOf(address(vault)), 100 * ONE_USDC);
    }

    function test_MintWorks() public {
        uint256 shares = vault.previewDeposit(100 * ONE_USDC);
        uint256 previewAssets = vault.previewMint(shares);
        _approve(alice, previewAssets);
        vm.prank(alice);
        uint256 spent = vault.mint(shares, alice);
        assertEq(vault.balanceOf(alice), shares);
        assertEq(spent, previewAssets);
        assertGe(spent, 100 * ONE_USDC - 2);
        assertLe(spent, 100 * ONE_USDC + 2);
        assertEq(vault.totalAssets(), spent);
    }

    function test_MintZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ContagionVaultERC20.ZeroShares.selector));
        vault.mint(0, alice);
    }

    function test_MintWhenPausedReverts() public {
        _pauseViaProxy();
        _approve(alice, 100 * ONE_USDC);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        vault.mint(1e18, alice);
    }

    // ---------- withdraw / redeem (open while paused) ----------

    function test_WithdrawWorksWhenPaused() public {
        _deposit(alice, 100 * ONE_USDC);
        _pauseViaProxy();
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 shares = vault.withdraw(50 * ONE_USDC, alice);
        assertGt(shares, 0);
        assertEq(usdc.balanceOf(alice) - balBefore, 50 * ONE_USDC);
        assertEq(vault.totalAssets(), 50 * ONE_USDC);
    }

    function test_RedeemWorksWhenPaused() public {
        uint256 shares = _deposit(alice, 100 * ONE_USDC);
        _pauseViaProxy();
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 assets = vault.redeem(shares, alice);
        // Floor rounding on both legs: within 2 base units of the deposit.
        assertGe(assets, 100 * ONE_USDC - 2);
        assertLe(assets, 100 * ONE_USDC);
        assertEq(usdc.balanceOf(alice) - balBefore, assets);
        assertLe(vault.totalAssets(), 2);
        assertEq(vault.balanceOf(alice), 0);
    }

    function test_WithdrawOverShareValueReverts() public {
        _deposit(alice, 100 * ONE_USDC);
        vm.prank(alice);
        vm.expectRevert();
        vault.withdraw(200 * ONE_USDC, alice);
    }

    function test_WithdrawZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ContagionVaultERC20.ZeroAssets.selector));
        vault.withdraw(0, alice);
    }

    function test_RedeemZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ContagionVaultERC20.ZeroShares.selector));
        vault.redeem(0, alice);
    }

    function test_WithdrawToZeroAddressReverts() public {
        _deposit(alice, 100 * ONE_USDC);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        vault.withdraw(50 * ONE_USDC, address(0));
    }

    function test_OldWithdrawReverts() public {
        _deposit(alice, 100 * ONE_USDC);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ContagionVaultERC20.WithdrawV1Removed.selector));
        vault.withdraw(50 * ONE_USDC);
    }

    function test_PreviewConsistency() public {
        uint256 preview = vault.previewDeposit(100 * ONE_USDC);
        uint256 shares = _deposit(alice, 100 * ONE_USDC);
        assertEq(shares, preview);
        uint256 need = vault.previewWithdraw(50 * ONE_USDC);
        vm.prank(alice);
        uint256 burned = vault.withdraw(50 * ONE_USDC, alice);
        assertEq(burned, need);
        uint256 rest = vault.balanceOf(alice);
        assertEq(vault.previewRedeem(rest), vault.convertToAssets(rest));
        // previewMint round-trips the remaining shares.
        uint256 mintAssets = vault.previewMint(rest);
        assertGe(mintAssets, vault.convertToAssets(rest));
        assertLe(mintAssets, vault.convertToAssets(rest) + 2);
    }

    function test_ShareTransferWhilePaused() public {
        uint256 shares = _deposit(alice, 100 * ONE_USDC);
        _pauseViaProxy();
        vm.prank(alice);
        bool ok = vault.transfer(bob, shares / 2);
        assertTrue(ok);
        assertEq(vault.balanceOf(bob), shares / 2);
    }

    // ---------- §3.2: ledger vs balance (donations never inflate the price) ----------

    function test_DonationDoesNotChangeSharePrice() public {
        uint256 priceBefore = vault.previewDeposit(100 * ONE_USDC);
        // Donate 10_000 USDC directly (not through deposit()).
        vm.prank(bob);
        bool ok = usdc.transfer(address(vault), 10_000 * ONE_USDC);
        assertTrue(ok);
        assertEq(vault.totalAssets(), 0); // ledger unchanged
        assertEq(usdc.balanceOf(address(vault)), 10_000 * ONE_USDC);
        assertEq(vault.previewDeposit(100 * ONE_USDC), priceBefore); // price unchanged
    }

    // ---------- §3.3: first-depositor inflation attack (NO seed) ----------

    function test_FirstDepositorInflationAttackFails() public {
        // Attacker takes the first user deposit (minimum) then donates 10_000 USDC.
        _deposit(alice, MIN_DEPOSIT); // alice plays the attacker here
        vm.prank(alice);
        bool ok = usdc.transfer(address(vault), 10_000 * ONE_USDC);
        assertTrue(ok);

        // Victim deposits the minimum afterwards.
        uint256 victimShares = _deposit(bob, MIN_DEPOSIT);
        assertGt(victimShares, 0, "victim must receive shares");

        // Victim redeems everything: must get their full deposit back
        // (within 2 base units of floor rounding on both legs).
        vm.prank(bob);
        uint256 victimOut = vault.redeem(victimShares, bob);
        assertGe(victimOut, MIN_DEPOSIT - 2, "victim must be made whole");
        assertLe(victimOut, MIN_DEPOSIT);

        // Attacker redeems everything: must get ~their deposit back, NOT
        // the 10_000 USDC donation (no profit from the attack).
        uint256 attackerShares = vault.balanceOf(alice);
        vm.prank(alice);
        uint256 attackerOut = vault.redeem(attackerShares, alice);
        assertGe(attackerOut, MIN_DEPOSIT - 2, "attacker must not profit from the donation");
        assertLe(attackerOut, MIN_DEPOSIT);

        // The donation is still in the contract as excess (owner-sweepable);
        // the ledger is back to ~zero (within rounding dust).
        assertGe(usdc.balanceOf(address(vault)), 10_000 * ONE_USDC);
        assertLe(vault.totalAssets(), 10);
    }

    function test_FirstDepositorTinyAttackFails() public {
        // Attacker deposits the minimum, donates 100x the victim's deposit.
        _deposit(alice, MIN_DEPOSIT);
        vm.prank(alice);
        usdc.transfer(address(vault), 100 * ONE_USDC);
        uint256 victimShares = _deposit(bob, 100 * ONE_USDC);
        assertGt(victimShares, 0);
        vm.prank(bob);
        uint256 victimOut = vault.redeem(victimShares, bob);
        assertGe(victimOut, 100 * ONE_USDC - 2);
    }

    // ---------- fee-on-transfer: deposit credits what ARRIVED ----------

    function test_FeeOnTransferDepositCreditsReceived() public {
        FeeTokenFixture feeToken = new FeeTokenFixture();
        feeToken.mint(alice, 1_000_000 * ONE_USDC);
        vm.prank(owner);
        address v = factory.createVault(
            owner, WATCHER, address(feeToken), "Fee Vault Share", "FEEVS", 0
        );
        ContagionVaultERC20 feeVault = ContagionVaultERC20(payable(v));

        // 10% fee: asking to deposit 100 tokens delivers only 90.
        vm.prank(alice);
        feeToken.approve(address(feeVault), 100 * ONE_USDC);
        vm.prank(alice);
        uint256 shares = feeVault.deposit(100 * ONE_USDC, alice);
        assertEq(feeVault.totalAssets(), 90 * ONE_USDC, "ledger credits received, not input");
        assertEq(feeToken.balanceOf(address(feeVault)), 90 * ONE_USDC);
        assertEq(shares, feeVault.previewDeposit(90 * ONE_USDC));
        // The depositor can redeem exactly what was credited.
        vm.prank(alice);
        uint256 out = feeVault.redeem(shares, alice);
        assertGe(out, 90 * ONE_USDC - 2);
        assertEq(feeVault.totalAssets(), 0);
    }

    // ---------- §3.1: reentrancy ----------

    function test_ReentrancyRedeemFails() public {
        ReentrantAssetFixture asset = new ReentrantAssetFixture();
        asset.mint(alice, 1_000_000 * ONE_USDC);
        vm.prank(owner);
        address v = factory.createVault(
            owner, WATCHER, address(asset), "Reentrant Vault Share", "REVS", 0
        );
        ContagionVaultERC20 rVault = ContagionVaultERC20(payable(v));

        ReentrancyAttackerERC20 attacker = new ReentrancyAttackerERC20(rVault, asset);
        asset.mint(address(attacker), 1_000_000 * ONE_USDC);
        asset.arm(address(rVault), address(attacker));

        vm.prank(address(attacker));
        asset.approve(address(rVault), 100 * ONE_USDC);
        vm.prank(address(attacker));
        rVault.deposit(100 * ONE_USDC, address(attacker));
        uint256 shares = rVault.balanceOf(address(attacker));
        assertGt(shares, 0);

        uint256 vaultBalBefore = asset.balanceOf(address(rVault));
        attacker.attackRedeem(shares);
        // The reentrant call was blocked: the attacker withdrew exactly once.
        assertEq(attacker.reentered(), 0);
        assertEq(vaultBalBefore - asset.balanceOf(address(rVault)), 100 * ONE_USDC);
        assertEq(rVault.balanceOf(address(attacker)), 0);
    }

    // ---------- sweepExcess / coverDebt (guarded) ----------

    function test_SweepExcessOnlyExcess() public {
        _deposit(alice, 100 * ONE_USDC);
        // Donate 50 USDC directly + fund 0.5 ETH fee funding.
        vm.prank(bob);
        usdc.transfer(address(vault), 50 * ONE_USDC);
        vm.deal(bob, 10 ether);
        vm.prank(bob);
        (bool ok,) = payable(address(vault)).call{value: 0.5 ether}("");
        assertTrue(ok);

        uint256 ownerUsdcBefore = usdc.balanceOf(owner);
        uint256 ownerEthBefore = owner.balance;
        vm.prank(owner);
        vault.sweepExcess();
        assertEq(usdc.balanceOf(owner) - ownerUsdcBefore, 50 * ONE_USDC);
        assertEq(owner.balance - ownerEthBefore, 0.5 ether);
        assertEq(vault.totalAssets(), 100 * ONE_USDC); // ledger untouched
        assertEq(usdc.balanceOf(address(vault)), 100 * ONE_USDC);
        assertEq(address(vault).balance, 0);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ContagionVaultERC20.NoExcess.selector));
        vault.sweepExcess();
    }

    function test_SweepExcessNeverBelowLedger() public {
        _deposit(alice, 100 * ONE_USDC);
        // No donation, no ETH: nothing to sweep.
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ContagionVaultERC20.NoExcess.selector));
        vault.sweepExcess();
        // Even after a partial withdrawal the ledger is the floor.
        vm.prank(alice);
        vault.withdraw(40 * ONE_USDC, alice);
        vm.prank(bob);
        usdc.transfer(address(vault), 10 * ONE_USDC);
        vm.prank(owner);
        vault.sweepExcess();
        assertEq(usdc.balanceOf(address(vault)), 60 * ONE_USDC);
        assertEq(vault.totalAssets(), 60 * ONE_USDC);
    }

    function test_SweepExcessNonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice)
        );
        vault.sweepExcess();
    }

    function test_CoverDebtNeverTouchesUserAsset() public {
        _deposit(alice, 100 * ONE_USDC);
        // Fund 0.1 ETH fee funding above the (USDC) ledger.
        vm.deal(bob, 10 ether);
        vm.prank(bob);
        (bool ok,) = payable(address(vault)).call{value: 0.1 ether}("");
        assertTrue(ok);
        // Debt (1 ETH) exceeds the ETH balance (0.1 ETH).
        _setDebt(1 ether);

        vault.coverDebt();
        // Only the ETH balance was paid; user USDC untouched.
        assertEq(address(vault).balance, 0);
        assertEq(usdc.balanceOf(address(vault)), 100 * ONE_USDC);
        assertEq(vault.totalAssets(), 100 * ONE_USDC);
        assertEq(address(PROXY).balance, 0.1 ether);

        // Top up ETH past the remaining debt, then cover the rest.
        _setDebt(0.9 ether); // proxy bookkeeping: 0.1 paid
        vm.prank(bob);
        (ok,) = payable(address(vault)).call{value: 1 ether}("");
        assertTrue(ok);
        vault.coverDebt();
        // Proxy received 0.1 + 0.9 = 1 ether total; vault keeps 0.1 ETH.
        assertEq(address(PROXY).balance, 1 ether);
        assertEq(address(vault).balance, 0.1 ether);
        assertEq(usdc.balanceOf(address(vault)), 100 * ONE_USDC);
        assertEq(vault.totalAssets(), 100 * ONE_USDC);
    }

    function test_CoverDebtZeroDebtPaysNothing() public {
        _deposit(alice, 100 * ONE_USDC);
        vm.deal(bob, 10 ether);
        vm.prank(bob);
        (bool ok,) = payable(address(vault)).call{value: 0.1 ether}("");
        assertTrue(ok);
        vault.coverDebt();
        assertEq(address(vault).balance, 0.1 ether);
        assertEq(usdc.balanceOf(address(vault)), 100 * ONE_USDC);
    }

    // ---------- pause / unpause (inherited) ----------

    function test_PauseViaProxyIdempotent() public {
        _pauseViaProxy();
        assertTrue(vault.paused());
        _pauseViaProxy(); // second pause is a no-op, not a revert
        assertTrue(vault.paused());
    }

    function test_PauseWrongWatcherReverts() public {
        vm.expectRevert("local proxy: callback call failed");
        LocalCallbackProxy(payable(address(PROXY))).executeCallback(
            address(vault), abi.encodeWithSelector(SiblingVault.pause.selector, address(0)), address(0xCAFE)
        );
    }

    function test_EmergencyPauseOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice)
        );
        vault.emergencyPause("TEST");
    }

    // ---------- fuzz: ledger invariant (§5.3 #1, #2) ----------

    function testFuzz_TotalAssetsLedger(uint256 d1, uint256 d2, uint256 w1) public {
        d1 = bound(d1, MIN_DEPOSIT, 10_000 * ONE_USDC);
        d2 = bound(d2, MIN_DEPOSIT, 10_000 * ONE_USDC);
        w1 = bound(w1, 0, d1 / 2);

        _deposit(alice, d1);
        _deposit(bob, d2);
        uint256 withdrawn;
        if (w1 > 0) {
            vm.prank(alice);
            vault.withdraw(w1, alice);
            withdrawn = w1;
        }
        assertEq(vault.totalAssets(), d1 + d2 - withdrawn);
        assertGe(usdc.balanceOf(address(vault)), vault.totalAssets());
    }

    function testFuzz_ConvertRoundTrip(uint256 amount) public {
        amount = bound(amount, MIN_DEPOSIT, 10_000 * ONE_USDC);
        _deposit(alice, amount);
        uint256 shares = vault.previewDeposit(amount);
        uint256 back = vault.convertToAssets(shares);
        // Round-trip within 10 base units (floor rounding on both legs).
        assertLe(back > amount ? back - amount : amount - back, 10);
    }

    function testFuzz_DepositWithdrawRoundTrip(uint256 amount) public {
        amount = bound(amount, MIN_DEPOSIT, 10_000 * ONE_USDC);
        _deposit(alice, amount);
        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        uint256 out = vault.redeem(shares, alice);
        assertGe(out, amount - 2);
        assertLe(out, amount);
        // Rounding dust (<= 2 base units) may stay in the ledger.
        assertLe(vault.totalAssets(), 2);
    }
}

/// @notice Helper: tries to re-enter `redeem` from inside the asset payout.
contract ReentrancyAttackerERC20 {
    ContagionVaultERC20 public vault;
    ReentrantAssetFixture public asset;
    uint256 public reentered;

    constructor(ContagionVaultERC20 v, ReentrantAssetFixture a) {
        vault = v;
        asset = a;
    }

    /// @notice Called by the asset fixture mid-transfer, before the payout lands.
    function onAssetReceived() external {
        try vault.redeem(vault.balanceOf(address(this)), address(this)) {
            reentered++;
        } catch {}
    }

    function attackRedeem(uint256 shares) external {
        vault.redeem(shares, address(this));
    }
}
