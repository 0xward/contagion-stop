// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {PublicVaultERC20} from "../src/PublicVaultERC20.sol";
import {VaultFactoryERC20} from "../src/VaultFactoryERC20.sol";
import {UsdcFixture} from "./fixtures/UsdcFixture.sol";

/// @notice Tests for PublicVaultERC20: permissionless trip/reopen + 60 s
/// cooldown on top of ContagionVaultERC20 (USDC shares), via a factory
/// clone — the same shape as the live deployment.
contract PublicVaultERC20Test is Test {
    IPayable public constant UNI_PROXY = IPayable(payable(0x775c9B990ADe401060B78D0e98684eEf8d2466C1));

    address public owner = makeAddr("owner");
    address public stranger = makeAddr("stranger");
    address public watcherDummy = makeAddr("watcher");

    PublicVaultERC20 public vault;
    VaultFactoryERC20 public factory;
    UsdcFixture public usdc;

    bytes32 public constant REASON = bytes32("PUBUSDC-1");

    function setUp() public {
        vm.deal(address(this), 10 ether);
        vm.deal(owner, 10 ether);
        vm.deal(stranger, 10 ether);
        usdc = new UsdcFixture();
        usdc.mint(stranger, 1_000_000_000); // 1000 USDC
        PublicVaultERC20 impl = new PublicVaultERC20(UNI_PROXY);
        factory = new VaultFactoryERC20(address(impl));
        address created = factory.createVault(
            owner, watcherDummy, address(usdc), "ContagionStop Public USDC Vault Share", "CSPUSDC", 0
        );
        vault = PublicVaultERC20(payable(created));
    }

    function test_TripPermissionlessPausesAndEmits() public {
        vm.prank(stranger);
        vault.trip(REASON);
        assertTrue(vault.paused());
    }

    function test_TripCooldownBlocksSecondTrip() public {
        vm.prank(stranger);
        vault.trip(REASON);
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(PublicVaultERC20.TripCooldown.selector, block.timestamp + 60)
        );
        vault.trip(REASON);
    }

    function test_ReopenPermissionless() public {
        vm.prank(stranger);
        vault.trip(REASON);
        vm.prank(stranger);
        vault.reopen();
        assertFalse(vault.paused());
    }

    function test_DepositUsdcMintsShares() public {
        vm.startPrank(stranger);
        usdc.approve(address(vault), 20_000_000);
        uint256 shares = vault.deposit(20_000_000, stranger);
        vm.stopPrank();
        assertGt(shares, 0);
        assertEq(vault.totalAssets(), 20_000_000);
        assertEq(usdc.balanceOf(address(vault)), 20_000_000);
    }

    function test_DepositRevertsWhenPaused() public {
        vm.prank(stranger);
        vault.trip(REASON);
        vm.startPrank(stranger);
        usdc.approve(address(vault), 20_000_000);
        vm.expectRevert();
        vault.deposit(20_000_000, stranger);
        vm.stopPrank();
    }

    function test_WithdrawOpenWhenPaused() public {
        vm.startPrank(stranger);
        usdc.approve(address(vault), 20_000_000);
        vault.deposit(20_000_000, stranger);
        vault.trip(REASON);
        uint256 before = usdc.balanceOf(stranger);
        vault.withdraw(5_000_000, stranger);
        vm.stopPrank();
        assertEq(usdc.balanceOf(stranger), before + 5_000_000);
        assertEq(vault.totalAssets(), 15_000_000);
    }

    function test_EthDepositStillReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        vault.deposit{value: 0.001 ether}();
    }

    function test_ImplOwnerRenounced() public {
        address impl = factory.implementation();
        assertEq(PublicVaultERC20(payable(impl)).owner(), address(0));
    }
}
