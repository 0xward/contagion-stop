// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AbstractReactive} from "@reactive/src/base/AbstractReactive.sol";
import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {ContagionTopics} from "./ContagionTopics.sol";

/// @title ContagionWatcher — cross-chain circuit breaker (Lasna reactive contract)
/// @notice Subscribes to `EmergencyPaused` / `Paused` from every registered
/// sibling vault (Unichain Sepolia + Base Sepolia). When one deployment
/// trips its emergency brake, the watcher requests a `pause()` callback to
/// EVERY other sibling in the same incident — one react() fans out to N
/// callbacks, no human in the loop, no oracle, no keeper, no AI. The
/// trigger is the protocol's own on-chain event, so the decision is fully
/// deterministic.
///
/// Safety properties:
///  - Only logs from registered (chainId, sibling) pairs are acted on.
///    Anything else falls through silently — `react()` NEVER reverts as a
///    filter (a revert would still be charged in full).
///  - `unpause()` is intentionally NOT automated anywhere in this system:
///    reopening a frozen deployment is a manual owner decision on each
///    SiblingVault. Auto-unpause would let an attacker re-open a deployment
///    the team just froze.
///  - Retry is per-destination: a re-emitted `EmergencyPaused` for the same
///    incident only re-requests callbacks to siblings that have NOT
///    confirmed (`Paused`) yet. A sibling that already confirmed is never
///    spammed with duplicate callbacks.
///  - All timers use `block.timestamp`, never `block.number` (Base Sepolia
///    produces 200 ms blocks since Denim — block-based timers would run
///    ~10x too fast there).
///
/// DEVIATION (forced by reactive-lib-omni v0.1.0, same as WillVault):
/// the library ships NO `AbstractPausableReactive`, so `pause()` /
/// `resume()` are implemented locally here (owner-only flag; a paused
/// watcher lets `react()` fall through without doing anything).
///
/// OPEN ITEM (prebuild research #8): the maximum number of callbacks per
/// `react()` is UNVERIFIED in the docs ("several callbacks" is the only
/// wording). Fan-out 2 (this design) is not blocked by it — do NOT extend
/// the design to 5+ chains without verifying/measuring first.
contract ContagionWatcher is AbstractReactive {
    error NotOwner();
    error ZeroAddress();
    error LengthMismatch();
    error EmptySiblings();
    error AlreadyRegistered(uint256 chainId_, address sibling_);
    error NotRegistered(uint256 chainId_, address sibling_);

    /// @notice Emitted when a registered origin trips (new incident).
    event IncidentTripped(address indexed origin, uint256 indexed chainId, bytes32 reason, uint256 trippedAt);
    /// @notice Emitted for every `pause()` callback requested.
    event PauseRequested(uint256 indexed chainId, address indexed sibling, address indexed origin);
    /// @notice Emitted when a sibling confirms it is paused.
    event SiblingConfirmed(uint256 indexed chainId, address indexed sibling);
    event IncidentContained(address indexed origin);
    event SiblingRegistered(uint256 indexed chainId, address indexed sibling);
    event SiblingUnregistered(uint256 indexed chainId, address indexed sibling);
    event WatcherPaused(address indexed by);
    event WatcherResumed(address indexed by);
    event IncidentCleared(address indexed origin);

    struct Incident {
        uint256 trippedAt;
        bytes32 reason;
        bool active;
    }

    /// @notice On-chain latency evidence for one incident: WHEN the trip
    /// was seen (watcher time), and WHERE it happened (origin block +
    /// tx hash, copied from the LogRecord). Set once per NEW incident;
    /// a retry never overwrites it, so the first trip stays measurable.
    struct IncidentTiming {
        uint256 trippedAt;
        uint256 trippedBlock;
        uint256 trippedTxHash;
    }

    /// @notice On-chain latency evidence for one confirmation: WHEN this
    /// watcher saw the sibling's `Paused` log (watcher time) and the
    /// origin-chain tx hash that paused it. First confirmation wins:
    /// a duplicate `Paused` never overwrites the first timing.
    /// Latency of one leg = confirmedAt - incidentTiming[origin].trippedAt.
    struct ConfirmationTiming {
        uint256 confirmedAt;
        uint256 confirmedTxHash;
    }

    address public immutable owner;

    /// @notice Registered siblings per chain (the allowlist of emitters).
    mapping(uint256 => address[]) internal _siblingsByChain;
    mapping(uint256 => mapping(address => bool)) public registeredSibling;
    uint256[] internal _registeredChainIds;
    mapping(uint256 => bool) internal _chainSeen;
    /// @notice Total registered (chainId, sibling) pairs. Guards the
    /// containment check against the vacuous "all zero siblings confirmed"
    /// case after every sibling was unregistered.
    uint256 internal _registeredCount;

    /// @notice One incident record per origin address. A new incident is a
    /// trip from an origin with NO active incident (design §3.5 step 3 /
    /// §4 P6). A re-emit while the incident is active is a RETRY, never a
    /// new incident — `trippedAt` / `reason` are never overwritten by a
    /// retry, whatever reason code the re-emit carries.
    mapping(address => Incident) public incident;
    /// @notice Origins that have ever tripped, in first-trip order. Used
    /// to deactivate every still-active incident once containment is
    /// reached (design §3.5 step 4: "every incident that is still active"
    /// becomes CONTAINED). The watcher keeps no other incident index.
    address[] internal _incidentOrigins;
    mapping(address => bool) internal _originSeen;
    /// @notice Per-origin trip timing (see IncidentTiming). Read with
    /// `incidentTiming(origin)` -> (trippedAt, trippedBlock, trippedTxHash).
    mapping(address => IncidentTiming) public incidentTiming;
    /// @notice Per-(chain, sibling) pause confirmation, from `Paused` logs.
    /// Reset on every new incident.
    mapping(uint256 => mapping(address => bool)) public confirmedPaused;
    /// @notice Per-(chain, sibling) confirmation timing (see
    /// ConfirmationTiming). Read with `confirmationTiming(chainId, sibling)`
    /// -> (confirmedAt, confirmedTxHash).
    mapping(uint256 => mapping(address => ConfirmationTiming)) public confirmationTiming;

    bool public paused;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @param chainIds_ Parallel to `siblings_`: chain of each sibling.
    /// @param siblings_ Sibling vault addresses (each is BOTH a possible
    /// origin that can trip AND a destination that can be paused).
    constructor(uint256[] memory chainIds_, address[] memory siblings_) payable {
        if (chainIds_.length != siblings_.length) revert LengthMismatch();
        if (chainIds_.length == 0) revert EmptySiblings();
        owner = msg.sender;
        // Bounded loop (<= 3 siblings); _register calls the trusted Lasna
        // system contract (subscribe) — the forge `calls-loop` lint on
        // that call is benign by design, not silenced.
        for (uint256 i = 0; i < chainIds_.length; i++) {
            _register(chainIds_[i], siblings_[i]);
        }
    }

    /// @inheritdoc IReactive
    function react(IReactive.LogRecord calldata log_) external onlySystem {
        if (paused) return;
        // (a) Ignore logs from unregistered emitters — fall through, never
        // revert as a filter.
        if (!registeredSibling[log_.chainId][log_.contractAddress]) return;

        if (log_.topic0 == ContagionTopics.EMERGENCY_PAUSED_TOPIC) {
            _onEmergencyPaused(log_);
        } else if (log_.topic0 == ContagionTopics.PAUSED_TOPIC) {
            _onPaused(log_);
        }
        // Unknown topic: fall through, never revert as a filter.
    }

    function _onEmergencyPaused(IReactive.LogRecord calldata log_) internal {
        // EmergencyPaused(address,bytes32): indexed protocol is topic1,
        // reason is the single non-indexed arg -> LOG2, opCode == 2.
        if (log_.opCode != 2) return;
        // Defensive: the emitted `protocol` (topic1) must be the emitter
        // itself (design §3.5 step 3). A log whose topic1 disagrees with
        // its contract address is malformed — fall through, never act on it.
        if (log_.topic1 != uint256(uint160(log_.contractAddress))) return;
        bytes32 reason = abi.decode(log_.data, (bytes32));
        address origin = log_.contractAddress;
        uint256 originChain = log_.chainId;

        Incident storage inc = incident[origin];
        // Design §3.5 step 3 + §4 P5/P6: ONLY the active flag decides.
        // A re-emit while the incident is active is a RETRY — whatever
        // reason code it carries, it never overwrites trippedAt/reason.
        bool isNew = !inc.active;

        if (isNew) {
            // (b) New incident: record it, reset ALL confirmations for this
            // incident, mark the origin itself confirmed (it paused itself),
            // and request pause() to every sibling EXCEPT the origin.
            incident[origin] = Incident({trippedAt: block.timestamp, reason: reason, active: true});
            if (!_originSeen[origin]) {
                _originSeen[origin] = true;
                _incidentOrigins.push(origin);
            }
            // Latency evidence: first trip only — retries never overwrite.
            incidentTiming[origin] = IncidentTiming({
                trippedAt: block.timestamp, trippedBlock: log_.blockNumber, trippedTxHash: log_.txHash
            });
            _resetConfirmations();
            confirmedPaused[originChain][origin] = true;
            // The origin confirmed itself by tripping: its confirmation
            // timing is the trip itself (leg latency 0 by definition).
            confirmationTiming[originChain][origin] =
                ConfirmationTiming({confirmedAt: block.timestamp, confirmedTxHash: log_.txHash});
            emit IncidentTripped(origin, originChain, reason, block.timestamp);
            _requestPauseToAllExcept(originChain, origin);
        } else {
            // Retry for the same incident: only destinations that have NOT
            // confirmed yet. Confirmed siblings are never re-spammed.
            _requestPauseToUnconfirmed(originChain, origin);
        }
    }

    function _onPaused(IReactive.LogRecord calldata log_) internal {
        // Paused(address): NO indexed param (OZ Pausable) — the account is
        // the single non-indexed arg in data -> LOG1, opCode == 1.
        if (log_.opCode != 1) return;
        // First confirmation wins: a duplicate Paused never overwrites the
        // first timing, so the measured leg latency stays honest.
        if (!confirmedPaused[log_.chainId][log_.contractAddress]) {
            confirmedPaused[log_.chainId][log_.contractAddress] = true;
            confirmationTiming[log_.chainId][log_.contractAddress] =
                ConfirmationTiming({confirmedAt: block.timestamp, confirmedTxHash: log_.txHash});
        }
        emit SiblingConfirmed(log_.chainId, log_.contractAddress);
        // Design §3.5 step 4: once EVERY registered sibling has confirmed,
        // every still-active incident becomes CONTAINED (active = false).
        if (_allConfirmed()) _containAll();
    }

    /// @notice True only if at least one sibling is registered AND every
    /// registered sibling has confirmed paused in the current round.
    function _allConfirmed() internal view returns (bool) {
        if (_registeredCount == 0) return false;
        uint256 chainCount = _registeredChainIds.length;
        for (uint256 i = 0; i < chainCount; i++) {
            uint256 chainId = _registeredChainIds[i];
            address[] storage sibs = _siblingsByChain[chainId];
            for (uint256 j = 0; j < sibs.length; j++) {
                if (!confirmedPaused[chainId][sibs[j]]) return false;
            }
        }
        return true;
    }

    /// @notice Deactivate every still-active incident (CONTAINED) and emit
    /// one `IncidentContained` per incident closed. Idempotent: calling it
    /// again when nothing is active changes nothing and emits nothing.
    function _containAll() internal {
        uint256 originCount = _incidentOrigins.length;
        for (uint256 i = 0; i < originCount; i++) {
            address origin = _incidentOrigins[i];
            if (incident[origin].active) {
                incident[origin].active = false;
                emit IncidentContained(origin);
            }
        }
    }

    function _requestPauseToAllExcept(uint256 originChain_, address origin_) internal {
        uint256 chainCount = _registeredChainIds.length;
        for (uint256 i = 0; i < chainCount; i++) {
            uint256 chainId = _registeredChainIds[i];
            address[] storage sibs = _siblingsByChain[chainId];
            for (uint256 j = 0; j < sibs.length; j++) {
                address sib = sibs[j];
                if (chainId == originChain_ && sib == origin_) continue;
                _requestPause(chainId, sib, origin_);
            }
        }
    }

    /// @notice Request `pause()` on every sibling that has not confirmed
    /// paused in the current round (except the origin). Bounded loop
    /// (<= 3 registered siblings); each iteration calls the trusted
    /// Lasna system contract via _requestPause — the forge `calls-loop`
    /// lint on that call is benign by design, not silenced.
    function _requestPauseToUnconfirmed(uint256 originChain_, address origin_) internal {
        uint256 chainCount = _registeredChainIds.length;
        for (uint256 i = 0; i < chainCount; i++) {
            uint256 chainId = _registeredChainIds[i];
            address[] storage sibs = _siblingsByChain[chainId];
            for (uint256 j = 0; j < sibs.length; j++) {
                address sib = sibs[j];
                if (chainId == originChain_ && sib == origin_) continue;
                if (confirmedPaused[chainId][sib]) continue;
                _requestPause(chainId, sib, origin_);
            }
        }
    }

    function _requestPause(uint256 chainId_, address sibling_, address origin_) internal {
        // First payload arg MUST be an address placeholder: the callback
        // proxy overwrites it with this watcher's address before forwarding.
        bytes memory payload = abi.encodeWithSignature("pause(address)", address(0));
        SYSTEM.requestCallbackV_1_0(
            ISystemContract.CallbackConfiguration_V_1_0({
                chainId: chainId_, recipient: sibling_, gasLimit: ContagionTopics.CALLBACK_GAS_LIMIT, payload: payload
            })
        );
        emit PauseRequested(chainId_, sibling_, origin_);
    }

    function _resetConfirmations() internal {
        uint256 chainCount = _registeredChainIds.length;
        for (uint256 i = 0; i < chainCount; i++) {
            uint256 chainId = _registeredChainIds[i];
            address[] storage sibs = _siblingsByChain[chainId];
            for (uint256 j = 0; j < sibs.length; j++) {
                confirmedPaused[chainId][sibs[j]] = false;
                // Clear stale timing too, so confirmationTiming always
                // belongs to the current incident, never the previous one.
                delete confirmationTiming[chainId][sibs[j]];
            }
        }
    }

    // ------------------------------------------------------------------------
    // Reads
    // ------------------------------------------------------------------------

    /// @notice True once the sibling has confirmed paused (via a `Paused`
    /// log, or as the tripping origin of the current incident).
    function isPaused(uint256 chainId_, address sibling_) external view returns (bool) {
        return confirmedPaused[chainId_][sibling_];
    }

    /// @notice Alias of the confirmation flag (same value as `isPaused`).
    function isConfirmed(uint256 chainId_, address sibling_) external view returns (bool) {
        return confirmedPaused[chainId_][sibling_];
    }

    /// @notice All registered sibling addresses on a chain.
    function siblings(uint256 chainId_) external view returns (address[] memory) {
        return _siblingsByChain[chainId_];
    }

    /// @notice All chain IDs that have at least one sibling registered.
    function registeredChainIds() external view returns (uint256[] memory) {
        return _registeredChainIds;
    }

    // ------------------------------------------------------------------------
    // Owner / operational
    // ------------------------------------------------------------------------

    /// @notice Register a new sibling (origin + destination) and subscribe
    /// to its `EmergencyPaused` / `Paused` events.
    function registerSibling(uint256 chainId_, address sibling_) external onlyOwner {
        _register(chainId_, sibling_);
    }

    function _register(uint256 chainId_, address sibling_) internal {
        if (sibling_ == address(0)) revert ZeroAddress();
        if (registeredSibling[chainId_][sibling_]) revert AlreadyRegistered(chainId_, sibling_);
        registeredSibling[chainId_][sibling_] = true;
        _registeredCount++;
        _siblingsByChain[chainId_].push(sibling_);
        if (!_chainSeen[chainId_]) {
            _chainSeen[chainId_] = true;
            _registeredChainIds.push(chainId_);
        }
        SYSTEM.subscribe(
            chainId_,
            sibling_,
            ContagionTopics.EMERGENCY_PAUSED_TOPIC,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        SYSTEM.subscribe(
            chainId_, sibling_, ContagionTopics.PAUSED_TOPIC, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE
        );
        emit SiblingRegistered(chainId_, sibling_);
    }

    /// @notice Unregister a sibling: future logs from it are ignored.
    /// Past incident/confirmation state is left untouched.
    function unregisterSibling(uint256 chainId_, address sibling_) external onlyOwner {
        if (!registeredSibling[chainId_][sibling_]) revert NotRegistered(chainId_, sibling_);
        registeredSibling[chainId_][sibling_] = false;
        _registeredCount--;
        address[] storage sibs = _siblingsByChain[chainId_];
        for (uint256 i = 0; i < sibs.length; i++) {
            if (sibs[i] == sibling_) {
                sibs[i] = sibs[sibs.length - 1];
                sibs.pop();
                break;
            }
        }
        SYSTEM.unsubscribe(
            chainId_,
            sibling_,
            ContagionTopics.EMERGENCY_PAUSED_TOPIC,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        SYSTEM.unsubscribe(
            chainId_, sibling_, ContagionTopics.PAUSED_TOPIC, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE
        );
        emit SiblingUnregistered(chainId_, sibling_);
    }

    /// @notice Emergency pause for the watcher itself (no redeploy):
    /// `react()` falls through silently while paused.
    function pause() external onlyOwner {
        paused = true;
        emit WatcherPaused(msg.sender);
    }

    function resume() external onlyOwner {
        paused = false;
        emit WatcherResumed(msg.sender);
    }

    /// @notice Deactivate an incident record (e.g. after the protocol team
    /// has manually unpaused every deployment and closed the incident).
    /// The next trip from that origin — even with the same reason — is then
    /// treated as a NEW incident (confirmations reset, full fan-out).
    /// Without this, a re-trip with an identical reason after a manual
    /// unpause would be treated as a retry and skip already-confirmed
    /// siblings. Extension beyond the base spec, owner-only.
    function clearIncident(address origin_) external onlyOwner {
        incident[origin_].active = false;
        emit IncidentCleared(origin_);
    }

    /// @notice Pay outstanding reactive debt to the system contract from
    /// this watcher's balance. Public so anyone can rescue a silently
    /// stalled watcher (debt > 0 stops `react()` with no error).
    function coverDebt() external {
        _coverDebt();
    }
}
