// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";
import {ContagionWatcherV3} from "../src/ContagionWatcherV3.sol";
import {LocalSystemContract} from "./fixtures/LocalSystemContract.sol";

/// @notice Tests for ContagionWatcherV3's aggregate incident cap (audit
/// pass 2, finding N1): at most 5 NEW incidents per rolling hour; a 6th
/// is dropped with `IncidentCapHit` and no fan-out. Retries of an active
/// incident are never capped. Setup mirrors ContagionWatcher.t.sol: the
/// Reactive system contract is simulated by etching LocalSystemContract
/// at 0x8888...8888, and `react()` is invoked via `vm.prank(SYSTEM)`.
contract ContagionWatcherV3Test is Test {
    address public constant SYSTEM = 0x8888888888888888888888888888888888888888;

    uint256 public constant UNI = 1301;
    uint256 public constant BASE = 84532;
    uint256 public constant START = 1_000_000;

    address public originUni = makeAddr("originUni");
    address public siblingBase = makeAddr("siblingBase");
    address public siblingUni2 = makeAddr("siblingUni2");

    bytes32 public constant REASON_A = bytes32("INCIDENT-A");
    bytes32 public constant REASON_B = bytes32("INCIDENT-B");

    event IncidentCapHit(address indexed origin, uint256 indexed chainId, bytes32 reason, uint256 at);

    ContagionWatcherV3 public watcher;
    LocalSystemContract public system;

    function setUp() public {
        vm.warp(START);
        vm.etch(SYSTEM, address(new LocalSystemContract()).code);
        system = LocalSystemContract(payable(SYSTEM));
        uint256[] memory chainIds = new uint256[](3);
        chainIds[0] = UNI;
        chainIds[1] = BASE;
        chainIds[2] = UNI;
        address[] memory siblings = new address[](3);
        siblings[0] = originUni;
        siblings[1] = siblingBase;
        siblings[2] = siblingUni2;
        watcher = new ContagionWatcherV3{value: 0.5 ether}(chainIds, siblings);
    }

    // -- helpers (same shapes as ContagionWatcher.t.sol) ----------------------

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
        return _log(ContagionTopics.PAUSED_TOPIC, 0, abi.encode(sibling), 1, sibling, chainId);
    }

    function _reactAsSystem(IReactive.LogRecord memory log_) internal {
        vm.prank(SYSTEM);
        watcher.react(log_);
    }

    /// @notice Trip one origin, then clear its incident so the next trip
    /// from the same origin counts as a NEW incident again.
    function _tripNewIncident(address origin, uint256 chainId, bytes32 reason) internal {
        _reactAsSystem(_emergencyLog(origin, chainId, reason));
        watcher.clearIncident(origin);
    }

    function _callbackCount() internal view returns (uint256) {
        return system.callbackRequestCount();
    }

    function _incidentActive(address origin) internal view returns (bool) {
        (,, bool active) = watcher.incident(origin);
        return active;
    }

    // -- cap constants ---------------------------------------------------------

    function test_CapConstants() public view {
        assertEq(watcher.MAX_NEW_INCIDENTS_PER_WINDOW(), 5);
        assertEq(watcher.CAP_WINDOW(), 1 hours);
        assertEq(watcher.capWindowStart(), START);
        assertEq(watcher.capWindowCount(), 0);
    }

    // -- five new incidents are all fanned out --------------------------------

    function test_CapAllowsFiveNewIncidents() public {
        for (uint256 i = 0; i < 5; i++) {
            _tripNewIncident(originUni, UNI, REASON_A);
        }
        // Each new incident fans out to the 2 siblings (origin excluded).
        assertEq(_callbackCount(), 10);
        assertEq(watcher.capWindowCount(), 5);
    }

    // -- the sixth new incident is dropped, event only --------------------------

    function test_SixthNewIncidentDropped() public {
        for (uint256 i = 0; i < 5; i++) {
            _tripNewIncident(originUni, UNI, REASON_A);
        }
        assertEq(_callbackCount(), 10);

        vm.expectEmit(true, true, false, true, address(watcher));
        emit IncidentCapHit(siblingBase, BASE, REASON_B, block.timestamp);
        _reactAsSystem(_emergencyLog(siblingBase, BASE, REASON_B));

        assertEq(_callbackCount(), 10, "capped trip must request no callbacks");
        assertEq(watcher.capWindowCount(), 5, "capped trip must not count");
        assertFalse(_incidentActive(siblingBase), "capped trip must record no incident");
    }

    // -- retries of an ACTIVE incident are never capped ------------------------

    function test_RetryStillFansOutAfterCapReached() public {
        // Incident 1 from originUni, then cleared.
        _tripNewIncident(originUni, UNI, REASON_A); // count=1, callbacks=2
        // Incident 2 from siblingBase stays ACTIVE.
        _reactAsSystem(_emergencyLog(siblingBase, BASE, REASON_B)); // count=2, callbacks=4
        assertTrue(_incidentActive(siblingBase));
        // Fill the cap with 3 more new incidents from originUni.
        for (uint256 i = 0; i < 3; i++) {
            _tripNewIncident(originUni, UNI, REASON_A); // counts 3,4,5; callbacks 6,8,10
        }
        assertEq(watcher.capWindowCount(), 5);
        assertEq(_callbackCount(), 10);
        assertTrue(_incidentActive(siblingBase), "retry target still active");
        // Re-emit siblingBase's trip: a retry, not a new incident — it
        // must still fan out despite the cap. The last new incident
        // (originUni) self-confirmed, so only the never-confirmed
        // siblingUni2 gets a callback: 10 -> 11.
        _reactAsSystem(_emergencyLog(siblingBase, BASE, REASON_B));
        assertEq(_callbackCount(), 11, "retry must fan out despite the cap");
    }

    // -- the window resets one hour after it started ---------------------------

    function test_CapWindowResetsAfterOneHour() public {
        for (uint256 i = 0; i < 5; i++) {
            _tripNewIncident(originUni, UNI, REASON_A);
        }
        _reactAsSystem(_emergencyLog(siblingBase, BASE, REASON_B));
        assertEq(_callbackCount(), 10, "6th incident capped before reset");
        assertFalse(_incidentActive(siblingBase));

        vm.warp(START + 3601);
        _reactAsSystem(_emergencyLog(siblingBase, BASE, REASON_B));
        assertEq(_callbackCount(), 12, "incident allowed after window reset");
        assertTrue(_incidentActive(siblingBase));
        assertEq(watcher.capWindowCount(), 1);
    }

    // -- the loop still contains when every sibling confirms -------------------

    function test_ContainedWhenAllSiblingsConfirm() public {
        _reactAsSystem(_emergencyLog(originUni, UNI, REASON_A));
        assertTrue(_incidentActive(originUni));
        _reactAsSystem(_pausedLog(siblingBase, BASE));
        assertTrue(_incidentActive(originUni));
        _reactAsSystem(_pausedLog(siblingUni2, UNI));
        assertFalse(_incidentActive(originUni), "all confirmed -> CONTAINED");
    }
}
