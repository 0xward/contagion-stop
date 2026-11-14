// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test, console} from "forge-std/Test.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";
import {ContagionWatcher} from "../src/ContagionWatcher.sol";
import {SiblingVault} from "../src/SiblingVault.sol";
import {MockSystemContract} from "./mocks/MockSystemContract.sol";
import {MockCallbackProxy} from "./mocks/MockCallbackProxy.sol";

/// @notice Gas measurements for the gas report (gas-report.md). Numbers
/// are measured locally with etched mock system/proxy contracts — the mock
/// system contract's `requestCallbackV_1_0` is a plain array push, cheaper
/// than the real Lasna system contract, so `react()` gas here is a LOWER
/// bound. The network caps that matter are absolute: react() < 900_000 gas
/// (network cap) and each callback's gasLimit is 200_000 (design §7e).
/// On-chain react() gas will be re-measured at testnet deploy (design M5).
contract GasReportTest is Test {
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
    MockSystemContract public system;

    function setUp() public {
        vm.etch(SYSTEM, address(new MockSystemContract()).code);
        system = MockSystemContract(payable(SYSTEM));
        address proxyCode = address(new MockCallbackProxy());
        vm.etch(address(BASE_PROXY), proxyCode.code);
        vm.etch(address(UNI_PROXY), proxyCode.code);
        vm.deal(owner, 10 ether);
    }

    function _deployAll() internal {
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
        vm.startPrank(owner);
        originUni.setWatcher(address(watcher));
        siblingBase.setWatcher(address(watcher));
        siblingUni2.setWatcher(address(watcher));
        vm.stopPrank();
    }

    function _tripLog() internal view returns (IReactive.LogRecord memory) {
        return IReactive.LogRecord({
            chainId: UNI,
            contractAddress: address(originUni),
            topic0: ContagionTopics.EMERGENCY_PAUSED_TOPIC,
            topic1: uint256(uint160(address(originUni))),
            topic2: 0,
            topic3: 0,
            data: abi.encode(REASON),
            blockNumber: 1,
            opCode: 2,
            blockHash: 0,
            txHash: 0,
            logIndex: 0
        });
    }

    function _pausedLog(address sibling, uint256 chainId) internal pure returns (IReactive.LogRecord memory) {
        return IReactive.LogRecord({
            chainId: chainId,
            contractAddress: sibling,
            topic0: ContagionTopics.PAUSED_TOPIC,
            topic1: 0,
            topic2: 0,
            topic3: 0,
            data: abi.encode(sibling),
            blockNumber: 1,
            opCode: 1,
            blockHash: 0,
            txHash: 0,
            logIndex: 0
        });
    }

    function testDeployGas() public {
        uint256 g;
        g = gasleft();
        SiblingVault v = new SiblingVault(BASE_PROXY, owner, address(0));
        console.log("deploy SiblingVault:", g - gasleft());
        assertTrue(address(v) != address(0));

        g = gasleft();
        uint256[] memory chainIds = new uint256[](3);
        chainIds[0] = UNI;
        chainIds[1] = BASE;
        chainIds[2] = UNI;
        address[] memory siblings = new address[](3);
        siblings[0] = address(v);
        siblings[1] = makeAddr("b");
        siblings[2] = makeAddr("c");
        ContagionWatcher w = new ContagionWatcher{value: 0.5 ether}(chainIds, siblings);
        console.log("deploy ContagionWatcher (3 siblings):", g - gasleft());
        assertTrue(address(w) != address(0));
    }

    function testReactGasFanOut2() public {
        _deployAll();
        uint256 g = gasleft();
        vm.prank(SYSTEM);
        watcher.react(_tripLog());
        uint256 used = g - gasleft();
        console.log("react() new trip, fan-out 2 callbacks:", used);
        assertEq(system.callbackRequestCount(), 2);
        assertLt(used, 900_000, "react() must stay under the network cap");
    }

    function testReactGasRetryOneUnconfirmed() public {
        _deployAll();
        vm.prank(SYSTEM);
        watcher.react(_tripLog());
        vm.prank(SYSTEM);
        watcher.react(_pausedLog(address(siblingBase), BASE));
        uint256 g = gasleft();
        vm.prank(SYSTEM);
        watcher.react(_tripLog()); // retry: only the unconfirmed sibling
        uint256 used = g - gasleft();
        console.log("react() retry, fan-out 1 callback:", used);
        assertEq(system.callbackRequestCount(), 3);
        assertLt(used, 900_000, "react() must stay under the network cap");
    }

    function testReactGasFallThrough() public {
        _deployAll();
        IReactive.LogRecord memory log_ = _tripLog();
        log_.contractAddress = makeAddr("stranger");
        log_.topic1 = uint256(uint160(log_.contractAddress));
        uint256 g = gasleft();
        vm.prank(SYSTEM);
        watcher.react(log_);
        uint256 used = g - gasleft();
        console.log("react() fall-through (unregistered emitter):", used);
        assertEq(system.callbackRequestCount(), 0);
    }

    function testPauseCallbackGas() public {
        _deployAll();
        uint256 g = gasleft();
        vm.prank(address(BASE_PROXY));
        siblingBase.pause(address(watcher));
        uint256 used = g - gasleft();
        console.log("pause() execution on destination:", used);
        assertTrue(siblingBase.paused());
        assertLt(used, 200_000, "pause() must fit the 200k callback gasLimit");
    }

    function testEmergencyPauseAndDepositGas() public {
        _deployAll();
        uint256 g = gasleft();
        vm.prank(owner);
        originUni.emergencyPause(REASON);
        console.log("emergencyPause():", g - gasleft());
        g = gasleft();
        vm.prank(owner);
        siblingBase.deposit{value: 0.1 ether}();
        console.log("deposit():", g - gasleft());
    }
}
