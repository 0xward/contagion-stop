// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ContagionTopics} from "../src/ContagionTopics.sol";
import {ContagionWatcher} from "../src/ContagionWatcher.sol";
import {SiblingVault} from "../src/SiblingVault.sol";
import {ContagionVaultERC20} from "../src/ContagionVaultERC20.sol";
import {VaultFactoryERC20} from "../src/VaultFactoryERC20.sol";
import {LocalSystemContract} from "./fixtures/LocalSystemContract.sol";
import {LocalCallbackProxy} from "./fixtures/LocalCallbackProxy.sol";
import {UsdcFixture} from "./fixtures/UsdcFixture.sol";

/// @notice Full local loop with local stand-ins, ERC-20 (USDC) vaults:
/// EmergencyPaused on the Unichain origin -> watcher (Lasna) -> pause()
/// callbacks to the Base sibling and the second Unichain sibling -> both
/// paused + confirmed. Mirrors ContagionVaultIntegrationTest, but the
/// vaults are ERC-20 factory clones holding the same 6-decimal asset, and
/// the test exercises the ERC-20-only property: deposits of the asset
/// revert while paused, withdrawals of the asset stay OPEN. The deploy
/// order is the real one: vault addresses are PREDICTED first, the watcher
/// is deployed with them, then the vaults are created (the watcher address
/// is real at creation time).
contract ContagionVaultERC20IntegrationTest is Test {
    address public constant SYSTEM = 0x8888888888888888888888888888888888888888;
    IPayable public constant BASE_PROXY = IPayable(payable(0x476F44b11F5C942c58f4c8E3d0300E5710743585));
    IPayable public constant UNI_PROXY = IPayable(payable(0x775c9B990ADe401060B78D0e98684eEf8d2466C1));

    uint256 public constant UNI = 1301;
    uint256 public constant BASE = 84532;
    bytes32 public constant REASON = bytes32("INCIDENT-1");
    uint256 public constant ONE_USDC = 1e6;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");

    UsdcFixture public usdc;
    ContagionVaultERC20 public originUni;
    ContagionVaultERC20 public siblingBase;
    ContagionVaultERC20 public siblingUni2;
    ContagionWatcher public watcher;
    LocalSystemContract public system;

    function setUp() public {
        vm.etch(SYSTEM, address(new LocalSystemContract()).code);
        system = LocalSystemContract(payable(SYSTEM));
        address proxyCode = address(new LocalCallbackProxy());
        vm.etch(address(BASE_PROXY), proxyCode.code);
        vm.etch(address(UNI_PROXY), proxyCode.code);

        vm.deal(owner, 100 ether);
        vm.deal(alice, 100 ether);
        usdc = new UsdcFixture();
        usdc.mint(alice, 1_000_000 * ONE_USDC);

        // One implementation + factory per chain (per-chain callback proxy).
        ContagionVaultERC20 implUni = new ContagionVaultERC20(UNI_PROXY);
        ContagionVaultERC20 implBase = new ContagionVaultERC20(BASE_PROXY);
        VaultFactoryERC20 factoryUni = new VaultFactoryERC20(address(implUni));
        VaultFactoryERC20 factoryBase = new VaultFactoryERC20(address(implBase));

        // 1) Predict the vault addresses BEFORE the watcher exists.
        address originAddr = factoryUni.predictVault(address(this), owner, 0);
        address baseAddr = factoryBase.predictVault(address(this), owner, 0);
        address uni2Addr = factoryUni.predictVault(address(this), owner, 1);

        // 2) Deploy the watcher with the predicted addresses.
        uint256[] memory chainIds = new uint256[](3);
        chainIds[0] = UNI;
        chainIds[1] = BASE;
        chainIds[2] = UNI;
        address[] memory siblings = new address[](3);
        siblings[0] = originAddr;
        siblings[1] = baseAddr;
        siblings[2] = uni2Addr;
        watcher = new ContagionWatcher{value: 0.5 ether}(chainIds, siblings);

        // 3) Create the vaults — the watcher address is real now, and the
        // created addresses must match the predictions exactly.
        address createdOrigin = factoryUni.createVault(
            owner, address(watcher), address(usdc), "Origin Share", "ORG", 0
        );
        address createdBase = factoryBase.createVault(
            owner, address(watcher), address(usdc), "Base Share", "BASE", 0
        );
        address createdUni2 = factoryUni.createVault(
            owner, address(watcher), address(usdc), "Uni2 Share", "UNI2", 0
        );
        assertEq(createdOrigin, originAddr);
        assertEq(createdBase, baseAddr);
        assertEq(createdUni2, uni2Addr);

        originUni = ContagionVaultERC20(payable(createdOrigin));
        siblingBase = ContagionVaultERC20(payable(createdBase));
        siblingUni2 = ContagionVaultERC20(payable(createdUni2));
    }

    // -- helpers (mirrored from ContagionVaultIntegrationTest) ----------------

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

    function _executeCallback(uint256 i) internal {
        (uint256 chainId, address recipient,, bytes memory payload) = system.callbackRequests(i);
        address proxy = chainId == BASE ? address(BASE_PROXY) : address(UNI_PROXY);
        LocalCallbackProxy(payable(proxy)).executeCallback(recipient, payload, address(watcher));
    }

    function _tripOrigin() internal {
        vm.prank(owner);
        originUni.emergencyPause(REASON);
        assertTrue(originUni.paused());
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

    function _confirmPaused(ContagionVaultERC20 vault, uint256 chainId) internal {
        _reactAsSystem(_log(ContagionTopics.PAUSED_TOPIC, 0, abi.encode(address(vault)), 1, address(vault), chainId));
    }

    function _deposit(ContagionVaultERC20 vault, uint256 amount) internal {
        vm.prank(alice);
        usdc.approve(address(vault), amount);
        vm.prank(alice);
        vault.deposit(amount, alice);
    }

    // -- full loop (ERC-20) ----------------------------------------------------

    function testFullLoopERC20WithdrawStaysOpen() public {
        // A non-owner user deposits USDC into both siblings.
        _deposit(siblingBase, 100 * ONE_USDC);
        _deposit(siblingUni2, 100 * ONE_USDC);
        assertEq(siblingBase.totalAssets(), 100 * ONE_USDC);
        assertEq(siblingBase.decimalsOffset(), 12);
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

        _executeCallback(0);
        _executeCallback(1);
        assertTrue(siblingBase.paused());
        assertTrue(siblingUni2.paused());

        _confirmPaused(siblingBase, BASE);
        _confirmPaused(siblingUni2, UNI);
        assertTrue(watcher.isPaused(BASE, address(siblingBase)));
        assertTrue(watcher.isPaused(UNI, address(siblingUni2)));
        assertTrue(watcher.isConfirmed(BASE, address(siblingBase)));
        (,, bool active) = watcher.incident(address(originUni));
        assertFalse(active);

        // USDC deposits into the frozen siblings revert (no tokens move)...
        vm.prank(alice);
        usdc.approve(address(siblingBase), 10 * ONE_USDC);
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        siblingBase.deposit(10 * ONE_USDC, alice);
        vm.prank(alice);
        usdc.approve(address(siblingUni2), 10 * ONE_USDC);
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        siblingUni2.deposit(10 * ONE_USDC, alice);

        // ...but USDC withdrawals stay OPEN while paused.
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        siblingBase.withdraw(50 * ONE_USDC, alice);
        assertEq(usdc.balanceOf(alice) - balBefore, 50 * ONE_USDC);
        assertEq(siblingBase.totalAssets(), 50 * ONE_USDC);
        assertGt(siblingBase.balanceOf(alice), 0);

        // Owner reopens; deposits work again.
        vm.prank(owner);
        siblingBase.unpause();
        assertFalse(siblingBase.paused());
        _deposit(siblingBase, 10 * ONE_USDC);
        assertEq(siblingBase.totalAssets(), 60 * ONE_USDC);
    }

    function testRetryERC20OnlyUnconfirmedSibling() public {
        _tripOrigin();
        assertEq(system.callbackRequestCount(), 2);

        (uint256 c0, address r0,,) = system.callbackRequests(0);
        (uint256 c1, address r1,,) = system.callbackRequests(1);
        uint256 baseIdx = (c0 == BASE) ? 0 : 1;
        uint256 uniIdx = 1 - baseIdx;
        assertEq((c0 == BASE) ? r0 : r1, address(siblingBase));
        assertEq((c0 == BASE) ? r1 : r0, address(siblingUni2));

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
        _confirmPaused(siblingBase, BASE);
        (,, bool active) = watcher.incident(address(originUni));
        assertFalse(active);
    }

    function testFallThroughERC20UnregisteredVaultIgnored() public {
        // An ERC-20 vault created by the same factory but NOT registered in
        // the watcher trips: the watcher must ignore it (no fan-out).
        ContagionVaultERC20 implUni = new ContagionVaultERC20(UNI_PROXY);
        VaultFactoryERC20 factoryUni = new VaultFactoryERC20(address(implUni));
        address stray = factoryUni.createVault(
            owner, address(watcher), address(usdc), "Stray Share", "STRAY", 0
        );
        ContagionVaultERC20 strayVault = ContagionVaultERC20(payable(stray));
        vm.prank(owner);
        strayVault.emergencyPause(bytes32("STRAY-1"));
        assertTrue(strayVault.paused());

        _reactAsSystem(
            _log(
                ContagionTopics.EMERGENCY_PAUSED_TOPIC,
                uint256(uint160(address(strayVault))),
                abi.encode(bytes32("STRAY-1")),
                2,
                address(strayVault),
                UNI
            )
        );
        assertEq(system.callbackRequestCount(), 0);
        assertFalse(siblingBase.paused());
        assertFalse(siblingUni2.paused());
    }
}
