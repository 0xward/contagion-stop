// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {PublicVaultV2} from "../src/PublicVaultV2.sol";
import {VaultFactory} from "../src/VaultFactory.sol";

/// @notice Tests for PublicVaultV2: permissionless trip/reopen + 60 s
/// cooldown on top of ContagionVault (shares, deposit/withdraw), via a
/// factory clone — the same shape as the live deployment.
contract PublicVaultV2Test is Test {
    IPayable public constant UNI_PROXY = IPayable(payable(0x775c9B990ADe401060B78D0e98684eEf8d2466C1));

    address public owner = makeAddr("owner");
    address public stranger = makeAddr("stranger");
    address public watcherDummy = makeAddr("watcher");

    PublicVaultV2 public vault;
    VaultFactory public factory;

    bytes32 public constant REASON = bytes32("PUB2-1");

    function setUp() public {
        vm.deal(address(this), 10 ether);
        vm.deal(owner, 10 ether);
        vm.deal(stranger, 10 ether);
        PublicVaultV2 impl = new PublicVaultV2(UNI_PROXY);
        factory = new VaultFactory(address(impl));
        address created = factory.createVault{value: 0.001 ether}(
            owner, watcherDummy, "ContagionStop Public Vault v2", "CSPUB2", 0
        );
        vault = PublicVaultV2(payable(created));
    }

    function test_TripPermissionlessPausesAndEmits() public {
        vm.prank(stranger);
        vault.trip(REASON);
        assertTrue(vault.paused());
        assertEq(vault.lastTripAt(), block.timestamp);
    }

    function test_TripCooldownBlocksSecondTrip() public {
        vm.prank(stranger);
        vault.trip(REASON);
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(PublicVaultV2.TripCooldown.selector, block.timestamp + 60)
        );
        vault.trip(REASON);
    }

    function test_TripAllowedAgainAfterCooldown() public {
        vm.prank(stranger);
        vault.trip(REASON);
        vm.warp(block.timestamp + 61);
        vm.prank(stranger);
        vault.trip(REASON);
        assertTrue(vault.paused());
    }

    function test_ReopenPermissionless() public {
        vm.prank(stranger);
        vault.trip(REASON);
        vm.prank(stranger);
        vault.reopen();
        assertFalse(vault.paused());
    }

    function test_ReopenWhenActiveReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        vault.reopen();
    }

    function test_DepositMintsSharesAndWithdrawWorks() public {
        vm.prank(stranger);
        vault.deposit{value: 0.01 ether}();
        assertGt(vault.balanceOf(stranger), 0);
        assertEq(vault.totalAssets(), 0.011 ether);
        uint256 before = stranger.balance;
        vm.prank(stranger);
        vault.withdraw(0.005 ether, stranger);
        assertEq(stranger.balance, before + 0.005 ether);
        assertEq(vault.totalAssets(), 0.006 ether);
    }

    function test_DepositRevertsWhenPaused() public {
        vm.prank(stranger);
        vault.trip(REASON);
        vm.prank(stranger);
        vm.expectRevert();
        vault.deposit{value: 0.01 ether}();
    }

    function test_WithdrawOpenWhenPaused() public {
        vm.prank(stranger);
        vault.deposit{value: 0.01 ether}();
        vm.prank(stranger);
        vault.trip(REASON);
        uint256 before = stranger.balance;
        vm.prank(stranger);
        vault.withdraw(0.005 ether, stranger);
        assertEq(stranger.balance, before + 0.005 ether);
    }

    function test_ImplOwnerRenounced() public {
        address impl = factory.implementation();
        assertEq(PublicVaultV2(payable(impl)).owner(), address(0));
    }
}
