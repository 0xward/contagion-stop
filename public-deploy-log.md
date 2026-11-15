# Public Test Deployment — ContagionStop — Deploy Log

**Tanggal:** 15 November 2026 (WIB)
**Instance:** Public test deployment — `PublicVault` (subclass `SiblingVault`, permissionless `trip(bytes32)` + `reopen()`) + `ContagionWatcher` terpisah di Lasna.
**Deployer:** `0x0FD65c51D9bD790Bf67FDA9BE45A7eB21ed3d99B`
**Kode:** staging `/tmp/public-set-staging/` — build + `forge test` 72/72 lolos sebelum deploy.
**Catatan:** satu deploy liar di Unichain Sepolia (sebelum fase ini) ada dan diabaikan — tidak disentuh, tidak didanai, tidak diverifikasi, tidak dipakai.

## 1. Baseline main set (sebelum deploy, 11:56 WIB — TIDAK BERUBAH di akhir)

| Item | Nilai |
|---|---|
| Deployer Base Sepolia | 0,417193096064450673 ETH |
| Deployer Unichain Sepolia | 0,032098220655539111 ETH |
| Deployer Lasna | 10,297227799997972278 lREACT |
| Nonce deployer Base / Unichain / Lasna | 17 / 25 / 2 |
| Main vault A (Unichain `0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5`) `paused()` | false |
| Main vault B (Base `0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a`) `paused()` | false |
| Main vault C (Unichain `0xb07a380104ac093485566cfc964540b04518b354`) `paused()` | false |
| Main watcher Lasna `0xb18a213bfa8c1888af39af100d7dd54aa376f7b5` saldo | 1,2437228 lREACT |

Verifikasi akhir: A/B/C tetap `paused() = false`, main watcher tetap 1,2437228 lREACT. **Tidak ada satu pun tx ke alamat main set.**

## 2. Alamat public instance

| Peran | Chain | Alamat |
|---|---|---|
| PublicVault origin (U1) | Unichain Sepolia (1301) | `0x2bd64b3ee79eb1f38191e0b185786cb176d8696c` |
| PublicVault sibling 2 (U2) | Unichain Sepolia (1301) | `0xf3475038bc53aa50408272F233F5dF73F6CF8F8c` |
| PublicVault sibling (B) | Base Sepolia (84532) | `0x4b44497bAD6c270462D0529FCe4E41A7e092669b` |
| Public ContagionWatcher (W) | Lasna (5318007) | `0x73f6e9989057f060801d1ab7d57f6047ff6c5557` |

Owner ketiga vault = deployer. `watcher()` ketiga vault = `0x73f6E9989057f060801D1AB7D57F6047ff6c5557` (terverifikasi via `cast call`).
`registeredSibling` di watcher public: U1@1301 = true, B@84532 = true, U2@1301 = true.

## 3. Deploy vault (script `DeployPublicVaults.s.sol`, watcher = address(0) dulu)

| Vault | Tx hash | Blok | Waktu (WIB) | Gas used | Biaya |
|---|---|---|---|---|---|
| U1 Unichain | `0x9892e2aade72c8e845230f456f1aec55d922be47f11026b7fcb0ca6629a727a6` | 67866190 | 11:56:58 | 734.596 | ~0,000000367 ETH @ 0,0005 gwei |
| U2 Unichain | `0x653c0dfa2207a326d7ea2b3615079ebf1032cde44640ff394777867ee46804a5` | 67866210 | 11:57:18 | 734.596 | ~0,000000367 ETH |
| B Base | `0xe6837b6d0d6535c73139acc11f25573da6e2728a142696c9f894fcfcb17f283e` | 58983901 | 11:57:29 | 734.596 | ~0,00000367 ETH @ 0,005 gwei |

Catatan: estimasi gas forge untuk U1 (954.974) lebih tinggi dari aktual (734.596) — angka di atas adalah `gasUsed` dari receipt.

## 4. Deploy public watcher (script `DeployPublicWatcher.s.sol`, Lasna, funding 2 lREACT)

| Item | Nilai |
|---|---|
| Tx hash | `0xaf5a03961f17cf202a99d96c591cdcd4a22630c63a01a0d65a2caecd047c3c44` |
| Blok | 8382776, 11:57:59 WIB, status 1 |
| Gas used | 2.006.667 (@ 100 gwei flat Lasna = 0,2006667 lREACT) |
| Funding | 2 lREACT (value tx) |
| Sibling terdaftar di constructor | U1@1301, B@84532, U2@1301 |

Tidak ada footgun constructor-subscribe: `forge script` sukses langsung, tanpa fallback `cast send --create`.

## 5. Wiring + funding (script `FundPublic.s.sol`)

| Chain / tx | Tx hash | Blok | Gas |
|---|---|---|---|
| Lasna coverDebt watcher | `0x55bb55bf990774531912dd180368a0a3a278e0beb551ec97116a5a2c2a2ffadd` | 8382798 | 32.347 |
| Lasna top-up watcher +0,1 lREACT | `0x597cf3108fff6322140b0a1758c93fa7cbe264d8dcda6e3869f91256fbb789c3` | 8382798 | 21.055 |
| Base setWatcher B | `0x50885bc52819d63931b338f441815370c379d48acb6d5638a7a244d860663832` | 58984225 | 47.646 |
| Base coverDebt B | `0xcb95e9f4d2e42c5d172d279815362ceadaf3b6c7c1411bb864fe9880864c2008` | 58984225 | 32.330 |
| Base fund B +0,001 ETH | `0xb6377faead1e9a2a97fc3b736f12f8f3a6f611374db61db55a9196e2fb62d66d` | 58984225 | 21.055 |
| Unichain setWatcher U1 | `0x8f0ad96d463dd1d9eb8286d014c3876411e7902b1442a95e59f7717b8f15fcfd` | 67866296 | 47.646 |
| Unichain coverDebt U1 | `0xf32afa0325b03a569a6f743c6f2d4cd63b641dbe0a873955344ef01d35308fde` | 67866296 | 32.330 |
| Unichain fund U1 +0,001 ETH | `0x241f684cb67e38aed4093675fc5fbad1744258ebe6457f273ddc85aced5bcabe` | 67866296 | 21.055 |
| Unichain setWatcher U2 | `0xe2eaf280fb3d76db960b589707e56e9f088f40b465b811fc0b85c1adb3968485` | 67866296 | 47.646 |
| Unichain coverDebt U2 | `0x537f1f9a2616b4386f65c2d1b1f1af24c64ce927bf2dd097e14c005dccba0b5a` | 67866296 | 32.330 |
| Unichain fund U2 +0,001 ETH | `0x4749cc4b61877779610e2dfd60152b75073ef523dfaa9d1edb4fc33bb691a2b6` | 67866296 | 21.055 |

Saldo setelah wiring: watcher 2,1 lREACT; tiap sibling 0,001 ETH; semua vault `paused() = false`.

## 6. Verifikasi Sourcify — keempatnya `exact_match`

| Kontrak | Chain | Status |
|---|---|---|
| PublicVault U1 `0x2bd64b3ee79eb1f38191e0b185786cb176d8696c` | 1301 | exact_match |
| PublicVault U2 `0xf3475038bc53aa50408272F233F5dF73F6CF8F8c` | 1301 | exact_match |
| PublicVault B `0x4b44497bAD6c270462D0529FCe4E41A7e092669b` | 84532 | exact_match |
| ContagionWatcher `0x73f6e9989057f060801d1ab7d57f6047ff6c5557` | 5318007 | exact_match |

Dicek via Sourcify API v2 (`/v2/contract/{chainId}/{address}`), job ID forge: U1 `c0f43cf5-902f-4534-9bd8-3899c9065033`, U2 `6af8f940-b7ff-42db-93d6-835670aad11d`, B `2656aaa9-9aa4-4c80-a309-65c6804d8fb4`, W `09b257f8-e050-49a8-999d-3328840ea975`.

## 7. E2E dengan wallet bukan-owner

**Wallet uji (throwaway, ephemeral):** `0xE6c3D53e6139708A9Bd5C2dBB5E59E96d691B18D` — dibuat lokal via `cast wallet new`, key hanya di `/tmp` (chmod 600) dan dihapus setelah selesai; nilainya tidak dicatat di mana pun.
**Pendanaan dari deployer:** Unichain 0,005 ETH — tx `0xb63ef4fa6de1a6323d139e45bd8b3d368a02e0f769716b00c0cefeda2a68a7f4`, blok 67866409, 12:00:37 WIB; Base 0,002 ETH — tx `0xd6cde3a0435ab06ca84764cf4b46bd1982c9ef3701fb3f937de74b8236a66926`, blok 58984856, 12:00:40 WIB.
**Reason encoding:** `cast format-bytes32-string` — "TEST-001" = `0x544553542d303031…`, "TEST-002" = `0x544553542d303032…`.

### Siklus 1 — trip "TEST-001" dari throwaway di origin U1

| Langkah | Tx hash | Blok | Waktu (WIB) | Gas |
|---|---|---|---|---|
| trip U1 | `0x9cb807fa07c2e29acebc113852f0532bbce3dcf76d7180179d458dbe62827a02` | 67866420 | 12:00:48 | 29.461 |
| react (IncidentTripped + 2× PauseRequested) | `0x5fbbc913603634354b3ba40f10ac170f96b8cebef2fe01072dbc264816bdc7dc` | 8382934 | 12:00:48 | 348.975 |
| confirm U1 (origin, 1301) | `0xba03445fd758c8a353bbef1eb47821211b760dc130d3534f40cff8b4d62230a9` | 8382934 | 12:00:48 | 159.916 |
| confirm B (84532) | `0x70aba451494ae1d12165b3ebd0d6b2f84aa84c39f9b92185ee40419a818fcce6` | 8382935 | 12:00:49 | 161.916 |
| confirm U2 (1301) + IncidentContained | `0xcfe87d08c0d634b6488732ffe7d0c8f6ad1d26dee5e9be1cb5824c8982eb62cf` | 8382936 | 12:00:50 | 175.554 |
| callback pause() U2 | `0x7acc95dbfeb696d8195e2878e8902b05be15cee53ff5524b8a265093ab1b13e3` | 67866422 | 12:00:50 | 78.357 |
| callback pause() B | `0x7197499c90d1fdd47b07a5c04acef4bf2c1feb042017a2a0da908b88b4f2bdff` | 58984906 | 12:00:50 | 78.367 |

**Latensi siklus 1:** trip → react ~0 dtk (blok sama), trip → callback per tujuan ~2 dtk, **loop penuh trip → contained ~2 dtk** (12:00:48 → 12:00:50). Semua tx status 1. Saldo watcher setelah siklus 1: 1,9979683 lREACT (biaya loop 1 ≈ 0,1020317 lREACT).

Catatan: log `eth_getLogs` Base dibatasi 200 blok — callback B ditemukan dengan pindai chunk 58984800–58985000.

### Bukti pembekuan — deposit ke vault paused HARUS revert

- Estimasi gas gagal dulu: `execution reverted, data: 0xd93c0665: EnforcedPause`.
- Tx on-chain (paksa `--gas-limit 100000`): `0x78129ef96b1a9bb4de664ab81bfa25d14ef78acd8805f3c5ffa39ef0d3b3be0a`, blok 67866582, 12:03:30 WIB, **status 0x0**, gas 23.403 — deposit 0,001 ETH dari throwaway ke U1 yang paused.

### Reopen + deposit berhasil (dari throwaway)

| Langkah | Tx hash | Blok | Status | Gas |
|---|---|---|---|---|
| reopen U1 | `0xeec385f17b92929a5a452ea4460590e61a92e3a9e3419ca17f6a6f9b4c85498d` | 67866588 | 1 | 27.584 |
| reopen U2 | `0x6cb750ad567a71e54ae185a6a99db5a8b3a381bd191b6bc83f0bbe02051bd4d8` | 67866591 | 1 | 27.584 |
| reopen B | `0x25f1ac3965c0214f5f694bf73bb49102c5a0ea4948ee91c57b5dffff6a983474` | 58985757 | 1 | 27.584 |
| deposit 0,001 ETH ke U1 | `0x662377b0bcc1ed413cfc44051403eeca949675a14ad401d7548dd62fd1d8d7b9` | 67866602, 12:03:50 WIB | 1 | 47.005 |

Setelah reopen: U1/U2/B `paused() = false`. Saldo U1 jadi 0,002 ETH. Watcher public tidak berubah: ketiga sibling tetap `registeredSibling = true`, incident U1 `active = false`, reason `TEST-001`.

### Siklus 2 — trip "TEST-002" dari throwaway di origin U1 (bukti bisa dipakai berulang kali)

| Langkah | Tx hash | Blok | Waktu (WIB) | Gas |
|---|---|---|---|---|
| trip U1 | `0xb4f59a603a8032495c22646c518a8bdfc709e1124acd04bb40eb18a13418a541` | 67866642 | 12:04:30 | 29.461 |
| react (IncidentTripped + 2× PauseRequested) | `0x51dc2ae591ce609a354bdb0fd44a079d54b6beccab1223bba5b63c65937d323f` | 8383144 | 12:04:29* | 195.270 |
| confirm U1 (origin, 1301) | `0x0d8fa3fd0456b527f2b800d8a4400fb3ac6e5e65351cd73da8b3e205431aa8b3` | 8383144 | 12:04:29 | 110.934 |
| confirm B (84532) | `0x05ce76e9a8fbaa3dd80c86cee8b97b80dab1ce968fa8c04b3551b18f2c61b13c` | 8383145 | 12:04:30 | 161.928 |
| confirm U2 (1301) + IncidentContained | `0x567d1797190a561ac6e57e2fcbda12913ee9c1012c36f515c200acf0ac418ff8` | 8383146 | 12:04:31 | 175.554 |
| callback pause() U2 | `0xdd7a60532fc2978674da76b096c0aca61a80654edb8fc5c04e8cd6230cc9dc44` | 67866644 | 12:04:32 | 78.357 |
| callback pause() B | `0x4a869e8026cbee6f207590f6712f28f68b178c17a75bc3f3f00198c10cb2a963` | 58986014 | 12:04:31 | 78.367 |

**Latensi siklus 2:** trip → contained ~1–2 dtk, loop penuh ~2 dtk. Semua tx status 1.
\* Timestamp blok react2 (12:04:29) 1 dtk lebih awal dari blok trip2 (12:04:30) — selisih jam antar-chain, bukan latensi negatif; poll pertama yang melihat contained adalah 12:04:31 WIB (3 dtk setelah trip terkirim).

Setelah siklus 2, ketiga vault di-reopen lagi dari throwaway (instance ditinggalkan aktif, siap dipakai):
reopen U1 `0xed4f23fbf7bead24106af8c7266ac80f9f0aa866835455529f8302b849c92702` (blok 67866767, gas 27.584), reopen U2 `0x1543db86d4511d08887d420427addb697556e44860b03407e51842e6da8a466a` (blok 67866770, gas 27.584), reopen B `0x2028614c97dcb9e18cb17b607c502e83e705beb3f21b18f47ac93f45d0000e3a` (blok 58986668, gas 27.584). Semua status 1, `paused() = false` di ketiganya.

## 8. Saldo akhir + total biaya

| Akun | Awal | Akhir | Terpakai |
|---|---|---|---|
| Deployer Base | 0,417193096064450673 ETH | 0,414188711770805846 ETH | 0,003004384293644827 (0,002 funding throwaway + 0,001 reserve B + ~0,00000438 gas) |
| Deployer Unichain | 0,032098220655539111 ETH | 0,025097374164269347 ETH | 0,007000846491269764 (0,005 funding throwaway + 0,002 reserve U1+U2 + ~0,00000085 gas) |
| Deployer Lasna | 10,297227799997972278 lREACT | 7,991220899995912209 lREACT | 2,306006900002060069 (2,0 funding watcher + 0,1 top-up + 0,2060069 gas: deploy watcher 0,2006667 + FundPublic 0,0053402) |
| Public watcher | — (2,1 setelah funding) | 1,9141524 lREACT | 0,1858476 untuk 2 loop (siklus 1: 0,1020317; siklus 2: 0,0838159) |
| U1 | — (0,001) | 0,002 ETH | +0,001 deposit uji; origin tidak kena biaya callback |
| U2 | — (0,001) | 0,0009996947863 ETH | 2 callback × 0,0000003052137 |
| B | — (0,001) | 0,0009987791452 ETH | 2 callback × 0,0000006104274 |
| Throwaway Uni / Base | — | 0,003999907686142888 / 0,001999834396082870 ETH | sisa dana uji (throwaway, bukan milik instance) |

**Total biaya public instance (dari deployer):** 2,3060069 lREACT + 0,00700085 ETH (Unichain) + 0,00300438 ETH (Base). Dana tersisa di instance: watcher 1,9141524 lREACT (≈ 20 loop lagi @ ~0,09 lREACT/loop), sibling reserves ~0,001 ETH per vault (≈ 1.600+ callback per vault @ ~0,0000006 ETH).

## 9. Masalah yang ditemui + cara mengatasinya

1. **Base `eth_getLogs` dibatasi 200 blok** (HTTP 413) — query awal dari blok 58984000 ke latest mengembalikan kosong. Diatasi dengan pindai chunk ≤200 blok; callback B siklus 1 ketemu di 58984800–58985000.
2. **Deposit ke vault paused gagal di estimasi gas** (tidak ter-broadcast, tidak ada tx hash). Diatasi dengan `--gas-limit 100000` eksplisit agar tx terkirim dan tercatat on-chain status 0 sebagai bukti pembekuan.
3. **`cast block --json` membungkus data** (`data.timestamp`, bukan `timestamp`) — parsing diperbaiki; semua timestamp latensi diambil dari header blok, bukan dari jam lokal.
4. **`forge verify-contract` hanya mencetak job ID** tanpa status akhir — status `exact_match` diverifikasi terpisah via Sourcify API v2 untuk keempat kontrak.
5. **Tidak ada utang proxy yang memblokir** — `coverDebt()` di FundPublic berjalan bersih di semua chain; tidak ada `coverDebt` darurat yang diperlukan selama E2E.

## 10. Status akhir instance

- 3 PublicVault + 1 PublicWatcher ter-deploy, ter-wire, terdanai, terverifikasi Sourcify `exact_match`.
- E2E 2 siklus penuh dari wallet bukan-owner: trip → react → 2 callback pause → contained, masing-masing ~2 dtk.
- Deposit ke vault paused revert (status 0 on-chain); reopen + deposit berhasil; instance bisa dipakai berulang kali.
- Keadaan akhir: ketiga vault aktif (`paused() = false`), watcher 1,9141524 lREACT, main set tidak tersentuh.
