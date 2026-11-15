# VERIFICATION.md — ContagionStop testnet loop verification

> All evidence below is on-chain and independently checkable on the public
> explorers. No number here is a local simulation — every hash, block, and
> timestamp was read from Base Sepolia, Unichain Sepolia, or Lasna.
> Verified 14–15 Nov 2026. Full working log: `deploy-log.md`.

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
- Keterbatasan yang diketahui (main set v1 + vault v2 utama, bytecode per
  14–15 Nov 2026): bila dua vault trip berurutan sebelum incident pertama
  mencapai CONTAINED, konfirmasi Paused dari vault yang sudah paused tidak
  ter-emit, sehingga incident dapat tersangkut aktif sampai ada intervensi
  manual (unpause + emergencyPause ulang). Prosedur operator: jangan trip
  origin kedua sebelum incident pertama berstatus CONTAINED. Perbaikan
  sudah ada di kode repo (SiblingVault.pause() meng-emit ulang Paused) dan
  live di instance publik baru. Catatan F6: registerSibling tidak memeriksa
  code di chain tujuan (tidak mungkin dari Lasna) — verifikasi dilakukan
  off-chain (checklist app + cast code di chain tujuan sebelum register).

## Vaults v2 — ERC-20 shares (ETH + USDC), 15 Nov 2026

The v2 ETH vaults ran a full loop end to end (trip → react → callback
pause → containment, ~1 s trip-to-callback; withdraw while paused
succeeds). The loop hashes for the ETH and USDC vaults are in the tables
below.

### E2E v2 — full loop (ETH), 15 Nov 2026

Reason `E2E-V2-001` = `0x5d31a96e8be5c1b1e4625bee9a14989a9aa97aa70aaaec785d5d06b90768da7a`.
Trip by the deployer on the Unichain origin vault; deposit and withdraw
by a non-owner throwaway wallet.

| Leg | Tx | Block | Gas |
|---|---|---|---|
| Trip `emergencyPause` (origin, Unichain) | `0x7c84025e613083831745d675b88d6bf3c01aeddf207bbe4ea6c0e748f24d40f2` | 67871519 | 32,649 |
| `react()` (Lasna, fan-out 1) | `0x61fc8e180d845c11d95f0e3c75f51bc3220e3212e28a67e94cace846ab2eed35` | 8387722 | 325,228 |
| Callback `pause()` (Base sibling) | `0xa9325ee9b97ba5d340794f81c69ca39ad6e142d6761baff04f012b99170e6ab6` | 59010397 | 80,932 |
| Containment `react()` | `0xb1b47ff1a3be386d7eddb47408d15847d2c8316011407f6ce6322aee7deb7b7d` | 8387723 | 170,847 |
| Deposit 0.002 ETH to Base vault, paused — **reverted** (`EnforcedPause`) | `0xdf197f3180d27af98c43767a731ff7a363eabe9197c2b34e393f2c8de925df13` | 59010730 | 26,179 |
| Withdraw 0.001 ETH from Base vault, paused — **succeeded** | `0x12e0b97eec542e250f07284148a9803d2a4b07e6171f8c352f4f3d0ce419d6ad` | 59011012 | 74,988 |

Loop: trip → callback pause ~1 s; containment in the next Lasna block.
Loop cost 0.0793974 lREACT; callback fee 0.0000006281352 ETH (paid from
the vault balance, proxy debt 0). Final state: both vaults `paused() =
false`, `totalAssets` 0.003 ETH each, incident `active = false`
(CONTAINED).

### Contracts (Sourcify `exact_match`, creation + runtime)

| Contract | Chain | Address |
|---|---|---|
| `ContagionWatcher` v2 | Lasna (5318007) | `0xF5ad04cBbA9458b634a4cfc8668FCC2A254C7D4B` |
| `ContagionVault` v2 — origin (ETH) | Unichain Sepolia (1301) | `0xEe9a24C80460069877e9b9F28143ee4D138Cf5d8` |
| `ContagionVault` v2 — sibling (ETH) | Base Sepolia (84532) | `0xB86060EE2332BD6b3DC9310E88371AE8cA1382b0` |
| `ContagionVaultERC20` — USDC vault | Unichain Sepolia (1301) | `0xb1404336db799285787bfb8a61f91e2d93e1bbdd` |
| `ContagionVaultERC20` — USDC vault | Base Sepolia (84532) | `0xd476AFBE349FB7b07110dda8E167095B2A3cee39` |
| `VaultFactory` (ETH) | Unichain Sepolia (1301) | `0x8c48B129a6Fd000e43448830Df6834b0a5BAe7A3` |
| `VaultFactory` (ETH) | Base Sepolia (84532) | `0xE7bd21cB41c0475650069A19b6207a48cAe0F9E6` |
| `VaultFactoryERC20` (USDC) | Unichain Sepolia (1301) | `0xe7c4A7Cc927a2afd332B07A7f73A50EFd036F032` |
| `VaultFactoryERC20` (USDC) | Base Sepolia (84532) | `0xE16b002789590e1a8aFD3a4cE119d16b49ABDe77` |
| `ContagionVault` implementation (ETH) | Unichain Sepolia (1301) | `0xE732a6e1D7F70Dc9502f9e4eDEb026451d911661` |
| `ContagionVault` implementation (ETH) | Base Sepolia (84532) | `0x8809f72C2ce8Af6081D6540Ea7f1C3269F155968` |
| `ContagionVaultERC20` implementation (USDC) | Unichain Sepolia (1301) | `0xb50ABF8959097f7c8Da476671e97f6F30d781daA` |
| `ContagionVaultERC20` implementation (USDC) | Base Sepolia (84532) | `0xB394E38c8aeb4d8ea1244faE0c229e05089A7edD` |

Deployer (testnet-only): `0x0FD65c51D9bD790Bf67FDA9BE45A7eB21ed3d99B`.
Watcher v2 owner is the deployer. Implementation owners are `0x0`
(renounced). The clones are canonical EIP-1167 minimal proxies of the
verified implementations.

### Deploy transactions (USDC)

| Tx | Gas | Status |
|---|---|---|
| Implementation Unichain `0x9ee0c94b9675f964b147429518b5a071af5af06d388d80b9285662c40d959f85` (block 67874783) | 2,304,699 | success |
| Factory Unichain `0x5befd17f2e27d895e418841a7db98045022402f4d9c8968d01a587f8dadfadae` (block 67874783) | 533,039 | success |
| Implementation Base `0x3e8fe2d69f5c132ae58464a0f18aac96619500c87657953f03d0184e028a5f1f` (block 59026768) | 2,304,699 | success |
| Factory Base `0x68a1b8dfa32b4507aa944fca9d3b5dd37b3a5c262ac7e0edf51598738e668e51` (block 59026768) | 533,039 | success |
| createVault Unichain `0xcf998b6a32f9073df965482cea587d4b2bea51d74354675b76c5bbfc8ef06523` (block 67874904) | 299,140 | success |
| createVault Base `0x61cc48b75ac5eecf643d916aa0e88c90a50c4b09aa2e20683e297ae3481de704` (block 59027438) | 299,140 | success |
| registerSibling Unichain vault `0x5e0155f1dfdd8f913b3c8e7c75a29fab11f68fa0f91a0b96cc6c42a6d98575e0` (Lasna block 8390928) | 99,688 | success |
| registerSibling Base vault `0x672e9e145a4659b5a464efca94f6f6c088d2294c9174f72be1312910ea035e5e` (Lasna block 8390934) | 99,700 | success |

Predicted CREATE2 addresses matched the created clones exactly on both
chains (`created == predicted`, checked in the deploy script and by an
on-chain `predictVault(creator, owner, 0)` re-read for Unichain).

### Read verification (both USDC vaults, after registration)

- `watcher()` is watcher v2 `0xF5ad04cB…`; `asset()` is the chain's USDC
  (Unichain `0x31d02204…`, Base `0x036CbD53…`); `paused()` is false.
- At registration, before funding, `totalAssets()` was 0, USDC balance
  was 0, and ETH balance was 0. Funding state after 15 Nov 2026 is in
  "Funding status" below.
- `owner()` is the deployer; `name()` is "ContagionStop USDC Vault
  Share", `symbol()` is "CSUSDC"; `minDeposit()` is 1,000,000 (1 USDC);
  `decimalsOffset()` is 12.
- Watcher v2: `registeredSibling(1301, vaultUnichain)` and
  `registeredSibling(84532, vaultBase)` are both true;
  `siblings(1301)` lists the ETH v2 vault then the USDC vault, and
  `siblings(84532)` the same on Base.

### Funding status — USDC vaults funded (15 Nov 2026)

Both USDC vaults hold **20 USDC each** (`totalAssets` 20,000,000, USDC
balance 20,000,000, 20e18 shares held by the deployer), funded 15 Nov
2026 via `deposit()` after `approve` on USDC — a plain transfer does not
update the `totalAssets` ledger. Unichain approve
`0x33758ae9b5ef0b9ad3c8c3d626164cbbbd2d1e5d9a4dfd9755c00a32536566d8`
(block 67877062), deposit
`0x58f656994811d0afb3d52a9d8f2671ac2c9ef70548f83cd42df1cd108fbb9cf8`
(block 67877108); Base approve
`0x69692962c5aae4cdf3a25cc3e98ea2e0ef96a1e339d388ada7c65c827ed47b04`
(block 59038146), deposit
`0x5c02fc0f66e7fcd2ee18f29534e97adde3558379f702d134ddecf496d1495403`
(block 59038153). Each vault also holds **0.001 ETH** as a callback-fee
buffer (Unichain
`0xcddbeddada387f2f9a93e8cb751cc305f4840116dd4079b7b8489cbd4f0372e5`,
block 67877153; Base
`0xfed30e4b162cfb7cadae2895d0a7977785be091c6888cc7357d9ee99a4304a80`,
block 59038568). The buffer works as designed: after two full loops the
proxy debt on every vault is 0 and no manual `coverDebt()` was needed —
callback fees were paid from the vaults' ETH balances (~0.00000016 ETH
on Unichain, ~0.00000063 ETH on Base per callback). A post-loop deposit
of 1 USDC and withdraw of 1 USDC both succeeded (deposit
`0x02e471f6e9bf6bb41d99789cd16de7f9ec1974b61d216a4587730faaa52cd841`,
block 67877854; withdraw
`0x5469fd1cb85e576fa48ecc35a982e18c40cb25e6c29b4dda3ff30bc19c867f79`,
block 67877875), returning `totalAssets` to 20,000,000.

### Full loop E2E-USDC-01 — origin ETH vault, 15 Nov 2026

Trip on the Unichain ETH v2 vault (reason `E2E-USDC-01`); one `react()`
fanned out to **3** destinations — fan-out 3, proven on-chain.

| Leg | Tx | Block | Gas |
|---|---|---|---|
| Trip `emergencyPause` (Unichain) | `0xf836639b43ac9befb4fb6cb231632f24cee4038ccabfce5328a21511358053eb` | 67877324 | — |
| `react()` (Lasna, 3× `PauseRequested`) | `0xf55bf6eac0cd5ef220c19850800e903f520715a64870ad0d099724190e39af22` | 8393170 | 222,610 |
| Callback `pause()` (USDC vault, Unichain) | `0x93182e78bd4a8f8aedcf8dd4596087325cfc926cd568b77558ce28cb34f16805` | 67877326 | — |
| Callback `pause()` (ETH vault, Base) | `0x7d2dd9663c919178f7d3f336fd413298eba8b86a80005b63ff5d5dff1000c814` | 59039425 | — |
| Callback `pause()` (USDC vault, Base) | `0x8f1537c483faa35785916bef4dd1ac588155e9492f28fd0c1e05e75a5998ae0d` | 59039428 | — |

Containment ~2–3 s after the trip (all four vaults paused; confirmation
polled at t+16 s). Loop cost 0.105642 lREACT (watcher v2 0.4206026 →
0.3149606). Reopen after the loop: Unichain USDC vault
`0xee224600d4a28fff8343bc0925db18d0b90aa335c25f19215ed59a53bcbc1759`,
Base USDC vault
`0xbd33784c542d4cc8c82f8a7fe73524493e0c50130a0a6f4bb6a356899dbb59b4`,
Unichain ETH vault
`0x3cb33d1db45783a11360ce18619c5c148a8d5ab411d96155af456c8befb0e19d`,
Base ETH vault
`0x56c109a6d11836f2f5bc19651f41366bcc16db9c2d34db50775a6c58ad002329` —
all `paused() = false`.

### Full loop E2E-USDC-02 — origin USDC vault, 15 Nov 2026

Trip on the Unichain USDC vault (reason `E2E-USDC-02`) — the watcher
reacts to `EmergencyPaused` from a USDC vault exactly as from an ETH
vault.

| Leg | Tx | Block | Gas |
|---|---|---|---|
| Trip `emergencyPause` (Unichain) | `0xfe37a2ee5f674c38db96e29764ac89be10e8707a7d6bab5b70b72fa7e7d1a0dd` | 67877922 | — |
| `react()` (Lasna, 3× `PauseRequested`) | `0xe2d4c87d54eb0ae6cd48914e79069b8b1aefbf32072062e3191a8e7095462a14` | 8393733 | — |
| Callback `pause()` (ETH vault, Unichain) | `0xe29e058300cdb3807f554ba5588a86999e424f67c54c08b9111087997b92ab17` | 67877924 | — |
| Callback `pause()` (ETH vault, Base) | `0x4003fc79e76c3df4c20193a4c981eb2386bbec2e9f7f6aa894b747e1ac481064` | 59042413 | — |
| Callback `pause()` (USDC vault, Base) | `0x7406bc5bdc29640735959c2b29ca55ca12e587d8f16dc595afd00cb3e0266d29` | 59042415 | — |

Containment 8 s after the trip. Loop cost 0.1210131 lREACT (watcher v2
0.3149606 → 0.1939475). Proxy debt 0 on all four vaults after the loop.
Reopen after the loop: Unichain USDC vault
`0x1cd0fc157adeab6c866c49449543a200184e04b3f512835cfe3822d69ec8ffdb`,
Base USDC vault
`0x9e3fe698a9fbbd192e07bfcc0a979b8dcf5bbe8975a7f7ac3572df4d0493fbe5`,
Unichain ETH vault
`0x41f536edaa1f6dcbdb3009da2ebef5de370fa94308c6a80d22ebf526ebdbd7c8`,
Base ETH vault
`0x2d2e3251c69b79ed01acb7aae95256c76680c09b6559fd4239cefe20c2dd3fa6` —
all `paused() = false`. Final state (Unichain block 67878015, Base
59042882, Lasna 8393823): both USDC vaults `totalAssets` 20,000,000,
unpaused, debt 0; both ETH v2 vaults `totalAssets` 0.003 ETH, unpaused,
debt 0.

## Public test deployment v2 + fresh-wallet E2E (15 Nov 2026)

### Public v2 set (Sourcify `exact_match`)

| Contract | Chain | Address |
|---|---|---|
| `PublicVaultV2` Uni #0 (origin) | Unichain Sepolia (1301) | `0x1f14825bBCC1727C134B7396BA77A2B4C37A6535` |
| `PublicVaultV2` Uni #1 | Unichain Sepolia (1301) | `0x6297D51f2D267aA636C3A0B2C842C118CDBC09be` |
| `PublicVaultV2` Base #0 | Base Sepolia (84532) | `0x405aaB687EE6453161935cCe267d9F2D01eFa540` |
| `PublicVaultERC20` USDC (20 USDC) | Unichain Sepolia (1301) | `0xa363E9591CC85C4BDcc4F08c5e7711F5A792e043` |
| `ContagionWatcher` (public v2) | Lasna (5318007) | `0x4b44497bAD6c270462D0529FCe4E41A7e092669b` |

Set v1 was also replaced the same day (F1+F4 build) under the old watcher
`0x73f6e9989057f060801d1ab7d57f6047ff6c5557` (Lasna): U1
`0xe427b13172dc65d9218c6067fc6fd89408b47a1a`, U2
`0xCa5F695215DFE4aB6b96d6FbEAfbC79d57d3DCEe`, B
`0x589770D4F1785b0fD20fF0600727Fc4BC7781d52`. The old v1 vaults were
unregistered; the recorded cycles 1 & 2 ran on them and are kept in
README.md / Docs as recorded history.

> **Address note.** The public v2 watcher (Lasna, 5318007) shares its
> address `0x4b44497bAD6c270462D0529FCe4E41A7e092669b` with the retired v1
> vault B on Base Sepolia (84532). Addresses are per-chain — no
> collision — but the address must always be shown with its chain.

### E2E v2 publik — trip Uni #0 (PUB2-E2E1)

Trip `0xd7c4c39d385b024bfc43dc6f6425a8e7dc358ea402876e84e668de396cc84a0a`
(Unichain block 67886881) → all three ETH vaults paused, incident
`active = false` (CONTAINED). Loop cost 0.1020317 lREACT (watcher 2,0 →
1,8979683). Reopen (permissionless): Uni #0
`0x85633025d68695b342f8418d6492d4d9ab48b0a63191d1cfb0fb6b5d7f434f39`
(67886916), Uni #1
`0x2e6c001a4f9513b71dabf74194506deb885de0d858114d80ec894f2946ba1417`
(67886941), Base #0
`0xdf6e0819d2431ec1784e12503889cf21c1e4783ca92b08f85b88960451a8f327`
(59087391).

### E2E USDC publik — trip vault USDC (PUBUSDC-E2E)

Deposit 20 USDC
`0x03bd7073489a4518ec634017a8178e85e2d2050400e8d1684135e119b5290e1a`
(block 67887000; totalAssets 20.000.000). Trip
`0xd4f340b468992f6651810de8c6882486c6bd64388d39a96a2e7d54f950389b49`
(block 67887012) → all four vaults paused, incident `active = false`
(CONTAINED). Loop cost 0.1278079 lREACT (watcher 1,8979683 → 1,7701604).
Reopen USDC
`0x0899c7dca55f3ce43fd3b178feb6cc00e4485fde41df0f4c0302f612c6d79400`
(67887052); the other three reopens are in the Docs table.

### Two-trip race — F1 verification (set v1 baru)

Trip U1
`0x02ade27e58f9dedc445d15250dd5479a4e010b11f3c4a18035dc1673d3ef6648`
(block 67886611) + trip U2
`0xb1c08933920b0f7d50f3ccfe203157b2aab2f89348cf635e0b7613959971b50d`
(block 67886612) back-to-back — the second trip reached the watcher
(IncidentTripped Lasna 8401897) before the first containment. Both
incidents CONTAINED in the same Lasna transaction
`0xfe667e3e0d499f1bb0570149dd260a100e247274a13edb8c1a232a84802e4b74`
(block 8401899); `incident[U1].active = false`,
`incident[U2].active = false`, all `confirmedPaused` true.

### coverDebt with real proxy debt — F8 (scratch instance)

Trip T
`0x1ae52ec08f4b515734d32e085e6c650df432ffd96fff19f3527a420f474e23a7`
(block 67887138) left vault S with 152.606.850.000 wei debt; the next
callback was blocked and the incident stuck active. After funding S
0,001 ETH, `coverDebt()`
`0xc559af0511cf8c25778a7d057d61fbb8398cf3402debd424086966dc35cfde10`
(block 67887224) paid the debt to zero, and the retry
`0x835f7c1fcb67e7f4ee13eb54e89096fde91501560733f8e5608b4bdadb083127`
(block 67887240) paused S again — incident CONTAINED.

### Fresh-wallet E2E for Deploy your own (15 Nov 2026)

Fresh wallet `0x4c97434A42a74a42b9A3EFfa38247B0B7F124A17` (throwaway, not
the deployer) created a vault from the main ETH factory on Unichain
Sepolia. `predictVault(fresh, fresh, 1)` returned
`0xe0e566c8AAE37ab7fc33743DE46EC8ace721D5a4`; `createVault`
`0x00302761c519f27d8b233fde12ba388705110d7c0212b2eede2646a5edd1e7a2`
(block 67891567) created exactly that address. `registerSibling`
`0xb65f38260744eea454152b87326a0300541224a9c6edd656bfb1493acc064963`
(Lasna block 8406581) registered it in watcher v2. Deposit 0,001 ETH
`0xe61917e638aa8ba33bd1c57e76c32466a92ecc52bfea60beb570bb5635fd8af0`
(block 67891608): totalAssets 0,001 → 0,002 ETH, shares 1e21. Trip
`0xa18fd7e5076eba17a28d10b2647a43b3dd48afed7040a5107871a34bf17dcfac`
(block 67891623) → react
`0xac633113b81cca48c17e9738b8991fa00cba707df82feb51e41cbfc36da74dcc`
(Lasna 8406617) → containment
`0x1ec9243d0dc00a16822d1adba4dd62e94ccddd869e3a332bf7bc482d9ecda7af`
(Lasna 8406620); all five vaults paused, `incident(fresh).active =
false`, loop cost 0.1526463 lREACT (watcher v2 2,0 → 1,8473537). All five
vaults were unpaused afterwards (fresh
`0x87a85da2b0f0ec74d5a38bf96b63ec923727ed671555db2a5c023c7f271aced9`,
Uni ETH main
`0xaa8cc75597102a7183ea048b9dc7811b26d95359bd61c341b66a2ac58f2dba6a`,
Uni USDC main
`0xbdf717cab26c57fc3d3d14cf03f63c0bbad42370c6a597f91897a4ae14615e5f`,
Base ETH main
`0x7b85ca28db1ef6f1fd99f9cd77b002f20050de5a6010da33d5c9ea42e01cf55d`,
Base USDC main
`0xbb463c6bf54fc631b209cb1e45a5a4dafcb7186a2b4be63ff51211831b9ab5f0`).
The same wallet deposited 1 USDC into the public USDC vault (approve
`0xc515ccc1d3539e8a625cd3c5a7eec1a9d19f97746e4821ca44c83d0866782a81`,
deposit
`0x3c38e78c26327990451b1545e1b370a4c4bd56f1755ece9a921e21153b3c3cda`,
block 67891700; totalAssets 20 → 21 USDC, shares 1e18).

## AI assistance disclosure

AI tools were used to assist in building this project — coding, research,
and review. This is a voluntary disclosure: every contract, test, and
on-chain measurement in this document was checked against the deployed
contracts and the public explorers, and the evidence above stands on its
own. No part of the loop depends on an AI system at runtime.
