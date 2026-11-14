# ContagionStop — Dashboard Frontend

> **Status:** kontrak **belum di-deploy** — dashboard saat ini berjalan
> sepenuhnya di atas **data mock** (`src/lib/mock-data.ts`) dengan label MOCK
> yang jelas. Jangan klaim angka/tx di sini sebagai hasil nyata.

ContagionStop adalah pemutus sirkuit lintas-chain (track Every Second Counts,
Reactive Omni Buildathon): ketika satu deployment memanggil
`emergencyPause(reason)`, watcher reaktif di Lasna menangkap event itu dan
meminta callback `pause()` ke semua deployment saudara — satu `react()` fan-out
ke N callback. Unpause selalu manual per deployment (tidak ada auto-unpause).

## Stack

- Next.js 16 + shadcn/ui (`dashboard-01`) + Tailwind v4 — shell dari
  `Kiranism/next-shadcn-dashboard-starter` (MIT)
- wagmi v2 + viem + RainbowKit — tiga chain: Unichain Sepolia (1301),
  Base Sepolia (84532), Lasna (5318007, chain kustom)
- `react-countdown-circle-timer` — dipakai ulang sebagai **ring progres
  konfirmasi** (0/2 → 2/2 sibling confirmed), bukan countdown
- Tremor `Metric` + TanStack Table + Recharts (catatan: `Timeline` tidak ada di
  `@tremor/react` 3.18.7 — timeline dibangun custom Tailwind + Card shadcn)
- Font: Inter Variable (UI) + JetBrains Mono (angka/alamat/hash), self-host via
  Fontsource — jangan hotlink Google Fonts
- Palette: "ContagionStop Dark — Trust Indigo" (bg `#09090B`, surface
  `#18181B`, aksen indigo `#6366F1`, status shade-400 — lihat `src/lib/config.ts`)

## Cara jalanin

```bash
npm install
npm run dev     # http://localhost:3000 (redirect ke /dashboard/overview)
npm run build   # build produksi (pakai NODE_OPTIONS=--max-old-space-size=2048 bila RAM ketat)
```

Persyaratan: Node.js 20+ dan npm. Tidak perlu wallet / faucet untuk melihat
dashboard mock — data mock tampil tanpa koneksi chain.

## Struktur folder

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # root layout, Fontsource, ThemeProvider dark-only
│   │   └── dashboard/
│   │       ├── layout.tsx              # AppSidebar + Header
│   │       ├── overview/page.tsx       # SATU halaman: DEMO CONTROL → hero → grid sibling
│   │       │                           #   → timeline → tabel incident → funding → aksi
│   │       └── docs/page.tsx           # indeks dokumen proyek
│   ├── components/
│   │   ├── contagion/
│   │   │   ├── hero-status.tsx         # banner incident + ring konfirmasi + latensi
│   │   │   ├── sibling-grid.tsx        # grid 3 kartu sibling
│   │   │   ├── sibling-card.tsx        # 1 kartu sibling (A origin / B / C)
│   │   │   ├── loop-timeline.tsx       # 4 langkah event → callback + bukti revert
│   │   │   ├── incident-table.tsx      # riwayat incident (TanStack Table)
│   │   │   ├── funding-health.tsx      # reserves/debt watcher + tiap sibling
│   │   │   └── action-dialogs.tsx      # emergencyPause / unpause / deposit / coverDebt
│   │   ├── web3/
│   │   │   ├── web3-provider.tsx       # WagmiProvider + RainbowKitProvider
│   │   │   ├── header-wallet.tsx       # ConnectButton
│   │   │   └── chain-badge.tsx         # badge chain
│   │   └── ui/                         # komponen shadcn — JANGAN ubah
│   ├── lib/
│   │   ├── contracts.ts                # ABI (as const) + alamat + LIVE flag
│   │   ├── config.ts                   # CONTRACTS, chain, explorer, proxy, palette, gas limit
│   │   ├── mock-data.ts                # MOCK ONLY — skenario incident + keadaan tenang
│   │   ├── types.ts                    # Sibling / Incident / TimelineStep / FundingHealth
│   │   └── wagmi.ts                    # wagmi + RainbowKit, tiga chain
│   └── styles/
│       ├── globals.css                 # Tailwind v4 + tabular-nums global
│       └── themes/contagionstop.css    # token tema ContagionStop Dark
└── README.md                           # file ini
```

## Cara ganti mock -> live (setelah deploy)

1. Deploy kontrak mengikuti `DEPLOY-PLAN.md` di folder repo kontrak, lalu catat
   alamat nyata ketiga `SiblingVault` + `ContagionWatcher`.
2. Isi alamat asli di `CONTRACTS` pada `src/lib/config.ts` (jangan karang alamat).
3. Set `LIVE = true` di `src/lib/config.ts`.
4. Restart: `npm run dev` (atau rebuild untuk produksi).
5. Verifikasi di UI: badge "MOCK"/"DEMO DATA" hilang, alamat/tx hash ter-link ke
   explorer yang benar, angka latensi tampil dari pengukuran nyata (T0/T1/T2
   dari block timestamp explorer) — bila loop belum pernah jalan, tampilkan
   "—" + "belum diukur", jangan angka karangan.

## Yang perlu diketahui sebelum memakai ABI

Hasil ekstraksi dari repo kontrak (`forge inspect ... abi --json`) — ada
perbedaan vs spesifikasi awal di `ux-ui-notes.md`, sudah didokumentasikan di
header `src/lib/contracts.ts`:

| Spesifikasi awal | Keadaan nyata di kontrak |
|---|---|
| `SiblingVault.balance()` | **Tidak ada.** Saldo ETH via `eth_getBalance` (`useBalance`); deposit tercatat via `totalDeposited()`. |
| `SiblingVault.pause()` tanpa argumen | **`pause(address callbackSender_)`** — hanya lewat callback proxy dari watcher terdaftar. UI tidak boleh memanggilnya langsung (revert `NotAuthorized`). |
| `debt()` / `reserves()` di kontrak | **Tidak ada di kontrak mana pun.** Utang dibaca dari system contract Lasna `debt(address)` (`IPayable.debt`); "reserves" = saldo ETH kontrak (`eth_getBalance`). |
| Watcher `incidents` (jamak) | **`incident(address)`** (tunggal) -> `(trippedAt, reason, active)`. Plus `incidentTiming(address)` dan `confirmationTiming(chainId, sibling)` untuk bukti latensi. |
| `trippedAt` berdiri sendiri | Ada di dalam tuple `incident()` / `incidentTiming()`, bukan fungsi sendiri. |
| `confirmedPaused` | **Ada** — `confirmedPaused(chainId, address)` + helper `isPaused` / `isConfirmed`. |
| `coverDebt()` | **Ada** di kedua kontrak (publik). |

## Data mock — yang dicontohkan

Skenario utama mengikuti `design.md` §3.7 (12:00 WIB, 14 Nov 2026 — contoh):

- Trip: `emergencyPause("EXPLOIT")` di vault A (Unichain Sepolia), T0.
- `react()` watcher Lasna, T0+9 dtk; callback `pause()` B (Base) T0+23 dtk;
  callback `pause()` C (Unichain) T0+31 dtk. **Loop penuh (contoh): 31,0 dtk.**
- Perbandingan jujur: patokan Tripwire (median 1,4 dtk), SnapGuard (~2 dtk),
  OmniStop (2.000 ms) adalah loop **1 chain**. Contoh mock ini fan-out ke
  **2 chain** dan lebih lambat — bandingkan per kaki, bukan hanya headline.
  Angka nyata baru ada setelah uji loop testnet.
- Riwayat: 1 incident CONTAINED + 1 incident ACTIVE (1/2 confirmed, C tertunda
  — skenario retry via re-emit).
- Pendanaan: watcher 0,5 lREACT, debt 0; tiap sibling 0,02 ETH reserves.
- Keadaan tenang (`CALM_STATE`): semua ACTIVE, tanpa incident — dashboard
  bisa menampilkan kedua keadaan ini (kontrol demo di atas hero).

Semua record mock membawa `isMock: true`; alamat placeholder `0x0000...000A/B/C`
dan tx hash pola berulang (`0x1111...`, `0x2222...`) jelas bukan data nyata.

## Aksi di dashboard

| Aksi | Siapa | Konfirmasi |
|---|---|---|
| `emergencyPause(reason)` | Owner vault A | Dialog wajib (input reason bytes32 + peringatan freeze B + C) |
| `unpause()` | Owner tiap vault | Dialog wajib (manual, setelah audit; watcher tidak terlibat) |
| `deposit()` uji (0,001 ETH) | Siapa saja | Tanpa dialog — hasil revert tampil inline sebagai bukti pembekuan |
| `coverDebt()` | Siapa saja | Tanpa dialog — muncul hanya bila `debt > 0` |

Tidak ada aksi otomatis di UI — tidak ada tombol "retry otomatis" atau
"unpause semua". Retry dilakukan operator via re-emit `emergencyPause` dari
origin (kontrak hanya fan-out ke sibling yang belum confirmed).

## Catatan

- **Logo ditunda, teks saja.** Header memakai nama "ContagionStop" sebagai teks;
  logo digarap belakangan, jangan blokir build karena logo.
- Status tidak pernah warna saja: selalu ikon + label teks (WCAG 1.4.1).
- Cek kontras semua pasangan teks/latar di WebAIM Contrast Checker sebelum
  submit (target AA).
- Dashboard harus tampil benar di 1920×1080 (ukuran rekam video demo).
- Unpause is manual by design. There is no automatic unpause path — anyone
  promising one is selling you a backdoor.
