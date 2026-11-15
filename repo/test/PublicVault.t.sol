// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test, console} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";
import {ContagionWatcher} from "../src/ContagionWatcher.sol";
import {SiblingVault} from "../src/SiblingVault.sol";
import {PublicVault} from "../src/PublicVault.sol";
import {LocalSystemContract} from "./fixtures/LocalSystemContract.sol";
import {LocalCallbackProxy} from "./fixtures/LocalCallbackProxy.sol";

/// @notice Tests for the PublicVault public set: permissionless trip/unpause
/// on a subclass of SiblingVault, the full watcher loop driven by a public
/// trip, and the self-healing property (no permissionless clearIncident
/// needed). Same local setup as ContagionIntegrationTest: the system
/// contract and both callback proxies are etched stand-ins, no real chain.
contract PublicVaultTest is Test {
    address public constant SYSTEM = 0x8888888888888888888888888888888888888888;
    IPayable public constant BASE_PROXY = IPayable(payable(0x476F44b11F5C942c58f4c8E3d0300E5710743585));
    IPayable public constant UNI_PROXY = IPayable(payable(0x775c9B990ADe401060B78D0e98684eEf8d2466C1));

    uint256 public constant UNI = 1301;
    uint256 public constant BASE = 84532;
    bytes32 public constant REASON = bytes32("TEST-1");
    bytes32 public constant REASON_2 = bytes32("TEST-2");

    address public owner = makeAddr("owner");
    address public stranger = makeAddr("stranger");

    PublicVault public originUni;
    PublicVault public siblingBase;
    PublicVault public siblingUni2;
    ContagionWatcher public watcher;
    LocalSystemContract public system;

    function setUp() public {
        vm.etch(SYSTEM, address(new LocalSystemContract()).code);
        system = LocalSystemContract(payable(SYSTEM));
        address proxyCode = address(new LocalCallbackProxy());
        vm.etch(address(BASE_PROXY), proxyCode.code);
        vm.etch(address(UNI_PROXY), proxyCode.code);

        // Public vaults deploy before the watcher exists (watcher = address(0)).
        originUni = new PublicVault(UNI_PROXY, owner, address(0));
        siblingBase = new PublicVault(BASE_PROXY, owner, address(0));
        siblingUni2 = new PublicVault(UNI_PROXY, owner, address(0));

        uint256[] memory chainIds = new uint256[](3);
        chainIds[0] = UNI;
        chainIds[1] = BASE;
        chainIds[2] = UNI;
        address[] memory siblings = new address[](3);
        siblings[0] = address(originUni);
        siblings[1] = address(siblingBase);
        siblings[2] = address(siblingUni2);
        watcher = new ContagionWatcher{value: 0.5 ether}(chainIds, siblings);

        vm.startPrank(owner);
        originUni.setWatcher(address(watcher));
        siblingBase.setWatcher(address(watcher));
        siblingUni2.setWatcher(address(watcher));
        vm.stopPrank();

        vm.deal(owner, 10 ether);
        vm.deal(stranger, 10 ether);
    }

    // -- helpers (same pattern as ContagionIntegrationTest) ------------------

    function _log(
        uint256 topic0,
        uint256 topic1,
        bytes memory data,
        uint256 opCode,
        address contractAddr,
        uint256 chainId
    ) internal pure returns (IReactive.LogRecord memory) {
        return IReactive.LogRecord({
            chainId: chainId,
            contractAddress: contractAddr,
            topic0: topic0,
            topic1: topic1,
            topic2: 0,
            topic3: 0,
            data: data,
            blockNumber: 1,
            opCode: opCode,
            blockHash: 0,
            txHash: 0,
            logIndex: 0
        });
    }

    function _reactAsSystem(IReactive.LogRecord memory log_) internal {
        vm.prank(SYSTEM);
        watcher.react(log_);
    }

    function _executeCallback(uint256 i) internal {
        (uint256 chainId, address recipient,, bytes memory payload) = system.callbackRequests(i);
        address proxy = chainId == BASE ? address(BASE_PROXY) : address(UNI_PROXY);
        LocalCallbackProxy(payable(proxy)).executeCallback(recipient, payload, address(watcher));
    }

    /// @notice Feed the watcher's react() with the EmergencyPaused log a
    /// public trip on `vault` would produce on its chain.
    function _feedTrip(PublicVault vault, uint256 chainId, bytes32 reason) internal {
        _reactAsSystem(
            _log(
                ContagionTopics.EMERGENCY_PAUSED_TOPIC,
                uint256(uint160(address(vault))),
                abi.encode(reason),
                2,
                address(vault),
                chainId
            )
        );
    }

    function _confirmPaused(PublicVault vault, uint256 chainId) internal {
        _reactAsSystem(_log(ContagionTopics.PAUSED_TOPIC, 0, abi.encode(address(vault)), 1, address(vault), chainId));
    }

    function _executeAllCallbacks() internal {
        uint256 n = system.callbackRequestCount();
        for (uint256 i = 0; i < n; i++) {
            _executeCallback(i);
        }
    }

    // -- trip / reopen unit behaviour --------------------------------

    function testTripFromNonOwnerPausesAndEmits() public {
        assertFalse(originUni.paused());
        vm.prank(stranger);
        vm.expectEmit(true, false, false, true, address(originUni));
        emit SiblingVault.EmergencyPaused(address(originUni), REASON);
        originUni.trip(REASON);
        assertTrue(originUni.paused());
    }

    function testTripWhenAlreadyPausedReEmits() public {
        vm.prank(stranger);
        originUni.trip(REASON);
        assertTrue(originUni.paused());
        // No whenNotPaused guard, mirroring emergencyPause: re-trip must
        // still re-emit (retry signal for the watcher). F4 cooldown: the
        // re-trip is 61 s later, past the 60 s cooldown.
        vm.warp(block.timestamp + 61);
        vm.prank(stranger);
        vm.expectEmit(true, false, false, true, address(originUni));
        emit SiblingVault.EmergencyPaused(address(originUni), REASON_2);
        originUni.trip(REASON_2);
        assertTrue(originUni.paused());
    }

    // -- F4: trip cooldown ------------------------------------------------

    function testTripCooldownBlocksSecondTripWithin60s() public {
        vm.prank(stranger);
        originUni.trip(REASON);
        assertEq(originUni.lastTripAt(), block.timestamp);
        // Second trip in the same second reverts with the next-allowed time.
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(PublicVault.TripCooldown.selector, block.timestamp + 60));
        originUni.trip(REASON_2);
        assertTrue(originUni.paused());
        // At exactly +60 s the trip works again and refreshes the cooldown.
        vm.warp(block.timestamp + 60);
        vm.prank(stranger);
        originUni.trip(REASON_2);
        assertEq(originUni.lastTripAt(), block.timestamp);
    }

    function testTripCooldownIsPerVault() public {
        vm.prank(stranger);
        originUni.trip(REASON);
        // A different vault trips immediately: its own cooldown is untouched.
        vm.prank(stranger);
        siblingBase.trip(REASON);
        assertTrue(siblingBase.paused());
        assertEq(siblingBase.lastTripAt(), block.timestamp);
    }

    function testReopenDoesNotResetTripCooldown() public {
        vm.prank(stranger);
        originUni.trip(REASON);
        vm.prank(stranger);
        originUni.reopen();
        assertFalse(originUni.paused());
        // Reopening is not a new trip window: the cooldown still applies.
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(PublicVault.TripCooldown.selector, block.timestamp + 60));
        originUni.trip(REASON_2);
    }

    function testReopenFromNonOwnerReopens() public {
        vm.prank(stranger);
        originUni.trip(REASON);
        assertTrue(originUni.paused());
        vm.prank(stranger);
        originUni.reopen();
        assertFalse(originUni.paused());
    }

    function testReopenWhenActiveReverts() public {
        assertFalse(originUni.paused());
        vm.prank(stranger);
        vm.expectRevert(Pausable.ExpectedPause.selector);
        originUni.reopen();
    }

    function testPublicVaultOwnerFunctionsStillOwnerOnly() public {
        // The public gate is open ONLY for trip/reopen. The inherited
        // owner-only functions keep their access control.
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        originUni.emergencyPause(REASON);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        originUni.unpause();
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        originUni.setWatcher(address(watcher));
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        originUni.withdraw(0.1 ether);
    }

    // -- regression: main SiblingVault stays owner-only -----------------------
    // (testEmergencyPauseOnlyOwner / testUnpauseOnlyOwner already cover this
    // in SiblingVault.t.sol; this pins the same property again from the
    // public-set side so a future refactor cannot silently open the main set.)

    function testRegressionMainVaultEmergencyPauseAndUnpauseStillOwnerOnly() public {
        SiblingVault main = new SiblingVault(BASE_PROXY, owner, address(watcher));
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        main.emergencyPause(REASON);
        vm.prank(owner);
        main.emergencyPause(REASON);
        assertTrue(main.paused());
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        main.unpause();
        assertTrue(main.paused());
    }

    // -- full loop driven by a permissionless public trip ------------------------

    function testTripDrivesFullLoopAndReopenReopensAll() public {
        vm.prank(stranger);
        siblingBase.deposit{value: 1 ether}();
        vm.prank(stranger);
        siblingUni2.deposit{value: 1 ether}();
        assertFalse(siblingBase.paused());
        assertFalse(siblingUni2.paused());

        // A stranger (not the owner) trips the origin.
        vm.prank(stranger);
        originUni.trip(REASON);
        assertTrue(originUni.paused());
        _feedTrip(originUni, UNI, REASON);

        // Fan-out: 2 callbacks, neither to the origin.
        assertEq(system.callbackRequestCount(), 2);
        _executeAllCallbacks();
        assertTrue(siblingBase.paused());
        assertTrue(siblingUni2.paused());

        _confirmPaused(siblingBase, BASE);
        _confirmPaused(siblingUni2, UNI);
        assertTrue(watcher.isPaused(BASE, address(siblingBase)));
        assertTrue(watcher.isPaused(UNI, address(siblingUni2)));

        // Deposits into the frozen siblings revert.
        vm.prank(stranger);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        siblingBase.deposit{value: 0.1 ether}();
        vm.prank(stranger);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        siblingUni2.deposit{value: 0.1 ether}();

        // Incident contained (both siblings confirmed).
        (,, bool active) = watcher.incident(address(originUni));
        assertFalse(active);

        // Anyone may unpause every public vault; deposits work again.
        vm.prank(stranger);
        originUni.reopen();
        vm.prank(stranger);
        siblingBase.reopen();
        vm.prank(stranger);
        siblingUni2.reopen();
        assertFalse(originUni.paused());
        assertFalse(siblingBase.paused());
        assertFalse(siblingUni2.paused());

        vm.prank(stranger);
        siblingBase.deposit{value: 0.1 ether}();
        assertEq(siblingBase.totalDeposited(), 1.1 ether);
        vm.prank(stranger);
        siblingUni2.deposit{value: 0.1 ether}();
        assertEq(siblingUni2.totalDeposited(), 1.1 ether);
    }

    // -- self-healing: unpause-all before containment, then re-trip -----------

    function testSelfHealingUnpauseAllThenReTripContainsWithoutClearIncident() public {
        // Round 1: stranger trips; callbacks pause both siblings.
        vm.prank(stranger);
        originUni.trip(REASON);
        _feedTrip(originUni, UNI, REASON);
        assertEq(system.callbackRequestCount(), 2);
        _executeAllCallbacks();
        assertTrue(siblingBase.paused());
        assertTrue(siblingUni2.paused());

        // NO Paused confirmations are fed yet, so the incident is still
        // active (not contained). A stranger unpauses ALL public vaults.
        (,, bool activeBefore) = watcher.incident(address(originUni));
        assertTrue(activeBefore);
        vm.prank(stranger);
        originUni.reopen();
        vm.prank(stranger);
        siblingBase.reopen();
        vm.prank(stranger);
        siblingUni2.reopen();
        assertFalse(originUni.paused());
        assertFalse(siblingBase.paused());
        assertFalse(siblingUni2.paused());

        // Round 2: re-trip WITHOUT any clearIncident call. The watcher
        // treats this as a RETRY of the still-active incident and only
        // re-requests callbacks to siblings that have NOT confirmed.
        // F4 cooldown: the re-trip is 61 s later, past the 60 s cooldown.
        vm.warp(block.timestamp + 61);
        vm.recordLogs();
        vm.prank(stranger);
        originUni.trip(REASON_2);
        assertTrue(originUni.paused());
        _feedTrip(originUni, UNI, REASON_2);
        // Retry fan-out: 2 fresh callbacks (both siblings unconfirmed).
        assertEq(system.callbackRequestCount(), 4);
        _executeCallback(2);
        _executeCallback(3);
        assertTrue(siblingBase.paused());
        assertTrue(siblingUni2.paused());

        // Confirmations close the round: the incident becomes CONTAINED
        // even though clearIncident was never called.
        _confirmPaused(siblingBase, BASE);
        _confirmPaused(siblingUni2, UNI);
        (,, bool activeAfter) = watcher.incident(address(originUni));
        assertFalse(activeAfter);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertTrue(_containsIncidentContained(logs, address(originUni)), "IncidentContained not emitted");
    }

    function _containsIncidentContained(Vm.Log[] memory logs, address origin) internal pure returns (bool) {
        bytes32 topic0 = keccak256("IncidentContained(address)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length >= 2 && logs[i].topics[0] == topic0) {
                if (address(uint160(uint256(logs[i].topics[1]))) == origin) return true;
            }
        }
        return false;
    }

    // -- gas --------------------------------------------------------------------

    function testGasTripReopen() public {
        uint256 g = gasleft();
        vm.prank(stranger);
        originUni.trip(REASON);
        uint256 tripGas = g - gasleft();
        console.log("trip (cold, first pause + emit):", tripGas);

        vm.warp(block.timestamp + 61); // F4 cooldown: re-trip past 60 s
        g = gasleft();
        vm.prank(stranger);
        originUni.trip(REASON_2);
        uint256 retripGas = g - gasleft();
        console.log("trip (re-trip, already paused):", retripGas);

        g = gasleft();
        vm.prank(stranger);
        originUni.reopen();
        uint256 unpauseGas = g - gasleft();
        console.log("reopen:", unpauseGas);

        assertLt(tripGas, 100_000, "trip must be cheap");
        assertLt(retripGas, 100_000, "re-trip must be cheap");
        assertLt(unpauseGas, 100_000, "reopen must be cheap");
    }
}
