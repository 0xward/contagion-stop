// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";

/// @title LocalSystemContract — local stand-in for the Reactive system contract
/// @notice There is no official emulator for Lasna. Tests etch this
/// contract's code at the real system address (0x8888...8888) with
/// `vm.etch`, so `SYSTEM.subscribe` / `unsubscribe` /
/// `requestCallbackV_1_0` calls from ContagionWatcher land here and are
/// recorded. It is test scaffolding only — never deployed to any chain.
contract LocalSystemContract is ISystemContract {
    struct Subscription {
        uint256 chainId;
        address contractAddress;
        uint256 topic0;
        uint256 topic1;
        uint256 topic2;
        uint256 topic3;
    }

    struct CallbackRequest {
        uint256 chainId;
        address recipient;
        uint64 gasLimit;
        bytes payload;
    }

    Subscription[] public subscriptions;
    Subscription[] public unsubscriptions;
    CallbackRequest[] public callbackRequests;
    mapping(address => uint256) public debtValue;

    function subscribe(
        uint256 chainId_,
        address contract_,
        uint256 topic0_,
        uint256 topic1_,
        uint256 topic2_,
        uint256 topic3_
    ) external override {
        subscriptions.push(Subscription(chainId_, contract_, topic0_, topic1_, topic2_, topic3_));
    }

    function unsubscribe(
        uint256 chainId_,
        address contract_,
        uint256 topic0_,
        uint256 topic1_,
        uint256 topic2_,
        uint256 topic3_
    ) external override {
        unsubscriptions.push(Subscription(chainId_, contract_, topic0_, topic1_, topic2_, topic3_));
    }

    function requestCallbackV_1_0(CallbackConfiguration_V_1_0 memory config_) external override {
        callbackRequests.push(CallbackRequest(config_.chainId, config_.recipient, config_.gasLimit, config_.payload));
    }

    function requestCallback(CallbackVersion, bytes memory) external pure override {}

    function debt(address contract_) external view override returns (uint256) {
        return debtValue[contract_];
    }

    function setDebt(address contract_, uint256 amount) external {
        debtValue[contract_] = amount;
    }

    function subscriptionCount() external view returns (uint256) {
        return subscriptions.length;
    }

    function unsubscriptionCount() external view returns (uint256) {
        return unsubscriptions.length;
    }

    function callbackRequestCount() external view returns (uint256) {
        return callbackRequests.length;
    }

    receive() external payable override {}
}
