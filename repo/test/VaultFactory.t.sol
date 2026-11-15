// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {ContagionVault} from "../src/ContagionVault.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";

/// @title VaultFactory tests — EIP-1167 clones, CREATE2 prediction, validation
contract VaultFactoryTest is Test {
    IPayable internal constant PROXY = IPayable(payable(0x476F44b11F5C942c58f4c8E3d0300E5710743585));
    address internal constant WATCHER = address(0xBEEF);

    VaultFactory internal factory;
    ContagionVault internal implementation;

    address internal owner;
    address internal creator;

    event VaultCreated(
        address indexed owner, address indexed vault, address indexed watcher, uint256 chainId, string name, string symbol
    );

    function setUp() public {
        owner = makeAddr("owner");
        creator = makeAddr("creator");
        vm.deal(creator, 100 ether);
        implementation = new ContagionVault(PROXY);
        factory = new VaultFactory(address(implementation));
    }

    function test_ConstructorRejectsZeroImplementation() public {
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        new VaultFactory(address(0));
    }

    function test_CreateVaultPredictable() public {
        address predicted = factory.predictVault(creator, owner, 0);
        vm.prank(creator);
        address vault = factory.createVault{value: 0.001 ether}(
            owner, WATCHER, "Team Vault Share", "TVS", 0
        );
        assertEq(vault, predicted);
        assertEq(factory.vaultCount(), 1);

        ContagionVault v = ContagionVault(payable(vault));
        assertEq(v.name(), "Team Vault Share");
        assertEq(v.symbol(), "TVS");
        assertEq(v.owner(), owner);
        assertEq(v.watcher(), WATCHER);
        // 0 minDeposit means the default.
        assertEq(v.minDeposit(), 0.001 ether);
        assertEq(v.totalAssets(), 0.001 ether);
    }

    function test_CreateVaultSecondAddressDiffers() public {
        vm.startPrank(creator);
        address first = factory.createVault{value: 0.001 ether}(owner, WATCHER, "A", "A", 0);
        address second = factory.createVault{value: 0.001 ether}(owner, WATCHER, "B", "B", 0);
        vm.stopPrank();
        assertTrue(first != second);
        assertEq(second, factory.predictVault(creator, owner, 1));
        assertEq(factory.vaultCount(), 2);
    }

    function test_CreateVaultEmitsEvent() public {
        address predicted = factory.predictVault(creator, owner, 0);
        vm.expectEmit(true, true, true, true, address(factory));
        emit VaultCreated(owner, predicted, WATCHER, block.chainid, "Team Vault Share", "TVS");
        vm.prank(creator);
        factory.createVault{value: 0.001 ether}(owner, WATCHER, "Team Vault Share", "TVS", 0);
    }

    function test_CreateVaultRejectsZeroOwner() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        factory.createVault{value: 0.001 ether}(address(0), WATCHER, "A", "A", 0);
    }

    function test_CreateVaultRejectsZeroWatcher() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("ZeroAddress()"));
        factory.createVault{value: 0.001 ether}(owner, address(0), "A", "A", 0);
    }

    function test_CreateVaultRejectsEmptyName() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("InvalidName()"));
        factory.createVault{value: 0.001 ether}(owner, WATCHER, "", "A", 0);
    }

    function test_CreateVaultRejectsEmptySymbol() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("InvalidSymbol()"));
        factory.createVault{value: 0.001 ether}(owner, WATCHER, "A", "", 0);
    }

    function test_CreateVaultRejectsLowSeed() public {
        vm.prank(creator);
        vm.expectRevert(
            abi.encodeWithSelector(VaultFactory.InsufficientSeed.selector, 0.0005 ether, 0.001 ether)
        );
        factory.createVault{value: 0.0005 ether}(owner, WATCHER, "A", "A", 0);
    }

    function test_CreateVaultRejectsLongName() public {
        string memory longName = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // 65 chars
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSignature("InvalidName()"));
        factory.createVault{value: 0.001 ether}(owner, WATCHER, longName, "A", 0);
    }

    function test_CloneCannotBeReinitialized() public {
        vm.prank(creator);
        address vault = factory.createVault{value: 0.001 ether}(owner, WATCHER, "A", "A", 0);
        vm.expectRevert(abi.encodeWithSignature("InvalidInitialization()"));
        ContagionVault(payable(vault)).initialize(owner, WATCHER, "B", "B", 0.001 ether);
    }

    function test_ImplementationCannotBeInitialized() public {
        vm.expectRevert(abi.encodeWithSignature("InvalidInitialization()"));
        implementation.initialize(owner, WATCHER, "A", "A", 0.001 ether);
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
