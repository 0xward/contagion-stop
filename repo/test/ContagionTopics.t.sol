// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";
import {SiblingVault} from "../src/SiblingVault.sol";
import {MockCallbackProxy} from "./mocks/MockCallbackProxy.sol";

/// @notice Topic/constant tests. The point is NOT to re-derive the same
/// keccak expression twice: the topic constants are checked against the
/// topics a REAL SiblingVault emits on-chain (recorded logs), so a wrong
/// signature string in ContagionTopics would fail here.
contract ContagionTopicsTest is Test {
    IPayable public constant BASE_PROXY = IPayable(payable(0x476F44b11F5C942c58f4c8E3d0300E5710743585));

    address public owner = makeAddr("owner");
    address public watcher = makeAddr("watcher");
    bytes32 public constant REASON = bytes32("INCIDENT-1");

    SiblingVault public vault;

    function setUp() public {
        vm.etch(address(BASE_PROXY), address(new MockCallbackProxy()).code);
        vault = new SiblingVault(BASE_PROXY, owner, watcher);
    }

    function testEmergencyPausedTopicMatchesRealEmittedLog() public {
        vm.prank(owner);
        vm.recordLogs();
        vault.emergencyPause(REASON);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        // emergencyPause emits Paused (OZ) first, then EmergencyPaused.
        assertEq(logs.length, 2);
        assertEq(uint256(logs[1].topics[0]), ContagionTopics.EMERGENCY_PAUSED_TOPIC);
        assertEq(logs[1].topics[1], bytes32(uint256(uint160(address(vault)))));
        assertEq(keccak256(logs[1].data), keccak256(abi.encode(REASON)));
        // Independent recomputation (not from memory, not from the constant).
        assertEq(ContagionTopics.EMERGENCY_PAUSED_TOPIC, uint256(keccak256("EmergencyPaused(address,bytes32)")));
    }

    function testPausedTopicMatchesRealEmittedLog() public {
        vm.prank(owner);
        vm.recordLogs();
        vault.emergencyPause(REASON);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(uint256(logs[0].topics[0]), ContagionTopics.PAUSED_TOPIC);
        // OZ Pausable's Paused(address) has NO indexed param: the account
        // is the single non-indexed arg, so it lives in data (LOG1).
        assertEq(abi.decode(logs[0].data, (address)), owner);
        assertEq(ContagionTopics.PAUSED_TOPIC, uint256(keccak256("Paused(address)")));
    }

    function testChainAndProxyConstants() public pure {
        assertEq(ContagionTopics.UNICHAIN_SEPOLIA_CHAIN_ID, 1301);
        assertEq(ContagionTopics.BASE_SEPOLIA_CHAIN_ID, 84532);
        assertEq(ContagionTopics.LASNA_CHAIN_ID, 5318007);
        assertEq(ContagionTopics.SYSTEM_CONTRACT, 0x8888888888888888888888888888888888888888);
        assertEq(ContagionTopics.BASE_SEPOLIA_CALLBACK_PROXY, 0x476F44b11F5C942c58f4c8E3d0300E5710743585);
        assertEq(ContagionTopics.UNICHAIN_SEPOLIA_CALLBACK_PROXY, 0x775c9B990ADe401060B78D0e98684eEf8d2466C1);
        // The pre-Omni proxy address must NOT appear anywhere in the config.
        assertTrue(ContagionTopics.BASE_SEPOLIA_CALLBACK_PROXY != 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4);
        assertTrue(ContagionTopics.UNICHAIN_SEPOLIA_CALLBACK_PROXY != 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4);
    }

    function testCallbackGasLimitIs200k() public pure {
        // Measured (prebuild research): min 100k + proxy overhead 130k;
        // pause() ~45-60k -> 200k forwards ~70k. 150k is NOT enough.
        assertEq(ContagionTopics.CALLBACK_GAS_LIMIT, 200_000);
    }
}
