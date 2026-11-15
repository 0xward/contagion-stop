// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {AbstractPayer} from "@reactive/src/base/AbstractPayer.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SiblingVault} from "../src/SiblingVault.sol";
import {LocalCallbackProxy} from "./fixtures/LocalCallbackProxy.sol";

/// @notice Unit tests for SiblingVault. The Base Sepolia callback proxy is
/// simulated by etching LocalCallbackProxy at the real proxy address, so
/// `pause()` goes through the real `onlyServiceProvider` guard.
contract SiblingVaultTest is Test {
    IPayable public constant PROXY = IPayable(payable(0x476F44b11F5C942c58f4c8E3d0300E5710743585));

    address public owner = makeAddr("owner");
    address public watcher = makeAddr("watcher");
    address public stranger = makeAddr("stranger");
    bytes32 public constant REASON = bytes32("INCIDENT-1");

    SiblingVault public vault;

    function setUp() public {
        vm.etch(address(PROXY), address(new LocalCallbackProxy()).code);
        vault = new SiblingVault(PROXY, owner, watcher);
        vm.deal(owner, 10 ether);
        vm.deal(stranger, 10 ether);
        // Fee funding (plain transfer -> receive(), does NOT count as deposit).
        vm.deal(address(this), 10 ether);
        (bool ok,) = payable(address(vault)).call{value: 0.5 ether}("");
        require(ok, "funding failed");
    }

    // -- helpers -------------------------------------------------------------

    function _pauseViaProxy(address watcher_) internal {
        LocalCallbackProxy(payable(address(PROXY)))
            .executeCallback(address(vault), abi.encodeWithSignature("pause(address)", address(0)), watcher_);
    }

    // -- deposit / withdraw ---------------------------------------------------

    function testDepositWhenActiveOk() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true, address(vault));
        emit SiblingVault.Deposited(owner, 1 ether);
        vault.deposit{value: 1 ether}();
        assertEq(vault.totalDeposited(), 1 ether);
        assertEq(address(vault).balance, 1.5 ether); // 1 deposit + 0.5 fee funding
    }

    function testDepositWhenPausedReverts() public {
        vm.prank(owner);
        vault.deposit{value: 1 ether}();
        vm.prank(owner);
        vault.emergencyPause(REASON);
        vm.prank(owner);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.deposit{value: 1 ether}();
    }

    function testWithdrawOnlyOwner() public {
        vm.prank(owner);
        vault.deposit{value: 1 ether}();
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.withdraw(0.5 ether);
    }

    function testWithdrawHappyPath() public {
        vm.prank(owner);
        vault.deposit{value: 1 ether}();
        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        vm.expectEmit(true, false, false, true, address(vault));
        emit SiblingVault.Withdrawn(owner, 0.4 ether);
        vault.withdraw(0.4 ether);
        assertEq(owner.balance, ownerBefore + 0.4 ether);
        assertEq(vault.totalDeposited(), 0.6 ether);
    }

    function testWithdrawMoreThanBalanceReverts() public {
        vm.prank(owner);
        vault.deposit{value: 1 ether}();
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SiblingVault.InsufficientBalance.selector, 2 ether, 1.5 ether));
        vault.withdraw(2 ether);
    }

    function testPlainTransferIsFeeFundingNotDeposit() public {
        // setUp already sent 0.5 ether via plain transfer.
        assertEq(vault.totalDeposited(), 0);
        assertEq(address(vault).balance, 0.5 ether);
    }

    // -- emergencyPause ---------------------------------------------------------

    function testEmergencyPauseByOwnerEmitsAndPauses() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true, address(vault));
        emit SiblingVault.EmergencyPaused(address(vault), REASON);
        vault.emergencyPause(REASON);
        assertTrue(vault.paused());
    }

    function testEmergencyPauseOnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.emergencyPause(REASON);
    }

    function testEmergencyPauseWhenAlreadyPausedReEmits() public {
        vm.prank(owner);
        vault.emergencyPause(REASON);
        assertTrue(vault.paused());
        // Second call must NOT revert (no whenNotPaused guard) and must
        // re-emit EmergencyPaused — this is the re-trip / retry signal.
        vm.prank(owner);
        vm.expectEmit(true, false, false, true, address(vault));
        emit SiblingVault.EmergencyPaused(address(vault), bytes32("INCIDENT-2"));
        vault.emergencyPause(bytes32("INCIDENT-2"));
        assertTrue(vault.paused());
    }

    // -- pause() via callback ---------------------------------------------------

    function testPauseDirectCallReverts() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, owner, address(PROXY)));
        vault.pause(watcher);
    }

    function testPauseViaProxyWithCorrectWatcherOk() public {
        _pauseViaProxy(watcher);
        assertTrue(vault.paused());
    }

    function testPauseViaProxyWithWrongWatcherReverts() public {
        vm.expectRevert("local proxy: callback call failed");
        _pauseViaProxy(stranger);
        assertFalse(vault.paused());
    }

    function testPauseViaProxyWhenWatcherUnsetReverts() public {
        SiblingVault unset = new SiblingVault(PROXY, owner, address(0));
        // Swap the vault under test to the unset one via a fresh proxy call.
        vm.expectRevert("local proxy: callback call failed");
        LocalCallbackProxy(payable(address(PROXY)))
            .executeCallback(address(unset), abi.encodeWithSignature("pause(address)", address(0)), watcher);
    }

    function testPauseViaProxyIsIdempotent() public {
        _pauseViaProxy(watcher);
        assertTrue(vault.paused());
        // Retried callback on an already-paused vault succeeds (no revert).
        _pauseViaProxy(watcher);
        assertTrue(vault.paused());
    }

    // -- unpause ---------------------------------------------------------------

    function testUnpauseOnlyOwner() public {
        _pauseViaProxy(watcher);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.unpause();
        vm.prank(owner);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function testDepositAfterUnpauseOk() public {
        _pauseViaProxy(watcher);
        vm.prank(owner);
        vault.unpause();
        vm.prank(owner);
        vault.deposit{value: 0.25 ether}();
        assertEq(vault.totalDeposited(), 0.25 ether);
    }

    // -- watcher wiring & debt ---------------------------------------------------

    function testSetWatcherOnlyOwner() public {
        address newWatcher = makeAddr("newWatcher");
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.setWatcher(newWatcher);

        vm.prank(owner);
        vault.setWatcher(newWatcher);
        assertEq(vault.watcher(), newWatcher);

        // Old watcher can no longer pause; new one can.
        vm.expectRevert("local proxy: callback call failed");
        _pauseViaProxy(watcher);
        _pauseViaProxy(newWatcher);
        assertTrue(vault.paused());
    }

    function testSetWatcherZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(SiblingVault.ZeroAddress.selector);
        vault.setWatcher(address(0));
    }

    function testCoverDebtIsPublic() public {
        LocalCallbackProxy(payable(address(PROXY))).setDebt(address(vault), 0.01 ether);
        uint256 vaultBalBefore = address(vault).balance;
        uint256 proxyBalBefore = address(PROXY).balance;
        vm.prank(stranger);
        vault.coverDebt();
        assertEq(address(vault).balance, vaultBalBefore - 0.01 ether);
        assertEq(address(PROXY).balance, proxyBalBefore + 0.01 ether);
    }
}
