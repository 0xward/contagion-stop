# DEPLOY-PLAN — ContagionStop (Rencana Deploy Saja)

> **STATUS: RENCANA SAJA — JANGAN DIJALANKAN.**
> Dokumen ini adalah rencana deploy testnet. **Jangan deploy, jangan broadcast,
> jangan klaim faucet, jangan buat akun** dari dokumen ini sampai ada perintah
> eksplisit "lanjut deploy" dari pengguna. Semua perintah di bawah memakai
> placeholder (`$PRIVATE_KEY`, `0x…`) — tidak ada private key asli di sini.
>
> Sumber kebenaran: `design.md` (§3.6, §7, §11.4) dan
> `~/workspace/reactive-omni/prebuild-blockers.md` (verdict BOLEH LANJUT, 50 item).
> Bila ada konflik angka antara dokumen ini dan `prebuild-blockers.md`, angka di
> `prebuild-blockers.md` yang menang (ia berbasis pengukuran langsung).
>
> Repo kontrak: `~/workspace/reactive-omni/contagion-stop/repo/` — sedang dibangun
> worker lain secara paralel. **Jangan ubah file repo.** Sebelum menjalankan
> langkah apa pun, cek dulu nama file script/artefak di repo (nama di bawah
> mengikuti `design.md` §11.1; bila worker kontrak menamainya berbeda, pakai
> nama repo yang sebenarnya).

---

## 0. Ringkasan topologi deploy

| # | Kontrak | Chain | Chain ID | Peran |
|---|---|---|---|---|
| A | `SiblingVault` | Unichain Sepolia (origin) | 1301 | Emitter pemicu + penerima callback |
| B | `SiblingVault` | Base Sepolia | 84532 | Penerima callback |
| C | `SiblingVault` | Unichain Sepolia | 1301 | Penerima callback |
| W | `ContagionWatcher` | Lasna | 5318007 | Otak reaktif: subscribe + fan-out |

Satu `react()` watcher → 2 callback `pause()` (ke B dan ke C). Origin A tidak
menerima callback — ia sudah mem-pause dirinya sendiri lewat `emergencyPause`.

**Alamat proxy callback (TERVERIFIKASI, jangan ganti):**

| Chain | Callback proxy |
|---|---|
| Base Sepolia | `0x476F44b11F5C942c58f4c8E3d0300E5710743585` |
| Unichain Sepolia | `0x775c9B990ADe401060B78D0e98684eEf8d2466C1` |

> ⚠️ **JANGAN pakai alamat proxy lama `0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4`**
> (materi Mei 2026, kontrak pra-Omni — masih ada code tapi bukan proxy Omni).
> Jangan pakai proxy Sepolia `0xAa14…` di Base Sepolia.

**Konstanta yang mengikat deploy ini:**

| Item | Nilai |
|---|---|
| `gasLimit` per callback `pause()` | **200.000** (150.000 TIDAK cukup — hanya ~20.000 gas diteruskan → `InsufficientGas`, fee tetap ditagih) |
| Batas gas `react()` jaringan | 900.000 |
| Dana watcher | **0,5 lREACT** (0,1 lREACT hanya ≈7 tick — TIDAK CUKUP untuk satu loop ≈0,30–0,35 lREACT) |
| Reserves tiap sibling | **0,02 ETH** chain-nya |
| Stok lREACT total | 10 lREACT (dari 0,1 ETH → faucet Lasna) |
| `evm_version` di `foundry.toml` | `cancun` (WAJIB eksplisit — Foundry 1.9.0 default `prague` untuk test) |
| Solidity | 0.8.29 · lib `reactive-lib-omni` v0.1.0 · OpenZeppelin v5 |

---

## 1. Prasyarat

### 1a. Dana testnet (ambil HARI PERTAMA build — jalur kritis)

| Kebutuhan | Jumlah | Jalur |
|---|---|---|
| ETH Base Sepolia | **±0,18** (minimum ±0,11) | **Chainlink faucet 0,5 ETH/klaim** (connect wallet + captcha; satu klaim menutup semua kebutuhan). Cadangan: Coinbase CDP 0,1 ETH/hari |
| ETH Unichain Sepolia | **±0,05** (minimum ±0,03) | Superchain 0,01–0,05/hari + thirdweb 0,01/hari (klaim sejak hari pertama; butuh 1–2 hari) |
| lREACT | **10** | Kirim **0,1 ETH Base Sepolia** ke kontrak faucet Lasna `0x2afaFD298b23b62760711756088F75B7409f5967` (kurs 1 ETH → 100 lREACT, maks 5 ETH/tx). **Uji kecil 0,01 ETH dulu** sebelum kirim 0,1 ETH. **Jangan kirim >5 ETH** — lebihnya hangus. Matikan MetaMask Smart Transactions sebelum tx faucet (per FAQ Reactive) |
| SepETH | **0** | TIDAK DIBUTUHKAN — faucet Lasna terima ETH Sepolia ATAU ETH Base Sepolia |

Rincian ContagionStop: deploy watcher ±0,12 lREACT + dana watcher 0,5 lREACT +
deploy 3 sibling + reserves 0,02 ETH/sibling + loop uji 2–3× (fan-out 2
callback/loop) + buffer retry.

> Catatan terbuka: cooldown faucet Chainlink tidak tercantum di halaman; angka
> faucet sekunder sebagian belum terverifikasi. Jangan andalkan sebelum
> terverifikasi saat klaim pertama. Akun DoraHacks **dibuat pengguna sendiri**
> (login via akun GitHub pengguna disarankan) — asisten tidak boleh membuat akun atas
> nama pengguna.

### 1b. Akun & kunci

- Satu EOA deployer yang sama di ketiga chain (memudahkan verifikasi owner).
  Kunci disimpan di env, **tidak pernah ditulis di file/repo/chat**:
  `export PRIVATE_KEY=0x…` (placeholder — isi saat deploy, dari dompet deployer).
- Akun DoraHacks: pengguna (bukan bagian deploy ini).
- Akun YouTube (upload video unlisted): pengguna, 23–24 Nov.

### 1c. RPC per chain (3 per chain + retry — RPC publik flaky)

| Chain | RPC utama (terverifikasi hidup dari VM) | Fallback |
|---|---|---|
| Base Sepolia (84532) | `https://sepolia.base.org` | OnFinality, PublicNode |
| Unichain Sepolia (1301) | `https://sepolia.unichain.org` | PublicNode |
| Lasna (5318007) | `https://lasna-rpc.rnk.dev/` | — (satu-satunya RPC Lasna yang terverifikasi) |

> ⚠️ **Skrip deploy/verifikasi WAJIB pakai `cast`/`curl`, BUKAN `urllib` Python**
> — `urllib` Python ke RPC Base/Sepolia mengembalikan HTTP 403 sementara
> `curl`/`cast` ke URL yang sama berhasil (pola flaky egress VM yang tercatat).
> URL fallback persis (OnFinality / PublicNode) diisi dari daftar RPC resmi saat
> deploy — jangan tebak URL dari ingatan.

```bash
# Env yang dipakai semua perintah di dokumen ini (isi nilai nyata saat deploy)
export PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000  # PLACEHOLDER
export RPC_BASE=https://sepolia.base.org
export RPC_UNICHAIN=https://sepolia.unichain.org
export RPC_LASNA=https://lasna-rpc.rnk.dev/
export DEPLOYER=0x0000000000000000000000000000000000000000  # PLACEHOLDER — alamat EOA deployer
```

### 1d. Tooling & repo (cek sebelum deploy)

- [ ] `forge --version` ≥ 1.9.0; `cast --version` tersedia.
- [ ] Repo `contagion-stop/repo/` selesai dibangun worker kontrak: `forge build`
      hijau, **`forge test` 17/17 hijau** (lihat `design.md` §11.3), dan
      `forge test --gas-report` sudah diukur (gas `pause()` aktual vs 200.000).
- [ ] `foundry.toml` memuat `evm_version = "cancun"` eksplisit di
      `[profile.default]` (satu baris — jangan deploy tanpa ini).
- [ ] `grep -r "block.number" src/` menghasilkan **nol** hasil
      (semua timer pakai `block.timestamp` — Base Sepolia ~200 ms/blok membuat
      timer berbasis blok jalan 10× lebih cepat).
- [ ] Topic0 di `ContagionTopics.sol` terverifikasi ulang dengan `cast keccak`
      (jangan percaya hash yang diketik dari hafalan):
      `EmergencyPaused(address,bytes32)` → `0xe1465c54ccfb9a5d53db40c1c727bf2f8b65f920d4927be2ba1456de56b4a42b`,
      `Paused(address)` → `0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258`.
- [ ] Nama file script di `repo/script/` sudah dikonfirmasi (di bawah memakai
      nama dari `design.md` §11.1: `DeploySibling.s.sol`, `DeployLasna.s.sol`,
      `Fund.s.sol` — ganti bila repo menamainya berbeda).

---

## 2. Urutan deploy langkah-demi-langkah

> Urutan ini mengikat karena alamat saling membutuhkan: sibling di-deploy dulu
> dengan `watcher = address(0)` placeholder (slot `watcher` mutable — lihat
> §5), watcher di-deploy dengan daftar 3 sibling, lalu tiap sibling di-`setWatcher`.

### Langkah 1 — Deploy `SiblingVault` A (Unichain Sepolia, origin)

Constructor: `(IPayable callbackProxy_, address watcher_)` — proxy Unichain
`0x775c9B990ADe401060B78D0e98684eEf8d2466C1`, `watcher_ = address(0)` placeholder.

```bash
# Via forge script (jalur utama — ganti nama script bila repo berbeda)
forge script script/DeploySibling.s.sol:DeploySibling \
  --rpc-url $RPC_UNICHAIN --broadcast --private-key $PRIVATE_KEY \
  --sig "run(address,address)" \
  0x775c9B990ADe401060B78D0e98684eEf8d2466C1 0x0000000000000000000000000000000000000000

# Bila forge script gagal di constructor (lihat §5 — perangkap WillVault),
# fallback: cast send --create (constructor hanya jalan on-chain)
#   cast send --create <BYTECODE_SiblingVault> \
#     --constructor-args 0x775c9B990ADe401060B78D0e98684eEf8d2466C1 \
#       0x0000000000000000000000000000000000000000 \
#     --rpc-url $RPC_UNICHAIN --private-key $PRIVATE_KEY
#   (BYTECODE diambil dari out/SiblingVault.sol/SiblingVault.json — JANGAN ketik dari ingatan)
```

**Catat:** alamat A → `SIBLING_A=0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5` ✅ (deploy tx `0x869b0c24304d53dc4691674e724485176924fbcd96420ec8c986abfcf35a4c5c`, code 5655 byte; setWatcher tx `0x18eb99048ed2a1509e3c36ee9c9335e1735f911b84539f8a05ab5c09dc84a795`, blok 67815761). Catatan: deploy nyata memakai script `DeploySibling.s.sol` dengan env `CALLBACK_PROXY/OWNER/WATCHER/DEPLOYER_PRIVATE_KEY` (bukan argumen `--sig` di atas) — konstruktor menerima `(proxy, owner, watcher)` 3 argumen.
Verifikasi cepat: `cast code $SIBLING_A --rpc-url $RPC_UNICHAIN` tidak kosong.

### Langkah 2 — Deploy `SiblingVault` B (Base Sepolia)

Constructor sama, proxy Base `0x476F44b11F5C942c58f4c8E3d0300E5710743585`,
`watcher_ = address(0)`.

```bash
forge script script/DeploySibling.s.sol:DeploySibling \
  --rpc-url $RPC_BASE --broadcast --private-key $PRIVATE_KEY \
  --sig "run(address,address)" \
  0x476F44b11F5C942c58f4c8E3d0300E5710743585 0x0000000000000000000000000000000000000000
# Fallback cast send --create: sama seperti Langkah 1, ganti proxy + --rpc-url $RPC_BASE
```

**Catat:** alamat B → `SIBLING_B=0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a` ✅ (deploy tx `0x75e2ccafe4f2fc9b10cf4d534f6178bd2d9e09903a95aa169e6854984d53164e`, code 5655 byte; setWatcher tx `0xe43015ab9f1a3dbe13c58a9c478bc3d0cba311273d2eabdcfd07c01ce84b5531`, blok 58731609).

### Langkah 3 — Deploy `SiblingVault` C (Unichain Sepolia)

Sama seperti Langkah 1 (proxy Unichain), kontrak kedua di chain yang sama.

```bash
forge script script/DeploySibling.s.sol:DeploySibling \
  --rpc-url $RPC_UNICHAIN --broadcast --private-key $PRIVATE_KEY \
  --sig "run(address,address)" \
  0x775c9B990ADe401060B78D0e98684eEf8d2466C1 0x0000000000000000000000000000000000000000
```

**Catat:** alamat C → `SIBLING_C=0xb07a380104ac093485566cfc964540b04518b354` ✅ (deploy tx `0xb3e2fb77e0977c193053c289c651b83f0bfb7e0b217329213cd03157f3134a0b`, code 5655 byte, ≠ A; setWatcher tx `0x7633cca51ad2e83e7aec250307e9c7af2a4b6b1b5de484bebf92a53704a2407d`, blok 67815765).
Pastikan C ≠ A (dua deploy terpisah — jangan salah salin alamat A sebagai C).

### Langkah 4 — Deploy `ContagionWatcher` (Lasna, payable)

Constructor: `(Sibling[] memory siblings_)` — daftar 3 sibling
`(chainId, siblingAddress)`: `(1301, A)`, `(84532, B)`, `(1301, C)`.
Constructor langsung subscribe **6 langganan** (2 event × 3 sibling:
`EmergencyPaused` + `Paused` per sibling).

```bash
forge script script/DeployLasna.s.sol:DeployLasna \
  --rpc-url $RPC_LASNA --broadcast --private-key $PRIVATE_KEY \
  --sig "run(address,address,address)" $SIBLING_A $SIBLING_B $SIBLING_C
# Fallback cast send --create (lihat §5): constructor-args = ABI-encode daftar
#   Sibling[] — JANGAN rangkai encoding by hand; ambil dari output forge script
#   (cast abi-encode) atau dari script deploy repo.
```

**Catat:** alamat watcher → `WATCHER=0xb18a213bfa8c1888af39af100d7dd54aa376f7b5` ✅ (deploy tx `0xeeaf022a6c1afc964aa3de5d2bed491539901edd4619a103ef72ffbc5f42f3db`, blok Lasna 8335143, gas 2.006.667, code 14.501 byte; alamat SAMA dengan A — deployer sama + nonce 0 di kedua chain, wajar. Saldo watcher 0,5 lREACT pasca-deploy; 6 langganan terkonfirmasi — 3× `SiblingRegistered` + 6 log subscribe SYSTEM. Catatan: deploy nyata memakai script `DeployWatcher.s.sol` dengan env, konstruktor `(uint256[] chainIds, address[] siblings)` payable + `WATCHER_FUNDING` — bukan `DeployLasna.s.sol`/`Sibling[]` di atas.)
Periksa di Reactscan (`https://lasna.reactscan.net/address/<WATCHER>`): status
`active` + **6 langganan** terdaftar. Bila langganan < 6, JANGAN lanjut —
diagnosis dulu (lihat §4 rollback Langkah 4).

### Langkah 5 — `setWatcher()` di tiap sibling (kabel penyambung)

`setWatcher(address)` onlyOwner — isi slot `watcher` mutable di A, B, C dengan
alamat watcher Lasna dari Langkah 4. Tanpa langkah ini, `pause()` callback
**revert** (`onlyCallbackSender` gagal) — loop tidak akan pernah jalan.

```bash
# A (Unichain) — selector setWatcher(address); ganti $SIBLING_A/$WATCHER dengan alamat nyata
cast send $SIBLING_A "setWatcher(address)" $WATCHER \
  --rpc-url $RPC_UNICHAIN --private-key $PRIVATE_KEY
# B (Base)
cast send $SIBLING_B "setWatcher(address)" $WATCHER \
  --rpc-url $RPC_BASE --private-key $PRIVATE_KEY
# C (Unichain)
cast send $SIBLING_C "setWatcher(address)" $WATCHER \
  --rpc-url $RPC_UNICHAIN --private-key $PRIVATE_KEY
```

Verifikasi per sibling (harus mengembalikan alamat watcher Lasna):

```bash
cast call $SIBLING_A "watcher()(address)" --rpc-url $RPC_UNICHAIN
cast call $SIBLING_B "watcher()(address)" --rpc-url $RPC_BASE
cast call $SIBLING_C "watcher()(address)" --rpc-url $RPC_UNICHAIN
```

### Langkah 6 — Danai watcher + reserves tiap sibling

**(a) Watcher — 0,5 lREACT.** lREACT sudah ada di tangan deployer dari faucet
(§1a: 0,1 ETH → 10 lREACT). Kirim 0,5 lREACT ke watcher (jumlah persis 0,5 —
bukan 0,1; 0,1 lREACT hanya ≈7 tick, TIDAK CUKUP untuk satu loop).

```bash
# Perintah persis tergantung cara funding yang dipakai repo (Fund.s.sol atau
# transfer lREACT langsung) — konfirmasi ke script Fund.s.sol di repo sebelum jalan.
forge script script/Fund.s.sol:Fund \
  --rpc-url $RPC_LASNA --broadcast --private-key $PRIVATE_KEY
# ATAU transfer lREACT langsung ke alamat watcher (token lREACT di Lasna) —
#   alamat token + fungsi transfer dikonfirmasi dari repo/dokumen faucet saat deploy.
```

**(b) Tiap sibling — 0,02 ETH reserves** (margin >100× atas biaya callback
≈0,000003 ETH; reserves membayar fee callback di chain tujuan).

```bash
cast send $SIBLING_A --value 0.02ether --rpc-url $RPC_UNICHAIN --private-key $PRIVATE_KEY
cast send $SIBLING_B --value 0.02ether --rpc-url $RPC_BASE --private-key $PRIVATE_KEY
cast send $SIBLING_C --value 0.02ether --rpc-url $RPC_UNICHAIN --private-key $PRIVATE_KEY
# (SiblingVault punya receive() payable — kirim ETH polos cukup.)
```

**(c) Cek utang diam-diam SEBELUM uji loop** — utang > 0 di salah satu sisi
membuat eksekusi BERHENTI total tanpa error keras (system contract tidak
memanggil `react()`, proxy tidak mengirim callback; status hanya terlihat
`inactive` di Reactscan). Cek `debt`/`reserves` ketiga sisi via `cast call`
(nama fungsi persis mengikuti `AbstractPayer`/`AbstractCallback` di repo —
konfirmasi signature sebelum jalan):

```bash
cast call $WATCHER "debt()(uint256)" --rpc-url $RPC_LASNA        # harus 0
cast call $SIBLING_A "debt()(uint256)" --rpc-url $RPC_UNICHAIN   # harus 0
cast call $SIBLING_B "debt()(uint256)" --rpc-url $RPC_BASE       # harus 0
cast call $SIBLING_C "debt()(uint256)" --rpc-url $RPC_UNICHAIN   # harus 0
```

Bila `debt > 0` di mana pun: panggil `coverDebt()` publik di kontrak itu
(lihat §3 checklist) dan cek ulang sampai 0. **Jangan mulai uji loop dengan
utang > 0.**

### Langkah 7 — Verifikasi Sourcify tiap chain

Ketiga chain `supported: true` di daftar live Sourcify (dicek 14 Nov 2026):
84532, 1301, 5318007.

```bash
forge verify-contract --verifier sourcify \
  --chain-id 1301 $SIBLING_A src/SiblingVault.sol:SiblingVault \
  --rpc-url $RPC_UNICHAIN
forge verify-contract --verifier sourcify \
  --chain-id 84532 $SIBLING_B src/SiblingVault.sol:SiblingVault \
  --rpc-url $RPC_BASE
forge verify-contract --verifier sourcify \
  --chain-id 1301 $SIBLING_C src/SiblingVault.sol:SiblingVault \
  --rpc-url $RPC_UNICHAIN
forge verify-contract --verifier sourcify \
  --chain-id 5318007 $WATCHER src/ContagionWatcher.sol:ContagionWatcher \
  --rpc-url $RPC_LASNA
# Lasna: verifikasi lewat Sourcify langsung (etherscanAPI: false) — lihat
# prebuild-blockers.md #12.
```

Bila verifikasi gagal: cek `solc` 0.8.29 + `evm_version = "cancun"` +
constructor-args persis sama dengan saat deploy (salah satu argumen saja
membuat verifikasi gagal). Jangan lanjut ke uji loop dengan kontrak
tak-terverifikasi — juri harus bisa membaca source di explorer.

### Langkah 8 — Uji loop penuh (SEBELUM rekam video)

Skenario uji dari `design.md` §6.3 — kelimanya harus lolos sebelum video:

1. **Loop penuh 1× end-to-end:** `emergencyPause(reason)` di A (owner) →
   2 callback sukses → incident CONTAINED → `deposit()` revert di B dan C.
2. **Retry:** buat satu callback gagal (mis. sibling B didanai TIDAK cukup
   sehingga callback revert/stall, lalu danai + re-emit dari origin) → retry
   hanya fan-out ke B, bukan ke C yang sudah confirmed; `trippedAt` tidak berubah.
3. **Fall-through:** kirim log dari emitter tak terdaftar (mis.
   `EmergencyPaused` dari kontrak acak) → `react()` tidak revert dan tidak
   meminta callback apa pun.
4. **Idempotensi:** panggil `pause()` callback dua kali ke sibling yang sudah
   paused → tidak revert, tidak ada event `Paused` kedua.
5. **Unpause manual:** owner B `unpause()` → `deposit()` bisa lagi; watcher
   tidak bereaksi (tidak ada callback, tidak ada state berubah di watcher).

Perintah pemicu + bukti (ganti `0x…` dengan nilai nyata saat uji):

```bash
# Pemicu — reason = bytes32, mis. keccak("EXPLOIT") (hitung via cast keccak,
# JANGAN ketik hash dari ingatan). Harus konsisten antara panggilan dan catatan incident.
REASON=$(cast keccak "EXPLOIT")   # → 0x… (nilai nyata saat uji)
cast send $SIBLING_A "emergencyPause(bytes32)" $REASON \
  --rpc-url $RPC_UNICHAIN --private-key $PRIVATE_KEY

# Bukti pembekuan — HARUS revert (deposit saat paused):
cast send $SIBLING_B "deposit()" --value 0.001ether \
  --rpc-url $RPC_BASE --private-key $PRIVATE_KEY
#   ^ ekspektasi: REVERT (bukti deployment membeku). Bila TIDAK revert → loop GAGAL, diagnosis dulu.

# Baca state watcher pasca-loop:
cast call $WATCHER "incidents(address)(uint256,bytes32,bool)" $SIBLING_A --rpc-url $RPC_LASNA
cast call $WATCHER "confirmedPaused(uint256,address)(bool)" 84532 $SIBLING_B --rpc-url $RPC_LASNA
cast call $WATCHER "confirmedPaused(uint256,address)(bool)" 1301 $SIBLING_C --rpc-url $RPC_LASNA
# Status callback per tx react:
#   SYSTEM.getCallbacks(txHash) — via cast call ke system contract
#   0x8888888888888888888888888888888888888888 di Lasna (signature persis dari repo/lib)
```

**4 tx hash loop (wajib dicatat — untuk README + form DoraHacks + layar akhir video) — TERISI 14 Nov 2026 (incident 1, `EXPLOIT-001`):**

| # | Tx | Chain | Hash |
|---|---|---|---|
| 1 | `emergencyPause` | Unichain Sepolia | `0xe9f11b6df0c2e2f8efc7929cce4aa0b7910e094c6defc18e1f59ddea427e2257` (blok 67816030, T0 = 1794668458) |
| 2 | `react()` | Lasna | `0x98dd6dad4b360201ebae842be7280ee0da47051dd4607b6cafac6ef73f21293a` (blok 8335436, T1 = 1794668458, gas 349.263) |
| 3 | callback `pause()` B | Base Sepolia | `0xe84c258d1ebc313c7fe19f016bfa0805ba28fe93dd61811e4544627b734c506b` (blok 58732960, T2a = 1794668460, gas 78.314) |
| 4 | callback `pause()` C | Unichain Sepolia | `0x60e534047a2e279cf8c3c9dcacc21d949ed396f773a6e9f82c1c8eab444e5912` (blok 67816033, T2b = 1794668461, gas 78.304) |
| + | `deposit()` pasca-pause yang revert | Base Sepolia | `0x47c8e697935b07f03114277ae0f526d1f52e6e10240a631bc048e889ae03db76` (status `0x0`, blok 58733692 — bukti pembekuan) |
| + | `deposit()` pasca-pause yang revert | Unichain Sepolia | `0xe1b8c9c9b259b28a031208a585a39ed89b1ce31333aa975d53b161726ae0a499` (status `0x0`, blok 67816462 — bukti pembekuan) |
| + | Containment `react()` | Lasna | `0xf73ce63e667c8d6223e4611d6ceed2af0425bd0b69d6e0e1222672c5f74a3d0c` (blok 8335438, ts 1794668460 — `IncidentContained`) |

Latensi terukur: event→react 0 dtk · Base 2 dtk · Unichain 3 dtk · **loop penuh 3 dtk** · CONTAINED setelah 2 dtk. Detail lengkap 5 skenario: `VERIFICATION.md` + `deploy-log.md`.

### Langkah 9 — Ukur latensi (T0/T1/T2) dan catat di README

Tiga stempel waktu, **semuanya block.timestamp dari explorer — bukan dari log
aplikasi, bukan jumlah blok** (Base Sepolia ~200 ms/blok, Unichain ~1 dtk/blok —
hitungan blok menyesatkan):

| Stempel | Sumber | Cara ambil |
|---|---|---|
| **T0** — block timestamp tx `emergencyPause` (origin, Unichain) | Blok tx (1) | Unichain explorer (sepolia.uniscan.xyz) — `timestamp` blok |
| **T1** — block timestamp tx `react()` (Lasna) | Blok tx (2) | `lasna.reactscan.net` — `timestamp` blok |
| **T2a / T2b** — block timestamp receipt callback `pause()` per chain | Blok tx (3)/(4) | BaseScan Sepolia (tx 3) + Unichain explorer (tx 4) — `timestamp` blok masing-masing |

**Rumus yang dilaporkan:**

- Latensi per tujuan: T2a − T0 (Base), T2b − T0 (Unichain)
- Rincian: T1 − T0 (event → react), T2 − T1 (react → callback)
- **Latensi loop penuh = max(T2a, T2b) − T0** (tujuan terlambat — angka jujur,
  bukan yang tercepat)

Isi tabel metrik M1–M9 di `README.md` (§6.2 `design.md`) dengan angka ini +
gas `react()` (harus < 900.000) + gas callback (harus < 200.000) + biaya loop
(lREACT + ETH per chain, dari `debt`/`reserves` sebelum–sesudah).

**Patokan pesaing (untuk konteks, bukan target yang dikarang):** Tripwire median
1,4 dtk · SnapGuard ~2 dtk · OmniStop 2.000 ms — ketiganya loop **1 chain**,
sementara loop kita fan-out **2 chain**. **Aturan kejujuran latensi (mengikat):**
bila latensi kita setara/lebih cepat, tonjolkan. Bila lebih lambat, JANGAN
sembunyikan — tampilkan angkanya + jelaskan (2 chain, 2 callback + 2 konfirmasi;
per-tujuan sebanding). **Jangan pernah menyesuaikan angka agar terlihat bagus.**

---

## 3. Checklist verifikasi pasca-deploy

Jalankan SETELAH Langkah 7, SEBELUM Langkah 8 — dan ulangi SEBELUM demo/video.
**Status 14 Nov 2026: SEMUA TERPENUHI — lihat `VERIFICATION.md` + `deploy-log.md`.**

- [x] **Status Reactscan `active`:** watcher di
      `https://lasna.reactscan.net/` berstatus `active` (bukan `inactive` —
      `inactive` = utang > 0 di suatu sisi). Utang watcher (SYSTEM) = 0 terverifikasi.
- [x] **6 langganan terdaftar:** 2 event × 3 sibling di halaman watcher Reactscan
      (3× `SiblingRegistered` + 6 log subscribe SYSTEM di receipt deploy).
- [x] **`watcher()` benar di tiap sibling:** `cast call … "watcher()(address)"`
      mengembalikan alamat watcher Lasna di A, B, dan C (setWatcher tx tercatat §2).
- [x] **`debt == 0` ketiga sisi + watcher** (watcher + 3 sibling) — lihat
      Langkah 6(c). Bila > 0: `coverDebt()` lalu cek ulang. (Akhir uji: utang 0 di keempat sisi; sempat ada utang proxy B 609846600000 wei pasca-trip 2 — dilunasi via `coverDebt()` tx `0xd7b927fc…`.)
- [x] **`reserves` cukup:** watcher ≥ 0,5 lREACT (setelah dikurangi biaya deploy
      ±0,12 lREACT, sisa ≥ ~0,35 lREACT untuk 1 loop + retry); tiap sibling
      0,02 ETH. (Nyata: watcher didanai 0,5 lREACT di constructor + top-up 1,0 lREACT; saldo akhir watcher 1,2437228 lREACT. Catatan: `SYSTEM.reserves(watcher)` terbaca 0 — penagihan nyata via saldo kontrak, bukan reserves; tiap sibling 0,02 ETH kecuali C yang 0,00044940 ETH di akhir — cukup untuk ratusan callback @ ~0,0000006 ETH.)
- [x] **Sourcify hijau** di keempat deploy (A, B, C, watcher) — source terbaca
      di explorer masing-masing chain. (Semua `exact_match` creation+runtime; vault uji D juga exact_match.)
- [x] **`deposit()` berhasil sebelum trip:** kirim ETH uji kecil ke A, B, C —
      ketiganya menerima (bukti vault hidup sebelum dibekukan). (Masing-masing 0,0001 ETH, status 1; totalDeposited 1e14.)
- [x] **Loop penuh 1× lolos** (Langkah 8, uji #1) + incident CONTAINED
      (`active == false`, 2/2 sibling confirmed). (Plus incident 2 dan 3 — retry lolos.)
- [x] **`deposit()` revert setelah pause** di B dan C (tx hash dicatat sebagai
      bukti pembekuan). (B `0x47c8e697…`, C `0xe1b8c9c9…`, keduanya status `0x0`.)
- [x] **Unpause manual bekerja:** owner B `unpause()` → `deposit()` bisa lagi;
      watcher tidak bereaksi. (Unpause A/B/C + deposit ulang berhasil; NOL event watcher baru; utang tetap 0.)
- [x] **Tabel latensi M1–M9 terisi angka nyata** di README (bukan placeholder).
      (M1 = 3 dtk; M2 = 0 dtk; M3 = 2 dtk; M4 = 3 dtk; M5 = 349.263 gas; M6 = 78.314/78.304 gas.)
- [x] **4 tx hash loop + 1 tx revert tercatat** di README + form DoraHacks +
      layar akhir video. (README §"Full loop" + VERIFICATION.md.)
- [x] **`grep -r "block.number" src/` = nol hasil pemakaian** (cek ulang pasca-perubahan
      terakhir repo). (Satu-satunya hit = komentar dokumentasi di ContagionWatcher.sol:30
      yang justru menyatakan aturan "never `block.number`" — bukan pemakaian kode.)

---

## 4. Rencana rollback bila satu langkah gagal

| Langkah gagal | Diagnosis dulu | Rollback / perbaikan | Deploy ulang? |
|---|---|---|---|
| **1–3: deploy sibling gagal** (tx revert / RPC timeout) | Cek saldo ETH deployer di chain itu; cek RPC (coba fallback); cek bytecode + constructor-args | Retry dengan RPC fallback. **Jangan** deploy ulang dengan proxy yang salah — perbaiki argumen dulu | Ya — deploy baru, catat alamat baru; alamat lama yang gagal diabaikan (tidak ada state) |
| **4: deploy watcher gagal / langganan < 6** | Cek saldo lREACT deployer (deploy ±0,12 lREACT); cek daftar sibling yang dikirim ke constructor (alamat + chainId persis); cek Reactscan | Bila constructor revert: perbaiki daftar sibling, deploy ulang. Bila langganan kurang: **jangan tambal manual** — cek dulu apakah `registerSibling` owner bisa menambah (itu jalur yang didukung); bila ragu, redeploy watcher bersih | Ya bila constructor salah; tidak bila `registerSibling` bisa menutup kekurangan (catat di README) |
| **5: `setWatcher` revert** | Hanya owner yang bisa (`onlyOwner`) — pastikan `$PRIVATE_KEY` = owner deploy; pastikan alamat watcher benar | Perbaiki pengirim/alamat, ulangi `setWatcher` (idempotent — aman diulang) | Tidak — sibling tidak perlu redeploy |
| **6: dana gagal / `debt > 0`** | Cek saldo lREACT/ETH deployer; cek `coverDebt()` sudah dipanggil; cek status Reactscan `inactive` | `coverDebt()` publik di kontrak yang berutang; top-up reserves dari stok (10 lREACT / ±0,18 ETH Base). **Jangan mulai uji loop dengan utang > 0** | Tidak |
| **7: Sourcify gagal** | Constructor-args tidak cocok / solc / `evm_version` | Samakan argumen + `evm_version = "cancun"` + solc 0.8.29, verifikasi ulang. Jangan lanjut ke uji loop dengan kontrak tak-terverifikasi | Tidak |
| **8: callback `pause()` gagal di satu tujuan** (`CallbackFailure` / `InsufficientGas` di `getCallbacks`) | Cek `gasLimit` (harus 200.000 — bila 150.000, itu penyebabnya); cek reserves sibling tujuan; cek `watcher()` di sibling tujuan | Naikkan `gasLimit` (jangan ulangi dengan angka yang sama); danai reserves; lalu **retry via re-emit**: owner origin panggil `emergencyPause(reason)` ULANG — watcher hanya fan-out ke yang belum confirmed, `trippedAt` tidak berubah | Tidak — retry adalah protokol (§4 `design.md`), bukan redeploy |
| **8: `react()` tidak terpanggil sama sekali** | Cek status Reactscan (`inactive` = utang watcher); cek langganan 6; cek emitter terdaftar (alamat A persis); cek `paused` lokal watcher (bila `pause()` lokal aktif, `react()` early-return) | Lunasi utang (`coverDebt()`); perbaiki langganan/alamat; `resume()` bila watcher ter-pause lokal | Tidak, kecuali daftar sibling di constructor salah total → redeploy watcher |
| **8: `deposit()` TIDAK revert setelah pause** | Sibling belum paused (callback gagal — lihat baris di atas) atau `deposit()` dipanggil ke alamat yang salah | Diagnosis callback dulu; jangan klaim loop berhasil | Tidak |
| **8: uji #3/#4 gagal** (fall-through revert / `pause()` kedua revert) | Bug kontrak — ini yang dicari test lokal; bila lolos di testnet, **berhenti** | Jangan tambal di testnet. Kembali ke repo: perbaiki, `forge test` hijau, redeploy kontrak yang berubah (dan ulangi Langkah 5–7 untuk kontrak itu) | Ya — kontrak yang berubah saja |

**Prinsip rollback umum:**

1. **Tidak ada dana yang bergerak dalam loop ini** — yang dipertaruhkan hanya
   fee testnet. Rollback = redeploy kontrak yang salah + ulangi kabel
   (`setWatcher`) + danai ulang. Tidak ada state pengguna yang bisa rusak.
2. **Jangan pernah "memperbaiki" dengan mengedit alamat di README** — alamat
   yang salah diganti dengan deploy baru, dan README diisi alamat deploy baru.
3. **Satu kegagalan diuji ulang penuh** — setelah perbaikan apa pun, ulangi
   Langkah 8 uji #1 dari awal (loop penuh), jangan hanya uji bagian yang
   diperbaiki.
4. **Bila dua kali berturut-turut gagal di langkah yang sama** — berhenti,
   catat log + tx hash gagal, dan laporkan ke koordinator sebelum mencoba
   pendekatan ketiga.

---

## 5. Peringatan: constructor yang subscribe — perangkap WillVault

**Perangkap:** di WillVault (pra-Omni), constructor yang memanggil `subscribe`
bisa **revert saat simulasi lokal `forge script`** — script gagal sebelum
broadcast, padahal constructor itu sendiri sah on-chain. Penyebabnya: simulasi
lokal tidak punya system contract Lasna yang asli, sehingga panggilan
`SYSTEM.subscribe(...)` di constructor revert di lingkungan simulasi.

**Yang dipakai di ContagionStop:** constructor `ContagionWatcher` langsung
subscribe 6 langganan (2 event × 3 sibling). Risiko yang sama berlaku.

**Aturan:**

1. Jalankan `forge script` dulu (jalur utama). Bila gagal **khusus di tahap
   simulasi constructor** (bukan karena saldo/argumen/RPC), JANGAN menghabiskan
   waktu men-debug simulasi — itu perangkap yang sudah diketahui.
2. **Fallback: `cast send --create`** — constructor hanya jalan on-chain,
   tanpa simulasi lokal. Ambil bytecode dari artefak kompilasi
   (`out/ContagionWatcher.sol/ContagionWatcher.json`) dan ABI-encode
   constructor-args (`Sibling[]`) dengan `cast abi-encode` — jangan rangkai
   encoding by hand.
3. Perangkap ini **dicatat sebagai asumsi yang harus dibuktikan worker kontrak**
   (`design.md` §3.6): bila worker kontrak sudah membuktikan `forge script`
   jalan mulus untuk constructor ini, hapus peringatan ini dari rencana
   (catat buktinya: tx hash deploy watcher via script).
4. Hal yang sama berlaku untuk `SiblingVault` bila constructor-nya memanggil
   sesuatu yang hanya ada on-chain — fallback yang sama.

---

## 6. Yang BUKAN bagian deploy ini (jangan dikerjakan dari rencana ini)

| Item | Kapan / siapa |
|---|---|
| Klaim faucet / deploy / uji loop | Fase deploy 19–22 Nov — **DITAHAN sampai perintah "lanjut deploy"** |
| Akun DoraHacks | **Pengguna buat sendiri** (login via akun GitHub pengguna disarankan) |
| Baca form submit + salin pertanyaan khusus penyelenggara verbatim | Setelah pengguna login (live browser agen utama) |
| Jawaban one-shot + sign-off pengguna | Sebelum submit — **JANGAN submit draft percobaan** (jawaban khusus penyelenggara terkunci permanen saat draft disubmit) |
| Klik submit akhir | Pengguna, target 28 Nov–2 Des |
| Rekam VO via HP + akun YouTube (upload unlisted) | Pengguna, 23–24 Nov |
| Frontend dashboard | Paralel 21–23 Nov (lihat `ux-ui-notes.md`) |
| Video demo (Xvfb + ffmpeg, BUKAN OBS) | 23–24 Nov, setelah loop lolos + latensi terukur |

---

## 7. Timeline deploy (target aman 5 Des siang WIB; resmi 6 Des 03:00 WIB)

| Tanggal | Kegiatan |
|---|---|
| 18 Nov | Dana testnet (jalur kritis — keterlambatan di dana menggeser semuanya) |
| 19–20 Nov | Deploy 3 chain (Langkah 1–7 dokumen ini) |
| 21–22 Nov | Uji loop + ukur latensi (Langkah 8–9) + isi tabel README |
| 21–23 Nov | Frontend (paralel) |
| 23–24 Nov | Video demo |
| 25–27 Nov | Buffer |
| 28 Nov–2 Des | Submit (pengguna klik akhir) |
| 3–5 Des | Buffer akhir |

---

*Dokumen ini rencana saja. Tidak ada transaksi yang dibroadcast, tidak ada faucet
yang diklaim, dan tidak ada akun yang dibuat dari dokumen ini.*
