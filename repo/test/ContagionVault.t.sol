// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test, console} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {ContagionVault} from "../src/ContagionVault.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {SiblingVault} from "../src/SiblingVault.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {LocalCallbackProxy} from "./fixtures/LocalCallbackProxy.sol";

/// @title ContagionVault unit tests — v2 share accounting + §3 security properties
/// @notice Tests run against a factory-created clone (the real deployment
/// path), not against the implementation directly.
contract ContagionVaultTest is Test {
    // Real Base Sepolia callback proxy address (local stand-in etched there, same
    // pattern as SiblingVault.t.sol).
    IPayable internal constant PROXY = IPayable(payable(0x476F44b11F5C942c58f4c8E3d0300E5710743585));
    address internal constant WATCHER = address(0xBEEF);
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

    uint256 internal constant SEED = 0.001 ether;
    uint256 internal constant MIN_DEPOSIT = 0.001 ether;

    VaultFactory internal factory;
    ContagionVault internal implementation;
    ContagionVault internal vault;
    LocalCallbackProxy internal proxy;

    address internal owner;
    address internal alice;
    address internal bob;

    function setUp() public {
        owner = makeAddr("owner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        vm.deal(owner, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);

        proxy = new LocalCallbackProxy();
        vm.etch(address(PROXY), address(proxy).code);

        implementation = new ContagionVault(PROXY);
        factory = new VaultFactory(address(implementation));

        vm.prank(owner);
        address v = factory.createVault{value: SEED}(
            owner, WATCHER, "ContagionStop Vault Share", "CSV", MIN_DEPOSIT
        );
        vault = ContagionVault(payable(v));
    }

    // ---------- helpers ----------

    /// @notice Pause the vault through the local proxy, as the watcher would.
    /// @dev The local proxy must be called AT the proxy address (the etched copy),
    /// so the vault sees msg.sender == the real proxy (`onlyServiceProvider`).
    function _pauseViaProxy() internal {
        LocalCallbackProxy(payable(address(PROXY))).executeCallback(
            address(vault), abi.encodeWithSelector(SiblingVault.pause.selector, address(0)), WATCHER
        );
    }

    /// @notice Set the local proxy's debt bookkeeping for this vault.
    function _setDebt(uint256 amount) internal {
        LocalCallbackProxy(payable(address(PROXY))).setDebt(address(vault), amount);
    }

    function _deposit(address who, uint256 amount) internal returns (uint256 shares) {
        // Read the balance BEFORE pranking: vm.prank is consumed by the
        // next call, and a view call would eat it.
        uint256 before = vault.balanceOf(who);
        vm.prank(who);
        vault.deposit{value: amount}();
        return vault.balanceOf(who) - before;
    }

    // ---------- initialize / factory path ----------

    function test_InitializeSetsFields() public view {
        assertEq(vault.name(), "ContagionStop Vault Share");
        assertEq(vault.symbol(), "CSV");
        assertEq(vault.decimals(), 18);
        assertEq(vault.minDeposit(), MIN_DEPOSIT);
        assertEq(vault.owner(), owner);
        assertEq(vault.watcher(), WATCHER);
        assertEq(vault.totalAssets(), SEED);
        // Seed: SEED * 1e6 shares locked at the dead address.
        assertEq(vault.balanceOf(DEAD), SEED * 1_000_000);
        assertEq(vault.totalSupply(), SEED * 1_000_000);
        assertEq(address(vault).balance, SEED);
        assertFalse(vault.paused());
    }

    function test_InitializeTwiceReverts() public {
        vm.expectRevert(abi.encodeWithSignature("InvalidInitialization()"));
        vault.initialize(owner, WATCHER, "X", "X", MIN_DEPOSIT);
    }

    function test_ImplementationLocked() public {
        vm.expectRevert(abi.encodeWithSignature("InvalidInitialization()"));
        implementation.initialize(owner, WATCHER, "X", "X", MIN_DEPOSIT);
        // The implementation's owner is renounced: no owner function works.
        assertEq(implementation.owner(), address(0));
        assertEq(implementation.watcher(), address(0));
    }

    // ---------- deposit ----------

    function test_DepositMintsShares() public {
        uint256 preview = vault.previewDeposit(1 ether);
        uint256 shares = _deposit(alice, 1 ether);
        assertEq(shares, preview);
        assertEq(vault.balanceOf(alice), preview);
        assertEq(vault.totalAssets(), SEED + 1 ether);
        assertEq(address(vault).balance, SEED + 1 ether);
    }

    function test_DepositBelowMinReverts() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(ContagionVault.BelowMinDeposit.selector, 0.0005 ether, MIN_DEPOSIT)
        );
        vault.deposit{value: 0.0005 ether}();
    }

    function test_DepositWhenPausedReverts() public {
        _deposit(alice, 1 ether);
        _pauseViaProxy();
        assertTrue(vault.paused());
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        vault.deposit{value: 1 ether}();
    }

    // ---------- withdraw / redeem (open while paused) ----------

    function test_WithdrawWorksWhenPaused() public {
        _deposit(alice, 1 ether);
        _pauseViaProxy();
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        uint256 shares = vault.withdraw(0.5 ether, alice);
        assertGt(shares, 0);
        assertEq(alice.balance - balBefore, 0.5 ether);
        assertEq(vault.totalAssets(), SEED + 0.5 ether);
    }

    function test_RedeemWorksWhenPaused() public {
        uint256 preview = vault.previewRedeem(vault.previewDeposit(1 ether));
        uint256 shares = _deposit(alice, 1 ether);
        _pauseViaProxy();
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        uint256 assets = vault.redeem(shares, alice);
        // Floor rounding on both legs: within 2 wei of the deposit.
        assertGe(assets, 1 ether - 2);
        assertLe(assets, 1 ether);
        assertGe(preview, 1 ether - 2);
        assertEq(alice.balance - balBefore, assets);
        assertLe(vault.totalAssets() - SEED, 2);
        assertEq(vault.balanceOf(alice), 0);
    }

    function test_WithdrawOverShareValueReverts() public {
        _deposit(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert();
        vault.withdraw(2 ether, alice);
    }

    function test_WithdrawZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ContagionVault.ZeroAssets.selector));
        vault.withdraw(0, alice);
    }

    function test_RedeemZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ContagionVault.ZeroShares.selector));
        vault.redeem(0, alice);
    }

    function test_WithdrawToZeroAddressReverts() public {
        _deposit(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        vault.withdraw(0.5 ether, address(0));
    }

    function test_OldWithdrawReverts() public {
        _deposit(alice, 1 ether);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ContagionVault.WithdrawV1Removed.selector));
        vault.withdraw(0.5 ether);
    }

    function test_PreviewConsistency() public {
        uint256 preview = vault.previewDeposit(1 ether);
        uint256 shares = _deposit(alice, 1 ether);
        assertEq(shares, preview);
        // previewWithdraw: shares needed to take 0.5 ETH out.
        uint256 need = vault.previewWithdraw(0.5 ether);
        vm.prank(alice);
        uint256 burned = vault.withdraw(0.5 ether, alice);
        assertEq(burned, need);
        // previewRedeem: assets for the remaining shares.
        uint256 rest = vault.balanceOf(alice);
        assertEq(vault.previewRedeem(rest), vault.convertToAssets(rest));
    }

    function test_ShareTransferWhilePaused() public {
        uint256 shares = _deposit(alice, 1 ether);
        _pauseViaProxy();
        vm.prank(alice);
        bool ok = vault.transfer(bob, shares / 2);
        assertTrue(ok);
        assertEq(vault.balanceOf(bob), shares / 2);
    }

    // ---------- §3.2: ledger vs balance (donations never inflate the price) ----------

    function test_DonationDoesNotChangeSharePrice() public {
        uint256 priceBefore = vault.previewDeposit(1 ether);
        // Donate 10 ETH directly (not through deposit()).
        vm.prank(bob);
        (bool ok,) = payable(address(vault)).call{value: 10 ether}("");
        assertTrue(ok);
        assertEq(vault.totalAssets(), SEED); // ledger unchanged
        assertEq(address(vault).balance, SEED + 10 ether);
        assertEq(vault.previewDeposit(1 ether), priceBefore); // price unchanged
    }

    // ---------- §3.3: first-depositor inflation attack ----------

    function test_FirstDepositorInflationAttackFails() public {
        // Attacker takes the first user deposit (minimum) then donates 10 ETH.
        _deposit(alice, MIN_DEPOSIT); // alice plays the attacker here
        vm.prank(alice);
        (bool ok,) = payable(address(vault)).call{value: 10 ether}("");
        assertTrue(ok);

        // Victim deposits the minimum afterwards.
        uint256 victimShares = _deposit(bob, MIN_DEPOSIT);
        assertGt(victimShares, 0, "victim must receive shares");

        // Victim redeems everything: must get their full deposit back
        // (within 2 wei of floor rounding on both legs).
        vm.prank(bob);
        uint256 victimOut = vault.redeem(victimShares, bob);
        assertGe(victimOut, MIN_DEPOSIT - 2, "victim must be made whole");
        assertLe(victimOut, MIN_DEPOSIT);

        // Attacker redeems everything: must get ~their deposit back, NOT
        // the 10 ETH donation (no profit from the attack).
        uint256 attackerShares = vault.balanceOf(alice);
        vm.prank(alice);
        uint256 attackerOut = vault.redeem(attackerShares, alice);
        assertGe(attackerOut, MIN_DEPOSIT - 2, "attacker must not profit from the donation");
        assertLe(attackerOut, MIN_DEPOSIT);

        // The donation is still in the contract as excess (owner-sweepable);
        // the ledger is back to just the seed (within rounding dust).
        assertGe(address(vault).balance, SEED + 10 ether);
        assertLe(vault.totalAssets() - SEED, 10);
    }

    // ---------- §3.1: reentrancy ----------

    function test_ReentrancyRedeemFails() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(vault);
        vm.deal(address(attacker), 10 ether);
        attacker.attackDeposit{value: 1 ether}();
        uint256 shares = vault.balanceOf(address(attacker));
        assertGt(shares, 0);

        uint256 vaultBalBefore = address(vault).balance;
        attacker.attackRedeem(shares);
        // The reentrant call was blocked: the attacker withdrew exactly once.
        assertEq(attacker.reentered(), 0);
        assertEq(vaultBalBefore - address(vault).balance, 1 ether);
        assertEq(vault.balanceOf(address(attacker)), 0);
    }

    // ---------- sweepExcess / coverDebt (guarded) ----------

    function test_SweepExcessOnlyExcess() public {
        _deposit(alice, 1 ether);
        vm.prank(bob);
        (bool ok,) = payable(address(vault)).call{value: 0.5 ether}("");
        assertTrue(ok);

        uint256 ownerBalBefore = owner.balance;
        vm.prank(owner);
        vault.sweepExcess();
        assertEq(owner.balance - ownerBalBefore, 0.5 ether);
        assertEq(vault.totalAssets(), SEED + 1 ether); // ledger untouched
        assertEq(address(vault).balance, SEED + 1 ether);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ContagionVault.NoExcess.selector));
        vault.sweepExcess();
    }

    function test_SweepExcessNonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice)
        );
        vault.sweepExcess();
    }

    function test_CoverDebtGuardedNeverTouchesUserFunds() public {
        _deposit(alice, 1 ether);
        // 0.1 ETH excess (fee funding) above the ledger.
        vm.prank(bob);
        (bool ok,) = payable(address(vault)).call{value: 0.1 ether}("");
        assertTrue(ok);
        // Debt (1 ETH) exceeds the excess (0.1 ETH).
        _setDebt(1 ether);

        vault.coverDebt();
        // Only the excess was paid; user funds untouched.
        assertEq(address(vault).balance, SEED + 1 ether);
        assertEq(vault.totalAssets(), SEED + 1 ether);
        assertEq(address(PROXY).balance, 0.1 ether);

        // Top up the excess past the debt, then cover the rest.
        _setDebt(0.9 ether); // proxy bookkeeping: 0.1 paid
        vm.prank(bob);
        (ok,) = payable(address(vault)).call{value: 1 ether}("");
        assertTrue(ok);
        vault.coverDebt();
        // Proxy received 0.1 + 0.9 = 1 ether total. The vault keeps the
        // leftover excess (1.0 - 0.9 = 0.1) above the ledger.
        assertEq(address(PROXY).balance, 1 ether);
        assertEq(address(vault).balance, SEED + 1 ether + 0.1 ether);
        assertEq(vault.totalAssets(), SEED + 1 ether);
    }

    function test_CoverDebtZeroDebtPaysNothing() public {
        _deposit(alice, 1 ether);
        uint256 balBefore = address(vault).balance;
        vault.coverDebt();
        assertEq(address(vault).balance, balBefore);
    }

    // ---------- pause / unpause (inherited) ----------

    function test_PauseViaProxyIdempotent() public {
        _pauseViaProxy();
        assertTrue(vault.paused());
        _pauseViaProxy(); // second pause is a no-op, not a revert
        assertTrue(vault.paused());
    }

    function test_PauseWrongWatcherReverts() public {
        // The local proxy wraps the vault's revert in its own require, so the
        // observed revert is the local proxy's string (same pattern as v1).
        vm.expectRevert("local proxy: callback call failed");
        // The local proxy rewrites the first arg to address(0xCAFE), which is not
        // this vault's watcher.
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
        d1 = bound(d1, MIN_DEPOSIT, 10 ether);
        d2 = bound(d2, MIN_DEPOSIT, 10 ether);
        w1 = bound(w1, 0, d1 / 2);

        _deposit(alice, d1);
        _deposit(bob, d2);
        uint256 withdrawn;
        if (w1 > 0) {
            vm.prank(alice);
            vault.withdraw(w1, alice);
            withdrawn = w1;
        }
        assertEq(vault.totalAssets(), SEED + d1 + d2 - withdrawn);
        assertGe(address(vault).balance, vault.totalAssets());
    }

    function testFuzz_ConvertRoundTrip(uint256 amount) public {
        amount = bound(amount, MIN_DEPOSIT, 10 ether);
        _deposit(alice, amount);
        uint256 shares = vault.previewDeposit(amount);
        uint256 back = vault.convertToAssets(shares);
        // Round-trip within 10 wei (floor rounding on both legs).
        assertLe(back > amount ? back - amount : amount - back, 10);
    }
}

/// @notice Helper: tries to re-enter `redeem` from the ETH payout.
contract ReentrancyAttacker {
    ContagionVault public vault;
    uint256 public reentered;

    constructor(ContagionVault v) {
        vault = v;
    }

    receive() external payable {
        try vault.redeem(vault.balanceOf(address(this)), address(this)) {
            reentered++;
        } catch {}
    }

    function attackDeposit() external payable {
        vault.deposit{value: msg.value}();
    }

    function attackRedeem(uint256 shares) external {
        vault.redeem(shares, address(this));
    }
}
