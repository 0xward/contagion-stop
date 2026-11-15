# VERIFICATION.md — ContagionStop testnet loop verification

> All evidence below is on-chain and independently checkable on the public
> explorers. No number here is a local simulation — every hash, block, and
> timestamp was read from Base Sepolia, Unichain Sepolia, or Lasna.
> Verified 14 Nov 2026. Full working log: `deploy-log.md`.

## Contracts (Sourcify `exact_match`, creation + runtime)

| Contract | Chain | Address |
|---|---|---|
| `SiblingVault` A (origin) | Unichain Sepolia (1301) | `0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5` |
| `SiblingVault` B | Base Sepolia (84532) | `0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a` |
| `SiblingVault` C | Unichain Sepolia (1301) | `0xb07a380104ac093485566cfc964540b04518b354` |
| `ContagionWatcher` | Lasna (5318007) | `0xb18a213bfa8c1888af39af100d7dd54aa376f7b5` |
| `SiblingVault` D (test-only, unregistered) | Unichain Sepolia (1301) | `0x8fB4aae500D914a1876f06FfA7f74fE9A88cEf7a` |

Deployer (testnet-only): `0x0FD65c51D9bD790Bf67FDA9BE45A7eB21ed3d99B`.
Callback proxies (official Reactive docs + on-chain code): Base Sepolia
`0x476F44b11F5C942c58f4c8E3d0300E5710743585`, Unichain Sepolia
`0x775c9B990ADe401060B78D0e98684eEf8d2466C1`.

## Scenario 1 — Full loop (PASS)

Trip `emergencyPause(keccak("EXPLOIT-001"))` on A:
`0xe9f11b6df0c2e2f8efc7929cce4aa0b7910e094c6defc18e1f59ddea427e2257`
(Unichain block 67816030, T0 = 1794668458).

| Leg | Tx | Block | Timestamp | Gas |
|---|---|---|---|---|
| `react()` (Lasna, fan-out 2 in one call) | `0x98dd6dad4b360201ebae842be7280ee0da47051dd4607b6cafac6ef73f21293a` | 8335436 | 1794668458 | 349,263 |
| Callback `pause()` B (Base) | `0xe84c258d1ebc313c7fe19f016bfa0805ba28fe93dd61811e4544627b734c506b` | 58732960 | 1794668460 | 78,314 |
| Callback `pause()` C (Unichain) | `0x60e534047a2e279cf8c3c9dcacc21d949ed396f773a6e9f82c1c8eab444e5912` | 67816033 | 1794668461 | 78,304 |
| Containment `react()` | `0xf73ce63e667c8d6223e4611d6ceed2af0425bd0b69d6e0e1222672c5f74a3d0c` | 8335438 | 1794668460 | — |

Latency: event → `react()` 0 s (same second); Base 2 s; Unichain 3 s;
**full loop 3 s**; contained after 2 s. Incident: `trippedAt` 1794668458,
`active = false`, both siblings `paused() = true`.

**Freezing proof** — `deposit()` after pause reverts on-chain (mined, status `0x0`):
B `0x47c8e697935b07f03114277ae0f526d1f52e6e10240a631bc048e889ae03db76`
(block 58733692); C
`0xe1b8c9c9b259b28a031208a585a39ed89b1ce31333aa975d53b161726ae0a499`
(block 67816462). (`cast send` refuses to broadcast a reverting tx, so these
were built with `cast mktx` and broadcast with `cast publish`.)

## Scenario 2 — Retry (PASS, with real system findings)

What we tried first did **not** fail the callback: draining B to 0 ETH and
tripping again (`EXPLOIT-002`,
`0x9f28948126ba3a025fbb1270f5e3b30e73cc56d15ae76c80fd92e6bf7e540051`)
still paused B — the callback fee became **proxy debt**
(609,846,600,000 wei, exactly the trip-1 fee). Draining reserves does not
break a callback; the system bills through debt.

The real engineered failure came on trip 3 (`EXPLOIT-003`,
`0xa9c1ed92ef8be00e84796e97284a371297827755f369db59531ddda084f3d44b`,
block 67816556; react
`0xebb8a1d3e44a1c3bf7debae8a4c3f44ddbc54147b998b5d6b98b8d9cae80ac62`):
- **B:** callback never executed while proxy debt was outstanding
  (B stayed unpaused, debt unchanged at 609,846,600,000 wei). Control
  comparison: trip 2 (balance 0, debt 0) executed; trip 3 (balance 0,
  debt > 0) did not. **Outstanding proxy debt blocks the callback.**
- **C:** still paused from trip 2 (not unpaused before trip 3). `pause()` is
  idempotent (`if (!paused()) _pause()`), so the callback was a silent
  no-op with **no `Paused` event** — no confirmation log, C stayed
  unconfirmed. (Not a revert; the guard skips the event.)

Retry (after funding B +0.02 ETH, `coverDebt()`, and unpausing C):
re-emit of the same reason
`0x68222a5a640f4d7b48ebfbf64decdba03711c4e3ac52fad3df30877efc01b1db`
(block 67817160). Retry react
`0xbd68e5d45c174a46ed7af3f9a2e23256655649972629e26d0e393ea3a3875eac`
(block 8336501) emitted 2× `PauseRequested` and **no new `IncidentTripped`**.
Both siblings confirmed in < 15 s; containment react
`0x623dcaee2f0c7a1c783ff0450322a9ddd70ce6d78808b2072bb0f3bf777915ef`
(block 8336503). `trippedAt` stayed **1794668984** (retry never overwrites
the incident). `PauseRequested` totals for incident 3: B = 2, C = 2.

**Operator lesson (honest):** a retry re-requests to *every* unconfirmed
sibling, including one that is paused-but-unconfirmed (its callback is a
no-op without an event). Before retrying: cover proxy debt, fund the
sibling, and unpause any paused-but-unconfirmed sibling first.

## Scenario 3 — Fall-through (PASS)

Vault D (`0x8fB4aae500D914a1876f06FfA7f74fE9A88cEf7a`, deploy tx
`0xb3bf2e9c34fdfafda3682e01d4535f4e2dffd7420a097f0e7c65d77f4bae7ddd`)
was **not** registered with the watcher (`registeredSibling(1301, D) =
false`). Trip on D (`EXPLOIT-004`,
`0xec7fbfeac83b13d3b57572af6d3e1b6cddec640e377b6de0a1a23e7c19e532b2`,
block 67817257) emitted `EmergencyPaused` + `Paused` and paused D — and
the watcher did nothing: `incident(D) = (0, 0x0, false)`, `incident(A)`
unchanged (CONTAINED), **zero** new watcher events in the 130+ Lasna blocks
after the trip. (The second layer, the `registeredSibling` check inside
`react()`, is covered by unit tests with a local stand-in system contract.)

## Scenario 4 — Idempotency (PASS)

All watcher events since deployment (Lasna block 8335143 → end of tests):

| Event | Count | Expected |
|---|---|---|
| `IncidentTripped` | 3 | one per incident (retry emits none) |
| `IncidentContained` | 3 | one per incident |
| `PauseRequested` | 8 = 2+2+4 | 2 per trip react + 2 for the one retry react (Base 4, Unichain 4) |
| `SiblingConfirmed` | 7 = 3+2+2 | the extra 1 in incident 1 is A's own `Paused` event (A only emits it when transitioning unpaused → paused) |

`pause()` cannot be called by an EOA: `cast call` reverts
`NotAuthorized(0x0…, proxy)` on both B (Base proxy) and C (Unichain proxy)
— only the system contract / callback proxy + watcher can call it.

## Scenario 5 — Manual unpause (PASS)

Unpause A `0x743d142a6595f9f3f2fa23a2a28c1b31f99ccd0b4b1eb382a51d000a7641717c`,
B `0x656f838552634c82c056a8d65eff2ad7adafc57482974d18cb8fad2f7171a6dc`,
C `0xe2c9c08fc140d3edc29fdf6dfeb76d6f8bc71f39235af49055dcf5edead3de9d` —
all status 1, `paused() = false` on all three. Deposits work again:
B `0x1193d9d00d847bccc0eb5ae4e1d6c3ab13c529c9118133a7a9c5476411f9eb01`,
C `0x565c270071f8777b3d47e439dcb7d4d0ec35c20e13e1ec873abf611c169a48cd`,
A `0x26b635366b69579a5e33a2dec5ad166ee651b9155719f196a74e566a8aa4472b`
(totalDeposited A 2e14, B 1e14, C 2e14). Watcher unchanged: incident(A)
still CONTAINED, incident(D) still empty, confirmations still true, **zero**
new watcher events, **zero** debt on all four sides (watcher via SYSTEM,
each sibling via its proxy).

## Funding facts (measured, not assumed)

- Watcher: 0.5 lREACT funded at deploy; first 5 reacts cost 0.197 lREACT
  (~0.03–0.045 per `react()`); topped up +1.0 lREACT
  (`0xeac56281a8528161440e72d9faf24688c0d765a91f5831b41cec3d66d5ed503f`).
  Final watcher balance 1.2437228 lREACT (~40 more reacts).
- A plain transfer to the watcher raises its **balance only** — the SYSTEM
  `reserves(address)` view stayed 0. (There is no `depositTo` in
  reactive-lib-omni v0.1.0; charging happens against the contract balance
  via `pay()`.) Reacts kept working with `reserves() == 0`, so reserves is
  not the gating metric — balance is.
- Callback fee per destination: ~0.00000061 ETH (78,314 gas), charged to the
  sibling's balance; unpaid fees become proxy debt, and outstanding debt
  blocks further callbacks to that sibling until `coverDebt()`.
- Final balances: deployer Base 0.41719310 ETH, Unichain 0.03209859 ETH,
  Lasna 10.2972278 lREACT; A 0.02045 ETH, B 0.02009878 ETH,
  C 0.00044940 ETH, D 0.

## Known honest limitations

- Latency is measured in 1-second block timestamps; cross-chain clocks can
  differ by ±1 s.
- The 3 s full loop fans out to **2 chains** with 2 confirmations. Per
  destination the pause lands in 2 s (Base Sepolia) and 3 s (Unichain
  Sepolia) — the fan-out, not a single chain, sets the total.
- The retry path needs operator preconditions (debt covered, sibling
  funded, paused-but-unconfirmed sibling unpaused first) — see Scenario 2.
