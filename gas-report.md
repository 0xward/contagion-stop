# Gas Report — ContagionStop (local, Foundry)

**Tanggal ukur:** 14 Nov 2026 (Fase implementasi)
**Cara ukur:** `forge test --gas-report` + `test/GasReport.t.sol`
(pengukuran `gasleft()` per aksi, solc 0.8.29, `evm_version = "cancun"`,
optimizer 200 runs, `FOUNDRY_VIA_IR=false`).
**Batasan pengukuran — baca dulu:** angka di bawah diukur LOKAL dengan
stand-in system contract + stand-in callback proxy (di-etch di alamat asli).
Stand-in `requestCallbackV_1_0` hanyalah `array.push`, LEBIH MURAH daripada
system contract Lasna asli (yang juga mengecek langganan, utang, dsb).
Karena itu **`react()` di sini adalah LOWER BOUND** — angka on-chain di
Lasna akan LEBIH TINGGI dan wajib diukur ulang saat deploy testnet
(design M5). Yang bersifat absolut dan sudah bisa dipegang: batas jaringan
`react()` 900.000 gas dan `gasLimit` callback 200.000.

## 1. Gas deploy

| Kontrak | Gas deploy (forge) | Ukuran | Catatan |
|---|---|---|---|
| `SiblingVault` | **738.781** | 3.387 byte | gasleft cross-check: 756.595 |
| `ContagionWatcher` (3 sibling) | **2.792.775** | 9.155 byte | gasleft cross-check: 2.833.255; < batas 24.576 byte |

Biaya deploy pada tarif terukur (design §7c/§9.2 V6):

| Deploy | Gas | Tarif | Biaya |
|---|---|---|---|
| Watcher di Lasna | 2.792.775 | 100 gwei flat | **≈ 0,28 lREACT** |
| Sibling di Base Sepolia | 738.781 | ~0,01 gwei | ≈ 0,0000074 ETH |
| Sibling di Unichain Sepolia | 738.781 | ~0,01 gwei | ≈ 0,0000074 ETH |

> **KOREKSI terhadap design §7c:** design menulis deploy watcher
> "±0,12 lREACT" (asumsi ~1,2 jt gas). Hasil ukur: **2,79 jt gas →
> ≈ 0,28 lREACT** — sekitar 2,3× lipat. Dengan dana saat ini (2 lREACT)
> tetap cukup: deploy 0,28 + danai watcher 0,5 → sisa 1,22 lREACT di
> deployer sebagai buffer. Target nyaman 10 lREACT tetap lebih baik,
> tapi minimum 2 lREACT TIDAK jebol oleh koreksi ini.

## 2. `react()` — ContagionWatcher (Lasna)

| Skenario | Gas (gasleft) | Gas (forge report) | Keterangan |
|---|---|---|---|
| Trip baru, fan-out 2 callback | **511.247** | maks **549.333** | cold storage: 8 slot baru (incident 3 + timing 3 + konfirmasi 2) |
| Retry, fan-out 1 callback | **158.071** | median 116.956 | hanya tujuan yang belum confirmed |
| Fall-through (emitter tak terdaftar) | **30.472** | min 24.559 | tanpa callback, tanpa state change |
| Semua `react()` (59 panggilan test) | — | rata-rata 238.679 | — |

**Batas jaringan: 900.000 gas.** Trip pertama fan-out 2 memakai ~57–61%
dari batas → sisa headroom ~350.000 gas.

> **KOREKSI terhadap design §7e:** design menulis "`react()` yang
> meminta 1–2 callback hanya puluhan ribu gas". Hasil ukur: **trip
> pertama ≈ 511–549 ribu gas** — sebagian besar adalah cold SSTORE
> (8 slot × 22.100 gas ≈ 177 ribu) + reset konfirmasi + 2 permintaan
> callback. Angka "puluhan ribu" hanya benar untuk retry/fall-through.
> **Konsekuensi:** fan-out JANGAN diperluas melewati 3 sibling tanpa
> ukur ulang — tiap sibling tambahan menambah ~50 ribu+ gas pada trip
> pertama dan menggerus headroom 350 ribu yang tersisa. Batas maks
> callback per `react()` (design O3) tetap belum terverifikasi di docs.

## 3. `pause()` — callback di chain tujuan

| Pengukuran | Gas | Batas |
|---|---|---|
| Eksekusi `pause()` di vault (gasleft, langsung) | **31.485** | `gasLimit` callback 200.000 |
| `pause()` di forge report (min/avg/maks) | 21.881 / 26.207 / 30.534 | 200.000 |

Overhead proxy terukur 130.000 gas (`_extraGas` 80.000 + `_maxChargeGas`
50.000) → dari `gasLimit` 200.000, sekitar 70.000 gas diteruskan ke
target. `pause()` butuh ~31.500 → **margin ~2,2×, AMAN**. Angka 150.000
tetap TIDAK cukup (hanya ~20.000 diteruskan) — jangan turunkan.

## 4. Fungsi lain (forge report, maks)

| Fungsi | Gas maks | Catatan |
|---|---|---|
| `SiblingVault.deposit()` | 47.005 | gasleft: 63.771 (termasuk transfer nilai) |
| `SiblingVault.emergencyPause()` | 29.649 | gasleft: 30.689 |
| `SiblingVault.withdraw()` | 42.534 | — |
| `SiblingVault.unpause()` | 27.681 | — |
| `SiblingVault.setWatcher()` | 47.646 | — |
| `ContagionWatcher.registerSibling()` | 356.236 | pertama kali (cold: 2 subscribe + array); berikutnya ~24 ribu |
| `ContagionWatcher.pause()` / `resume()` | 44.541 / 27.436 | lokal watcher |
| `ContagionWatcher.clearIncident()` | 28.090 | — |
| `ContagionWatcher.coverDebt()` | 33.973 | — |

## 5. Biaya satu loop penuh (estimasi dari angka ukur)

Rumus fee Lasna (design §7c): `fee = 100 gwei × (g_used + 100.000)`.

| Langkah loop | g_used | Biaya |
|---|---|---|
| `react()` trip (fan-out 2) | ~511.000 | ≈ 0,061 lREACT |
| `react()` konfirmasi `Paused` × 2 | ~117.000 tiap | ≈ 0,022 lREACT tiap → 0,044 |
| **Total satu loop** | | **≈ 0,10–0,11 lREACT** |
| Callback `pause()` di Base Sepolia | ~31.500 | ≈ 0,000003 ETH tiap |

Dengan dana watcher 0,5 lREACT → **~4–5 loop penuh** sebelum top-up.
Dengan stok 2 lREACT (deploy 0,28 + danai 0,5 + buffer 1,22) → total
**~15+ loop** bila buffer ikut dipakai. Design §7c menulis satu loop
"≈0,30–0,35 lREACT" (berbasis asumsi CRON/tick) — untuk loop
event-driven ContagionStop, angka ukur yang berlaku adalah **≈0,10–0,11
lREACT per loop**; angka 0,30–0,35 adalah estimasi konservatif yang
masih aman dipakai sebagai anggaran.

## 6. Yang masih harus diukur di testnet (M5/M6)

- Gas `react()` ASLI di Lasna (system contract sungguhan, bukan stand-in).
- Gas callback `pause()` ASLI di Base Sepolia + Unichain Sepolia
  (proxy sungguhan, bukan stand-in).
- Latensi loop penuh M1–M4 (design §6) — tidak bisa diukur lokal.
