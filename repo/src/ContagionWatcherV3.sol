// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AbstractReactive} from "@reactive/src/base/AbstractReactive.sol";
import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {ContagionTopics} from "./ContagionTopics.sol";

/// @title ContagionWatcherV3 — cross-chain circuit breaker (Lasna reactive contract)
/// @notice V3 = `ContagionWatcher` + ONE change (audit pass 2, finding N1
/// [Medium], 15 Nov 2026): an AGGREGATE incident cap. The per-vault
/// 60 s trip cooldown (F4) only SLOWS aggregate drain — rotating trips
/// across the five public vaults still drained the v2 watcher
/// (1.77 lREACT) in ~12-13 trips, about 3-4 minutes. This watcher
/// counts NEW incidents in a rolling 1-hour window and refuses fan-out
/// past 5 per hour: a capped trip emits `IncidentCapHit` and requests NO
/// callbacks. Worst-case spend is then ~5 loops/hour (~0.75 lREACT/hour
/// for the 5-vault set) instead of the whole balance in minutes.
///
/// Cap semantics (deliberately narrow):
///  - Only NEW incidents count. A re-emit while the incident is active
///    is a retry, never a new incident — retries are uncapped, so a
///    genuine incident can still reach CONTAINED.
///  - A capped trip is DROPPED, not queued (finding N5: there is no
///    queue/replay anywhere in this system). The tripping vault paused
///    ITSELF via `trip()`; only the fan-out to siblings is skipped. To
///    contain after the window resets, re-trip the origin (a new
///    incident), or have the vault owners `emergencyPause` each sibling
///    directly.
///  - The window is rolling wall-clock (`block.timestamp`, never
///    `block.number`): it resets 1 hour after it started, not on a
///    calendar boundary.
///  - `react()` NEVER reverts as a filter — a capped trip falls through
///    silently after emitting `IncidentCapHit`, exactly like an
///    unregistered emitter.
///
/// Everything else is identical to `ContagionWatcher` (see its docs for
/// the safety properties, the pause/deviation notes, and the callback
/// model). The cap constants are public so the frontend and the Docs can
/// read them instead of hardcoding the numbers.
///
/// Fan-out note (prebuild research #8, still open): the maximum number
/// of callbacks per `react()` is UNVERIFIED in the docs ("several
/// callbacks" is the only wording). Fan-out 4 was measured live on the
/// v2 public set (4-vault loop, 15 Nov 2026, ~0.128 lREACT); the v3 set
/// fans out to 4 siblings per trip (5 vaults total) — the live v3 trip
/// test in the deploy log is the verification for fan-out 4. Do NOT
/// extend the design beyond 5 siblings without verifying/measuring first.
contract ContagionWatcherV3 is AbstractReactive {
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
    /// @notice Emitted when a NEW incident arrives while the rolling
    /// aggregate cap is exhausted: the trip is dropped (no incident
    /// recorded, no callbacks requested). The origin vault paused itself
    /// via `trip()`; only the fan-out is skipped.
    event IncidentCapHit(address indexed origin, uint256 indexed chainId, bytes32 reason, uint256 at);

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

    /// @notice Aggregate cap (N1): at most this many NEW incidents per
    /// rolling `CAP_WINDOW`. Retries never count.
    uint256 public constant MAX_NEW_INCIDENTS_PER_WINDOW = 5;
    /// @notice Rolling window for the aggregate incident cap (wall-clock).
    uint256 public constant CAP_WINDOW = 1 hours;

    /// @notice Start of the current cap window (0 = never started; the
    /// constructor sets it to deployment time).
    uint256 public capWindowStart;
    /// @notice New incidents counted in the current cap window.
    uint256 public capWindowCount;

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
        capWindowStart = block.timestamp;
        // Bounded loop (<= 5 siblings in the v3 public set); _register calls the trusted Lasna
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
            // N1 aggregate cap: a new incident counts against the rolling
            // window; past the cap the trip is DROPPED (event only, no
            // incident record, no fan-out). Retries (isNew == false) never
            // reach this branch, so a genuine incident can still contain.
            if (capWindowStart == 0 || block.timestamp >= capWindowStart + CAP_WINDOW) {
                capWindowStart = block.timestamp;
                capWindowCount = 0;
            }
            if (capWindowCount >= MAX_NEW_INCIDENTS_PER_WINDOW) {
                emit IncidentCapHit(origin, originChain, reason, block.timestamp);
                return;
            }
            capWindowCount++;
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
    /// (<= 5 registered siblings in the v3 public set); each iteration calls the trusted
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
