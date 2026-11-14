// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {AbstractPayer} from "@reactive/src/base/AbstractPayer.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";
import {ContagionWatcher} from "../src/ContagionWatcher.sol";
import {SiblingVault} from "../src/SiblingVault.sol";
import {MockSystemContract} from "./mocks/MockSystemContract.sol";

/// @notice Unit tests for ContagionWatcher. The Reactive system contract is
/// mocked by etching MockSystemContract at the real system address
/// (0x8888...8888), so constructor subscriptions and `requestCallbackV_1_0`
/// calls are recorded and assertable. `react()` is invoked via
/// `vm.prank(SYSTEM)` to satisfy `onlySystem` exactly like the real system
/// contract would.
contract ContagionWatcherTest is Test {
    address public constant SYSTEM = 0x8888888888888888888888888888888888888888;

    uint256 public constant UNI = 1301;
    uint256 public constant BASE = 84532;
    uint256 public constant START = 1_000_000;

    address public originUni = makeAddr("originUni");
    address public siblingBase = makeAddr("siblingBase");
    address public siblingUni2 = makeAddr("siblingUni2");
    address public stranger = makeAddr("stranger");

    bytes32 public constant REASON_A = bytes32("INCIDENT-A");
    bytes32 public constant REASON_B = bytes32("INCIDENT-B");

    ContagionWatcher public watcher;
    MockSystemContract public system;

    function setUp() public {
        vm.warp(START);
        vm.etch(SYSTEM, address(new MockSystemContract()).code);
        system = MockSystemContract(payable(SYSTEM));
        uint256[] memory chainIds = new uint256[](3);
        chainIds[0] = UNI;
        chainIds[1] = BASE;
        chainIds[2] = UNI;
        address[] memory siblings = new address[](3);
        siblings[0] = originUni;
        siblings[1] = siblingBase;
        siblings[2] = siblingUni2;
        watcher = new ContagionWatcher{value: 0.5 ether}(chainIds, siblings);
    }

    // -- helpers -------------------------------------------------------------

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

    function _emergencyLog(address origin, uint256 chainId, bytes32 reason)
        internal
        pure
        returns (IReactive.LogRecord memory)
    {
        return _log(
            ContagionTopics.EMERGENCY_PAUSED_TOPIC, uint256(uint160(origin)), abi.encode(reason), 2, origin, chainId
        );
    }

    function _pausedLog(address sibling, uint256 chainId) internal pure returns (IReactive.LogRecord memory) {
        // Faithful to OZ Pausable: Paused(address) has NO indexed param —
        // the account is the single non-indexed arg (data), LOG1, opCode 1.
        return _log(ContagionTopics.PAUSED_TOPIC, 0, abi.encode(sibling), 1, sibling, chainId);
    }

    function _reactAsSystem(IReactive.LogRecord memory log_) internal {
        vm.prank(SYSTEM);
        watcher.react(log_);
    }

    function _tripOrigin() internal {
        _reactAsSystem(_emergencyLog(originUni, UNI, REASON_A));
    }

    function _callbackAt(uint256 i)
        internal
        view
        returns (uint256 chainId, address recipient, uint64 gas, bytes memory payload)
    {
        return system.callbackRequests(i);
    }

    /// @notice How many callbacks were requested to one destination so far
    /// (proves per-destination retry: confirmed targets stay at 1).
    function _countCallbacksTo(address recipient_) internal view returns (uint256 count) {
        uint256 n = system.callbackRequestCount();
        for (uint256 i = 0; i < n; i++) {
            (, address r,,) = system.callbackRequests(i);
            if (r == recipient_) count++;
        }
    }

    // -- constructor / subscriptions -----------------------------------------

    function testConstructorSubscribesSix() public view {
        assertEq(system.subscriptionCount(), 6);
        (uint256 c0, address a0, uint256 t0,,,) = system.subscriptions(0);
        assertEq(c0, UNI);
        assertEq(a0, originUni);
        assertEq(t0, ContagionTopics.EMERGENCY_PAUSED_TOPIC);
        (uint256 c1, address a1, uint256 t1,,,) = system.subscriptions(1);
        assertEq(c1, UNI);
        assertEq(a1, originUni);
        assertEq(t1, ContagionTopics.PAUSED_TOPIC);
        (uint256 c2, address a2,,,,) = system.subscriptions(2);
        assertEq(c2, BASE);
        assertEq(a2, siblingBase);
        assertTrue(watcher.registeredSibling(UNI, originUni));
        assertTrue(watcher.registeredSibling(BASE, siblingBase));
        assertTrue(watcher.registeredSibling(UNI, siblingUni2));
        assertEq(watcher.siblings(UNI).length, 2);
        assertEq(watcher.siblings(BASE).length, 1);
    }

    function testConstructorRevertsOnLengthMismatch() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = UNI;
        address[] memory siblings = new address[](2);
        siblings[0] = originUni;
        siblings[1] = siblingBase;
        vm.expectRevert(ContagionWatcher.LengthMismatch.selector);
        new ContagionWatcher(chainIds, siblings);
    }

    function testConstructorRevertsOnEmpty() public {
        vm.expectRevert(ContagionWatcher.EmptySiblings.selector);
        new ContagionWatcher(new uint256[](0), new address[](0));
    }

    function testConstructorRevertsOnZeroAddress() public {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = UNI;
        address[] memory siblings = new address[](1);
        siblings[0] = address(0);
        vm.expectRevert(ContagionWatcher.ZeroAddress.selector);
        new ContagionWatcher(chainIds, siblings);
    }

    function testConstructorRevertsOnDuplicate() public {
        uint256[] memory chainIds = new uint256[](2);
        chainIds[0] = UNI;
        chainIds[1] = UNI;
        address[] memory siblings = new address[](2);
        siblings[0] = originUni;
        siblings[1] = originUni;
        vm.expectRevert(abi.encodeWithSelector(ContagionWatcher.AlreadyRegistered.selector, UNI, originUni));
        new ContagionWatcher(chainIds, siblings);
    }

    function testReactRevertsWhenNotSystem() public {
        vm.expectRevert(abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, address(this), SYSTEM));
        watcher.react(_emergencyLog(originUni, UNI, REASON_A));
    }

    // -- unknown / unregistered logs ------------------------------------------

    function testEmergencyPausedFromUnregisteredEmitterIgnored() public {
        _reactAsSystem(_emergencyLog(stranger, UNI, REASON_A));
        assertEq(system.callbackRequestCount(), 0);
        (uint256 trippedAt, bytes32 reason, bool active) = watcher.incident(stranger);
        assertEq(trippedAt, 0);
        assertEq(reason, bytes32(0));
        assertFalse(active);
    }

    function testEmergencyPausedFromRegisteredAddressOnWrongChainIgnored() public {
        // originUni is registered on UNI (1301), not on BASE (84532).
        _reactAsSystem(_emergencyLog(originUni, BASE, REASON_A));
        assertEq(system.callbackRequestCount(), 0);
        (,, bool active) = watcher.incident(originUni);
        assertFalse(active);
    }

    function testUnknownTopicFallsThrough() public {
        IReactive.LogRecord memory log_ = _log(0xdeadbeef, 0, abi.encode(uint256(1)), 1, originUni, UNI);
        _reactAsSystem(log_); // must not revert
        assertEq(system.callbackRequestCount(), 0);
    }

    function testEmergencyPausedWithWrongOpCodeIgnored() public {
        IReactive.LogRecord memory log_ = _emergencyLog(originUni, UNI, REASON_A);
        log_.opCode = 1; // EmergencyPaused is LOG2; opCode 1 means malformed.
        _reactAsSystem(log_);
        assertEq(system.callbackRequestCount(), 0);
        (,, bool active) = watcher.incident(originUni);
        assertFalse(active);
    }

    // -- trip: new incident -----------------------------------------------------

    function testTripRecordsIncidentAndFansOutToAllExceptOrigin() public {
        vm.expectEmit(true, true, false, true, address(watcher));
        emit ContagionWatcher.IncidentTripped(originUni, UNI, REASON_A, START);
        _tripOrigin();

        (uint256 trippedAt, bytes32 reason, bool active) = watcher.incident(originUni);
        assertEq(trippedAt, START);
        assertEq(reason, REASON_A);
        assertTrue(active);

        // Origin itself is confirmed (it paused itself); others are not.
        assertTrue(watcher.confirmedPaused(UNI, originUni));
        assertTrue(watcher.isPaused(UNI, originUni));
        assertFalse(watcher.confirmedPaused(BASE, siblingBase));
        assertFalse(watcher.confirmedPaused(UNI, siblingUni2));

        // Exactly 2 callbacks: second Unichain sibling (UNI iterated
        // before BASE) + Base sibling. Origin itself gets none.
        assertEq(system.callbackRequestCount(), 2);
        (uint256 c0, address r0, uint64 g0, bytes memory p0) = _callbackAt(0);
        assertEq(c0, UNI);
        assertEq(r0, siblingUni2);
        assertEq(g0, 200_000);
        assertEq(bytes4(p0), SiblingVault.pause.selector);
        address placeholder; // first payload arg must be address(0)
        assembly {
            placeholder := mload(add(p0, 36))
        }
        assertEq(placeholder, address(0));
        (uint256 c1, address r1, uint64 g1, bytes memory p1) = _callbackAt(1);
        assertEq(c1, BASE);
        assertEq(r1, siblingBase);
        assertEq(g1, 200_000);
        assertEq(bytes4(p1), SiblingVault.pause.selector);
    }

    // -- Paused confirmation ------------------------------------------------------

    function testPausedFromSiblingConfirms() public {
        _tripOrigin();
        vm.expectEmit(true, true, false, false, address(watcher));
        emit ContagionWatcher.SiblingConfirmed(BASE, siblingBase);
        _reactAsSystem(_pausedLog(siblingBase, BASE));
        assertTrue(watcher.confirmedPaused(BASE, siblingBase));
        assertTrue(watcher.isConfirmed(BASE, siblingBase));
        assertTrue(watcher.isPaused(BASE, siblingBase));
        // A confirmation requests no callback.
        assertEq(system.callbackRequestCount(), 2);
    }

    function testPausedFromUnregisteredIgnored() public {
        _reactAsSystem(_pausedLog(stranger, UNI));
        assertFalse(watcher.confirmedPaused(UNI, stranger));
    }

    function testPausedWithWrongOpCodeIgnored() public {
        _tripOrigin();
        IReactive.LogRecord memory log_ = _pausedLog(siblingBase, BASE);
        log_.opCode = 2; // Paused is LOG1; opCode 2 means malformed.
        _reactAsSystem(log_);
        assertFalse(watcher.confirmedPaused(BASE, siblingBase));
    }

    // -- retry: re-emit ------------------------------------------------------------

    function testReEmitOnlyCallbacksUnconfirmed() public {
        _tripOrigin();
        assertEq(system.callbackRequestCount(), 2);
        // Base sibling confirms; Unichain-2 does not.
        _reactAsSystem(_pausedLog(siblingBase, BASE));
        // Origin re-emits the SAME incident.
        _reactAsSystem(_emergencyLog(originUni, UNI, REASON_A));
        assertEq(system.callbackRequestCount(), 3);
        (uint256 c, address r, uint64 g, bytes memory p) = _callbackAt(2);
        assertEq(c, UNI);
        assertEq(r, siblingUni2);
        assertEq(g, 200_000);
        assertEq(bytes4(p), SiblingVault.pause.selector);
    }

    function testReEmitAfterContainedIsNewIncident() public {
        _tripOrigin();
        _reactAsSystem(_pausedLog(siblingBase, BASE));
        _reactAsSystem(_pausedLog(siblingUni2, UNI));
        // All siblings confirmed -> the incident is CONTAINED (design §3.5).
        (,, bool active) = watcher.incident(originUni);
        assertFalse(active);

        // A re-emit AFTER containment is a NEW incident (design §4 P6):
        // confirmations reset, trippedAt re-anchored, full fan-out again.
        vm.warp(START + 1000);
        _reactAsSystem(_emergencyLog(originUni, UNI, REASON_A));
        assertFalse(watcher.confirmedPaused(BASE, siblingBase));
        assertFalse(watcher.confirmedPaused(UNI, siblingUni2));
        assertTrue(watcher.confirmedPaused(UNI, originUni));
        (uint256 trippedAt, bytes32 reason, bool activeNow) = watcher.incident(originUni);
        assertEq(trippedAt, START + 1000);
        assertEq(reason, REASON_A);
        assertTrue(activeNow);
        assertEq(system.callbackRequestCount(), 4);
    }

    function testContainedWhenAllSiblingsConfirm() public {
        _tripOrigin();
        (,, bool activeBefore) = watcher.incident(originUni);
        assertTrue(activeBefore);

        // One confirmation down, one to go: still ACTIVE.
        _reactAsSystem(_pausedLog(siblingBase, BASE));
        (,, bool activePartial) = watcher.incident(originUni);
        assertTrue(activePartial);

        // Last confirmation -> CONTAINED, event emitted.
        vm.expectEmit(true, false, false, false, address(watcher));
        emit ContagionWatcher.IncidentContained(originUni);
        _reactAsSystem(_pausedLog(siblingUni2, UNI));
        (,, bool activeAfter) = watcher.incident(originUni);
        assertFalse(activeAfter);
    }

    function testEmergencyPausedWithMismatchedTopic1Ignored() public {
        // topic1 claims the protocol is `stranger`, but the emitter is
        // originUni — a malformed log (design §3.5 step 3): fall through.
        IReactive.LogRecord memory log_ = _emergencyLog(originUni, UNI, REASON_A);
        log_.topic1 = uint256(uint160(stranger));
        _reactAsSystem(log_);
        assertEq(system.callbackRequestCount(), 0);
        (,, bool active) = watcher.incident(originUni);
        assertFalse(active);
    }

    // -- new incident resets confirmations ------------------------------------------

    function testNewIncidentFromDifferentOriginResetsConfirmations() public {
        _tripOrigin();
        _reactAsSystem(_pausedLog(siblingBase, BASE));
        _reactAsSystem(_pausedLog(siblingUni2, UNI));
        assertTrue(watcher.confirmedPaused(BASE, siblingBase));

        // Second origin trips: a NEW incident resets all confirmations,
        // marks the new origin confirmed, and fans out to the others.
        _reactAsSystem(_emergencyLog(siblingBase, BASE, REASON_A));
        assertFalse(watcher.confirmedPaused(UNI, originUni));
        assertFalse(watcher.confirmedPaused(UNI, siblingUni2));
        assertTrue(watcher.confirmedPaused(BASE, siblingBase)); // new origin
        assertEq(system.callbackRequestCount(), 4);
        (, address r2,,) = _callbackAt(2);
        (, address r3,,) = _callbackAt(3);
        assertEq(r2, originUni);
        assertEq(r3, siblingUni2);
    }

    function testSameOriginDifferentReasonWhileActiveIsRetry() public {
        _tripOrigin();
        _reactAsSystem(_pausedLog(siblingBase, BASE));
        assertTrue(watcher.confirmedPaused(BASE, siblingBase));

        // Same origin, different reason code, incident STILL ACTIVE:
        // this is a RETRY (design §3.5 step 3 + §4 P5), not a new
        // incident — trippedAt/reason are never overwritten by a retry,
        // confirmations already earned are never reset, and callbacks go
        // only to the sibling that has not confirmed yet.
        _reactAsSystem(_emergencyLog(originUni, UNI, REASON_B));
        assertTrue(watcher.confirmedPaused(BASE, siblingBase));
        (uint256 trippedAt, bytes32 reason, bool active) = watcher.incident(originUni);
        assertEq(trippedAt, START);
        assertEq(reason, REASON_A);
        assertTrue(active);
        assertEq(system.callbackRequestCount(), 3);
        (, address r,,) = _callbackAt(2);
        assertEq(r, siblingUni2);
    }

    function testClearIncidentMakesSameReasonTripNewAgain() public {
        vm.warp(START + 1000);
        _tripOrigin();
        _reactAsSystem(_pausedLog(siblingBase, BASE));
        watcher.clearIncident(originUni);
        (,, bool active) = watcher.incident(originUni);
        assertFalse(active);

        // Same reason, but the incident was cleared -> new incident.
        _reactAsSystem(_emergencyLog(originUni, UNI, REASON_A));
        assertFalse(watcher.confirmedPaused(BASE, siblingBase));
        assertEq(system.callbackRequestCount(), 4);
        (uint256 trippedAt,,) = watcher.incident(originUni);
        assertEq(trippedAt, START + 1000);
    }

    // -- timing: on-chain latency evidence -------------------------------------

    function testIncidentTimingRecordedOnTrip() public {
        uint256 tripBlock = 777_111;
        uint256 tripTx = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        IReactive.LogRecord memory log_ = _log(
            ContagionTopics.EMERGENCY_PAUSED_TOPIC, uint256(uint160(originUni)), abi.encode(REASON_A), 2, originUni, UNI
        );
        log_.blockNumber = tripBlock;
        log_.txHash = tripTx;
        _reactAsSystem(log_);
        (uint256 trippedAt, uint256 trippedBlock, uint256 trippedTxHash) = watcher.incidentTiming(originUni);
        assertEq(trippedAt, START);
        assertEq(trippedBlock, tripBlock);
        assertEq(trippedTxHash, tripTx);
        // The origin confirmed itself by tripping: leg latency 0.
        (uint256 confirmedAt, uint256 confirmedTxHash) = watcher.confirmationTiming(UNI, originUni);
        assertEq(confirmedAt, START);
        assertEq(confirmedTxHash, tripTx);
    }

    function testConfirmationTimingRecordedOnPaused() public {
        _tripOrigin();
        vm.warp(START + 5);
        uint256 pauseTx = 0x9999aaaa9999aaaa9999aaaa9999aaaa9999aaaa9999aaaa9999aaaa9999aaaa;
        IReactive.LogRecord memory log_ = _pausedLog(siblingBase, BASE);
        log_.txHash = pauseTx;
        _reactAsSystem(log_);
        (uint256 confirmedAt, uint256 confirmedTxHash) = watcher.confirmationTiming(BASE, siblingBase);
        assertEq(confirmedAt, START + 5);
        assertEq(confirmedTxHash, pauseTx);
        // Leg latency is readable from chain: confirmedAt - trippedAt = 5s.
        (uint256 trippedAt,,) = watcher.incidentTiming(originUni);
        assertEq(confirmedAt - trippedAt, 5);
    }

    function testRetryDoesNotOverwriteFirstTimings() public {
        uint256 tripTxA = 0xaaaa000000000000000000000000000000000000000000000000000000000000;
        IReactive.LogRecord memory trip = _emergencyLog(originUni, UNI, REASON_A);
        trip.blockNumber = 777;
        trip.txHash = tripTxA;
        _reactAsSystem(trip);

        // Confirm the Base sibling at START+10 with its own tx hash.
        vm.warp(START + 10);
        uint256 pauseTxC = 0xcccc000000000000000000000000000000000000000000000000000000000000;
        IReactive.LogRecord memory paused = _pausedLog(siblingBase, BASE);
        paused.txHash = pauseTxC;
        _reactAsSystem(paused);

        // Retry: re-emit the same incident with a NEW block/tx, and
        // re-deliver Paused with a different tx hash.
        uint256 tripTxB = 0xbbbb000000000000000000000000000000000000000000000000000000000000;
        IReactive.LogRecord memory retry = _emergencyLog(originUni, UNI, REASON_A);
        retry.blockNumber = 999;
        retry.txHash = tripTxB;
        _reactAsSystem(retry);
        uint256 pauseTxD = 0xdddd000000000000000000000000000000000000000000000000000000000000;
        IReactive.LogRecord memory pausedAgain = _pausedLog(siblingBase, BASE);
        pausedAgain.txHash = pauseTxD;
        _reactAsSystem(pausedAgain);

        // First timings survive both replays.
        (uint256 trippedAt, uint256 trippedBlock, uint256 trippedTxHash) = watcher.incidentTiming(originUni);
        assertEq(trippedAt, START);
        assertEq(trippedBlock, 777);
        assertEq(trippedTxHash, tripTxA);
        (uint256 confirmedAt, uint256 confirmedTxHash) = watcher.confirmationTiming(BASE, siblingBase);
        assertEq(confirmedAt, START + 10);
        assertEq(confirmedTxHash, pauseTxC);
    }

    function testRetryCountsPerDestination() public {
        _tripOrigin();
        assertEq(_countCallbacksTo(siblingBase), 1);
        assertEq(_countCallbacksTo(siblingUni2), 1);
        assertEq(_countCallbacksTo(originUni), 0);

        // Base confirms; Uni2 does not. Re-emit twice: the confirmed
        // destination must NEVER be requested again, the unconfirmed one
        // is requested once per re-emit.
        _reactAsSystem(_pausedLog(siblingBase, BASE));
        _reactAsSystem(_emergencyLog(originUni, UNI, REASON_A));
        _reactAsSystem(_emergencyLog(originUni, UNI, REASON_A));
        assertEq(_countCallbacksTo(siblingBase), 1);
        assertEq(_countCallbacksTo(siblingUni2), 3);
        assertEq(_countCallbacksTo(originUni), 0);
        assertEq(system.callbackRequestCount(), 4);
    }

    // -- register / unregister -------------------------------------------------------

    function testRegisterSiblingOnlyOwner() public {
        address fresh = makeAddr("fresh");
        vm.prank(stranger);
        vm.expectRevert(ContagionWatcher.NotOwner.selector);
        watcher.registerSibling(BASE, fresh);

        uint256 subsBefore = system.subscriptionCount();
        watcher.registerSibling(BASE, fresh);
        assertTrue(watcher.registeredSibling(BASE, fresh));
        assertEq(system.subscriptionCount(), subsBefore + 2);
        assertEq(watcher.siblings(BASE).length, 2);
    }

    function testRegisterDuplicateReverts() public {
        vm.expectRevert(abi.encodeWithSelector(ContagionWatcher.AlreadyRegistered.selector, UNI, originUni));
        watcher.registerSibling(UNI, originUni);
    }

    function testUnregisterSiblingThenReactIgnored() public {
        watcher.unregisterSibling(BASE, siblingBase);
        assertFalse(watcher.registeredSibling(BASE, siblingBase));
        assertEq(system.unsubscriptionCount(), 2);

        _tripOrigin();
        // Only siblingUni2 gets a callback now (Base sibling is gone).
        assertEq(system.callbackRequestCount(), 1);
        (, address r,,) = _callbackAt(0);
        assertEq(r, siblingUni2);
    }

    function testUnregisterOnlyOwnerAndNotRegisteredReverts() public {
        vm.prank(stranger);
        vm.expectRevert(ContagionWatcher.NotOwner.selector);
        watcher.unregisterSibling(BASE, siblingBase);
        vm.expectRevert(abi.encodeWithSelector(ContagionWatcher.NotRegistered.selector, BASE, stranger));
        watcher.unregisterSibling(BASE, stranger);
    }

    // -- pause / resume / debt ----------------------------------------------------------

    function testPauseBlocksReacts() public {
        vm.prank(stranger);
        vm.expectRevert(ContagionWatcher.NotOwner.selector);
        watcher.pause();

        watcher.pause();
        assertTrue(watcher.paused());
        _tripOrigin();
        assertEq(system.callbackRequestCount(), 0);

        watcher.resume();
        assertFalse(watcher.paused());
        _tripOrigin();
        assertEq(system.callbackRequestCount(), 2);
    }

    function testCoverDebtIsPublic() public {
        system.setDebt(address(watcher), 0.01 ether);
        uint256 balBefore = address(watcher).balance;
        vm.prank(stranger);
        watcher.coverDebt();
        assertEq(address(watcher).balance, balBefore - 0.01 ether);
        assertEq(SYSTEM.balance, 0.01 ether);
    }
}
