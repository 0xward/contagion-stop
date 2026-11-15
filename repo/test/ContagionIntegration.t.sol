// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";
import {ContagionWatcher} from "../src/ContagionWatcher.sol";
import {SiblingVault} from "../src/SiblingVault.sol";
import {LocalSystemContract} from "./fixtures/LocalSystemContract.sol";
import {LocalCallbackProxy} from "./fixtures/LocalCallbackProxy.sol";

/// @notice Full local loop with local stand-ins: EmergencyPaused on the Unichain
/// origin -> watcher (Lasna) -> pause() callbacks to the Base sibling and
/// the second Unichain sibling -> both paused + confirmed -> deposits
/// revert. No real chain is touched; the system contract and both callback
/// proxies are etched stand-ins.
contract ContagionIntegrationTest is Test {
    address public constant SYSTEM = 0x8888888888888888888888888888888888888888;
    IPayable public constant BASE_PROXY = IPayable(payable(0x476F44b11F5C942c58f4c8E3d0300E5710743585));
    IPayable public constant UNI_PROXY = IPayable(payable(0x775c9B990ADe401060B78D0e98684eEf8d2466C1));

    uint256 public constant UNI = 1301;
    uint256 public constant BASE = 84532;
    bytes32 public constant REASON = bytes32("INCIDENT-1");

    address public owner = makeAddr("owner");

    SiblingVault public originUni;
    SiblingVault public siblingBase;
    SiblingVault public siblingUni2;
    ContagionWatcher public watcher;
    LocalSystemContract public system;

    function setUp() public {
        vm.etch(SYSTEM, address(new LocalSystemContract()).code);
        system = LocalSystemContract(payable(SYSTEM));
        address proxyCode = address(new LocalCallbackProxy());
        vm.etch(address(BASE_PROXY), proxyCode.code);
        vm.etch(address(UNI_PROXY), proxyCode.code);

        // Vaults deploy before the watcher exists (watcher = address(0)).
        originUni = new SiblingVault(UNI_PROXY, owner, address(0));
        siblingBase = new SiblingVault(BASE_PROXY, owner, address(0));
        siblingUni2 = new SiblingVault(UNI_PROXY, owner, address(0));

        uint256[] memory chainIds = new uint256[](3);
        chainIds[0] = UNI;
        chainIds[1] = BASE;
        chainIds[2] = UNI;
        address[] memory siblings = new address[](3);
        siblings[0] = address(originUni);
        siblings[1] = address(siblingBase);
        siblings[2] = address(siblingUni2);
        watcher = new ContagionWatcher{value: 0.5 ether}(chainIds, siblings);

        // Wire every vault to the watcher (deploy order needs this step).
        vm.startPrank(owner);
        originUni.setWatcher(address(watcher));
        siblingBase.setWatcher(address(watcher));
        siblingUni2.setWatcher(address(watcher));
        vm.stopPrank();

        vm.deal(owner, 10 ether);
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

    function _reactAsSystem(IReactive.LogRecord memory log_) internal {
        vm.prank(SYSTEM);
        watcher.react(log_);
    }

    /// @notice Execute callback request `i` through the local proxy of its
    /// destination chain, exactly as the real Reactive Signer would.
    function _executeCallback(uint256 i) internal {
        (uint256 chainId, address recipient,, bytes memory payload) = system.callbackRequests(i);
        address proxy = chainId == BASE ? address(BASE_PROXY) : address(UNI_PROXY);
        LocalCallbackProxy(payable(proxy)).executeCallback(recipient, payload, address(watcher));
    }

    function _tripOrigin() internal {
        // The origin's own emergency brake (owner action on Unichain).
        vm.prank(owner);
        originUni.emergencyPause(REASON);
        assertTrue(originUni.paused());
        // The watcher sees the EmergencyPaused log from the origin.
        _reactAsSystem(
            _log(
                ContagionTopics.EMERGENCY_PAUSED_TOPIC,
                uint256(uint160(address(originUni))),
                abi.encode(REASON),
                2,
                address(originUni),
                UNI
            )
        );
    }

    function _confirmPaused(SiblingVault vault, uint256 chainId) internal {
        // OZ Paused(address): account is non-indexed (data), LOG1.
        _reactAsSystem(_log(ContagionTopics.PAUSED_TOPIC, 0, abi.encode(address(vault)), 1, address(vault), chainId));
    }

    // -- full loop ---------------------------------------------------------------

    function testFullLoopPausesBothSiblings() public {
        vm.prank(owner);
        siblingBase.deposit{value: 1 ether}();
        vm.prank(owner);
        siblingUni2.deposit{value: 1 ether}();
        assertFalse(siblingBase.paused());
        assertFalse(siblingUni2.paused());

        _tripOrigin();

        // Fan-out: 2 callbacks, neither to the origin.
        assertEq(system.callbackRequestCount(), 2);
        (uint256 c0, address r0,,) = system.callbackRequests(0);
        (uint256 c1, address r1,,) = system.callbackRequests(1);
        assertTrue(r0 != address(originUni) && r1 != address(originUni));
        assertTrue((c0 == UNI && r0 == address(siblingUni2)) || (c0 == BASE && r0 == address(siblingBase)));
        assertTrue((c1 == UNI && r1 == address(siblingUni2)) || (c1 == BASE && r1 == address(siblingBase)));

        // Execute both callbacks through their chains' proxies.
        _executeCallback(0);
        _executeCallback(1);
        assertTrue(siblingBase.paused());
        assertTrue(siblingUni2.paused());

        // Confirmations flow back to the watcher.
        _confirmPaused(siblingBase, BASE);
        _confirmPaused(siblingUni2, UNI);
        assertTrue(watcher.isPaused(BASE, address(siblingBase)));
        assertTrue(watcher.isPaused(UNI, address(siblingUni2)));
        assertTrue(watcher.isConfirmed(BASE, address(siblingBase)));

        // Deposits into the frozen siblings now revert.
        vm.prank(owner);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        siblingBase.deposit{value: 0.1 ether}();
        vm.prank(owner);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        siblingUni2.deposit{value: 0.1 ether}();

        // The origin stays paused by its own brake (not by a callback).
        assertTrue(originUni.paused());
        // Both siblings confirmed -> the incident is CONTAINED (design §3.5
        // step 4): active = false, not stuck "in progress" forever.
        (,, bool active) = watcher.incident(address(originUni));
        assertFalse(active);
    }

    function testRetryOnlyUnconfirmedSibling() public {
        _tripOrigin();
        assertEq(system.callbackRequestCount(), 2);

        // Only the FIRST callback executes (say the Base one failed in
        // transit). Find which request targets the Base sibling.
        (uint256 c0, address r0,,) = system.callbackRequests(0);
        (uint256 c1, address r1,,) = system.callbackRequests(1);
        uint256 baseIdx = (c0 == BASE) ? 0 : 1;
        uint256 uniIdx = 1 - baseIdx;
        address baseRecipient = (c0 == BASE) ? r0 : r1;
        address uniRecipient = (c0 == BASE) ? r1 : r0;
        assertEq(baseRecipient, address(siblingBase));
        assertEq(uniRecipient, address(siblingUni2));

        _executeCallback(uniIdx);
        assertTrue(siblingUni2.paused());
        assertFalse(siblingBase.paused());
        _confirmPaused(siblingUni2, UNI);

        // Origin re-trips the same incident: retry goes ONLY to Base.
        _reactAsSystem(
            _log(
                ContagionTopics.EMERGENCY_PAUSED_TOPIC,
                uint256(uint160(address(originUni))),
                abi.encode(REASON),
                2,
                address(originUni),
                UNI
            )
        );
        assertEq(system.callbackRequestCount(), 3);
        (uint256 c2, address r2,,) = system.callbackRequests(2);
        assertEq(c2, BASE);
        assertEq(r2, address(siblingBase));

        _executeCallback(2);
        assertTrue(siblingBase.paused());
        // The late Paused confirmation closes the round: CONTAINED.
        _confirmPaused(siblingBase, BASE);
        (,, bool active) = watcher.incident(address(originUni));
        assertFalse(active);
    }

    function testWatcherPauseBlocksWholeLoop() public {
        watcher.pause();
        _reactAsSystem(
            _log(
                ContagionTopics.EMERGENCY_PAUSED_TOPIC,
                uint256(uint160(address(originUni))),
                abi.encode(REASON),
                2,
                address(originUni),
                UNI
            )
        );
        assertEq(system.callbackRequestCount(), 0);
        assertFalse(siblingBase.paused());
    }
}
