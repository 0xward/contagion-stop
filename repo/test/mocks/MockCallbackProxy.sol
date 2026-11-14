// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title MockCallbackProxy — local stand-in for a destination callback proxy
/// @notice Tests etch this contract's code at a real callback proxy address
/// (Base Sepolia 0x476F44b11F5C942c58f4c8E3d0300E5710743585 or Unichain
/// Sepolia 0x775c9B990ADe401060B78D0e98684eEf8d2466C1) with `vm.etch`, so
/// calls made through it carry `msg.sender == proxy`, satisfying
/// SiblingVault's `onlyServiceProvider` guard exactly like the real proxy.
/// `executeCallback` also reproduces the proxy's payload rewrite: the first
/// payload argument (an address placeholder) is overwritten with the
/// requesting watcher contract's address before the call is forwarded.
/// Test scaffolding only — never deployed to any chain.
contract MockCallbackProxy {
    mapping(address => uint256) public debtValue;

    function debt(address contract_) external view returns (uint256) {
        return debtValue[contract_];
    }

    function setDebt(address contract_, uint256 amount) external {
        debtValue[contract_] = amount;
    }

    /// @notice Forward `payload` to `target` as the proxy would, injecting
    /// `watcher_` as the first address argument (overwriting the
    /// address(0) placeholder in bytes 4..36).
    function executeCallback(address target, bytes memory payload, address watcher_) external returns (bytes memory) {
        bytes memory p = payload;
        assembly {
            // payload data starts at p+32; first arg word starts at p+36.
            mstore(add(p, 36), watcher_)
        }
        (bool ok, bytes memory ret) = target.call(p);
        require(ok, "mock proxy: callback call failed");
        return ret;
    }

    receive() external payable {}
}
