// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {PublicVaultERC20V3} from "../src/PublicVaultERC20V3.sol";
import {VaultFactoryERC20} from "../src/VaultFactoryERC20.sol";
import {UsdcFixture} from "./fixtures/UsdcFixture.sol";

/// @notice Tests for PublicVaultERC20V3: identical to PublicVaultERC20
/// except `reopen()` is OWNER-ONLY (audit pass 2, finding N2) — see
/// PublicVaultV3.t.sol for the reason.
contract PublicVaultERC20V3Test is Test {
    IPayable public constant UNI_PROXY = IPayable(payable(0x775c9B990ADe401060B78D0e98684eEf8d2466C1));

    address public owner = makeAddr("owner");
    address public stranger = makeAddr("stranger");
    address public watcherDummy = makeAddr("watcher");

    PublicVaultERC20V3 public vault;
    VaultFactoryERC20 public factory;
    UsdcFixture public usdc;

    bytes32 public constant REASON = bytes32("PUBUSDC3-1");

    function setUp() public {
        vm.deal(address(this), 10 ether);
        vm.deal(owner, 10 ether);
        vm.deal(stranger, 10 ether);
        usdc = new UsdcFixture();
        usdc.mint(stranger, 1_000_000_000); // 1000 USDC
        PublicVaultERC20V3 impl = new PublicVaultERC20V3(UNI_PROXY);
        factory = new VaultFactoryERC20(address(impl));
        address created = factory.createVault(
            owner, watcherDummy, address(usdc), "ContagionStop Public USDC Vault Share v3", "CSPUSDC3", 0
        );
        vault = PublicVaultERC20V3(payable(created));
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
            abi.encodeWithSelector(PublicVaultERC20V3.TripCooldown.selector, block.timestamp + 60)
        );
        vault.trip(REASON);
    }

    function test_ReopenOwnerOnly() public {
        vm.prank(stranger);
        vault.trip(REASON);
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger)
        );
        vault.reopen();
        assertTrue(vault.paused());
        vm.prank(owner);
        vault.reopen();
        assertFalse(vault.paused());
    }

    function test_ReopenByOwnerWhenActiveReverts() public {
        vm.prank(owner);
        vm.expectRevert();
        vault.reopen();
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

    function test_ImplOwnerRenounced() public {
        address impl = factory.implementation();
        assertEq(PublicVaultERC20V3(payable(impl)).owner(), address(0));
    }
}
