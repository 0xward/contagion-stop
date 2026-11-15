// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {ContagionVaultERC20} from "../src/ContagionVaultERC20.sol";
import {VaultFactoryERC20} from "../src/VaultFactoryERC20.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {UsdcFixture} from "./fixtures/UsdcFixture.sol";

/// @title VaultFactoryERC20 tests — EIP-1167 clones, CREATE2 prediction, validation
contract VaultFactoryERC20Test is Test {
    IPayable internal constant PROXY = IPayable(payable(0x476F44b11F5C942c58f4c8E3d0300E5710743585));
    address internal constant WATCHER = address(0xBEEF);

    uint256 internal constant ONE_USDC = 1e6;

    VaultFactoryERC20 internal factory;
    ContagionVaultERC20 internal implementation;
    UsdcFixture internal usdc;

    address internal owner;
    address internal creator;

    event VaultCreated(
        address indexed owner,
        address indexed vault,
        address indexed watcher,
        uint256 chainId,
        address asset,
        string name,
        string symbol
    );

    function setUp() public {
        owner = makeAddr("owner");
        creator = makeAddr("creator");
        usdc = new UsdcFixture();
        implementation = new ContagionVaultERC20(PROXY);
        factory = new VaultFactoryERC20(address(implementation));
    }

    function test_ConstructorRejectsZeroImplementation() public {
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        new VaultFactoryERC20(address(0));
    }

    function test_CreateVaultPredictable() public {
        address predicted = factory.predictVault(creator, owner, 0);
        vm.prank(creator);
        address vault = factory.createVault(
            owner, WATCHER, address(usdc), "Team USDC Vault Share", "TVUS", 0
        );
        assertEq(vault, predicted);
        assertEq(factory.vaultCount(), 1);

        ContagionVaultERC20 v = ContagionVaultERC20(payable(vault));
        assertEq(v.name(), "Team USDC Vault Share");
        assertEq(v.symbol(), "TVUS");
        assertEq(v.owner(), owner);
        assertEq(v.watcher(), WATCHER);
        assertEq(v.asset(), address(usdc));
        assertEq(v.assetDecimals(), 6);
        assertEq(v.decimalsOffset(), 12);
        // 0 minDeposit means the default: one whole token.
        assertEq(v.minDeposit(), ONE_USDC);
        assertEq(v.totalAssets(), 0);
    }

    function test_CreateVaultCustomMinDeposit() public {
        vm.prank(creator);
        address vault = factory.createVault(
            owner, WATCHER, address(usdc), "A", "A", 5 * ONE_USDC
        );
        assertEq(ContagionVaultERC20(payable(vault)).minDeposit(), 5 * ONE_USDC);
    }

    function test_CreateVaultSecondAddressDiffers() public {
        vm.startPrank(creator);
        address first = factory.createVault(owner, WATCHER, address(usdc), "A", "A", 0);
        address second = factory.createVault(owner, WATCHER, address(usdc), "B", "B", 0);
        vm.stopPrank();
        assertTrue(first != second);
        assertEq(second, factory.predictVault(creator, owner, 1));
        assertEq(factory.vaultCount(), 2);
    }

    function test_CreateVaultEmitsEvent() public {
        address predicted = factory.predictVault(creator, owner, 0);
        vm.expectEmit(true, true, true, true, address(factory));
        emit VaultCreated(owner, predicted, WATCHER, block.chainid, address(usdc), "Team USDC Vault Share", "TVUS");
        vm.prank(creator);
        factory.createVault(owner, WATCHER, address(usdc), "Team USDC Vault Share", "TVUS", 0);
    }

    function test_CreateVaultRejectsZeroOwner() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        factory.createVault(address(0), WATCHER, address(usdc), "A", "A", 0);
    }

    function test_CreateVaultRejectsZeroWatcher() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        factory.createVault(owner, address(0), address(usdc), "A", "A", 0);
    }

    function test_CreateVaultRejectsZeroAsset() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(VaultFactoryERC20.InvalidAsset.selector));
        factory.createVault(owner, WATCHER, address(0), "A", "A", 0);
    }

    function test_CreateVaultRejectsAssetWithoutCode() public {
        address noCode = makeAddr("noCode");
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(VaultFactoryERC20.InvalidAsset.selector));
        factory.createVault(owner, WATCHER, noCode, "A", "A", 0);
    }

    function test_CreateVaultRejectsEmptyName() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("InvalidName()"));
        factory.createVault(owner, WATCHER, address(usdc), "", "A", 0);
    }

    function test_CreateVaultRejectsEmptySymbol() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("InvalidSymbol()"));
        factory.createVault(owner, WATCHER, address(usdc), "A", "", 0);
    }

    function test_CreateVaultRejectsLongName() public {
        string memory longName = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // 65 chars
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("InvalidName()"));
        factory.createVault(owner, WATCHER, address(usdc), longName, "A", 0);
    }

    function test_CreateVaultRejectsLongSymbol() public {
        string memory longSymbol = "AAAAAAAAAAAAAAAAA"; // 17 chars
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("InvalidSymbol()"));
        factory.createVault(owner, WATCHER, address(usdc), "A", longSymbol, 0);
    }

    function test_CloneCannotBeReinitialized() public {
        vm.prank(creator);
        address vault = factory.createVault(owner, WATCHER, address(usdc), "A", "A", 0);
        vm.expectRevert(abi.encodeWithSignature("InvalidInitialization()"));
        ContagionVaultERC20(payable(vault)).initialize(owner, WATCHER, address(usdc), "B", "B", ONE_USDC);
    }

    function test_ImplementationCannotBeInitialized() public {
        vm.expectRevert(abi.encodeWithSignature("InvalidInitialization()"));
        implementation.initialize(owner, WATCHER, address(usdc), "A", "A", ONE_USDC);
    }

    function test_PredictVaultIsStable() public {
        address a = factory.predictVault(creator, owner, 0);
        address b = factory.predictVault(creator, owner, 0);
        assertEq(a, b);
        assertTrue(a != address(0));
        // A different creator predicts a different address (anti-squatting).
        assertTrue(factory.predictVault(makeAddr("other"), owner, 0) != a);
    }
}
