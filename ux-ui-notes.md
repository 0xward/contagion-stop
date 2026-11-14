# Catatan Adaptasi UX/UI — Dashboard ContagionStop

> **Status:** catatan implementasi frontend, BUKAN kode frontend. Tidak ada
> komponen yang ditulis di sini — dokumen ini adalah spesifikasi yang dipakai
> saat membangun dashboard (target paralel 21–23 Nov 2026).
>
> Sumber: `design.md` §10 (adaptasi UX/UI ContagionStop) dan
> `~/workspace/reactive-omni/ux-ui-research.md` §0 (paket UX/UI final).
> Yang berubah dari paket WillVault hanyalah ISI dashboardnya — stack, palette,
> dan font SAMA. Satu-satunya penyesuaian: konfigurasi wagmi memakai TIGA chain
> (Base Sepolia 84532, Unichain Sepolia 1301, Lasna 5318007) dan nama palette
> menjadi **"ContagionStop Dark — Trust Indigo"** dengan token yang sama.
>
> **Kebersihan:** dokumen ini (dan semua file ContagionStop) tidak memuat
> nama, handle, email, atau akun sosmed siapa pun. URL repo/akun ditulis
> sebagai placeholder generik (`<GITHUB-USER>`, `<REPO-NAME>`).

---

## 1. Paket yang dipakai (tidak berubah dari riset)

| Lapisan | Pilihan | Lisensi | Catatan adaptasi |
|---|---|---|---|
| Shell dashboard | `Kiranism/next-shadcn-dashboard-starter` (7.274 ★, MIT) + shadcn/ui `dashboard-01` | MIT | Next.js 16 + shadcn + Tailwind; sidebar + data table sudah jadi — isi dengan data ContagionStop |
| Komponen UI | shadcn/ui (128.165 ★) + TanStack Table + Recharts + Tremor | MIT / Apache-2.0 | Lihat §5 — pemetaan komponen per bagian |
| Hero pembeda | `react-countdown-circle-timer` (716 ★) | MIT | **Dipakai ulang sebagai ring progres konfirmasi** (bukan countdown): 0/2 → 2/2 sibling confirmed. Yang dihitung bukan waktu tersisa, melainkan seberapa jauh containment berjalan |
| Lapisan Web3 | wagmi v2 + viem + RainbowKit | MIT | Satu `wagmi.ts` **tiga chain**: `baseSepolia` + `unichainSepolia` + Lasna (5318007, chain kustom — daftarkan manual dengan RPC `https://lasna-rpc.rnk.dev/` + explorer `https://lasna.reactscan.net/`). `useReadContract` untuk status/paused/incident/saldo; `useWriteContract` untuk `emergencyPause` / `unpause` / `deposit` (uji) |
| Palette | "ContagionStop Dark — Trust Indigo" | — | Lihat §4 — token sama dengan paket riset |
| Font | Inter Variable (UI) + JetBrains Mono (angka/alamat/hash), self-host via Fontsource | SIL OFL 1.1 | `tabular-nums` agar angka latensi tidak "berjoget"; mono untuk alamat/tx hash/timestamp |
| README / video | Kerangka §4 riset (Best-README-Template + OmniStop) | — | Lihat `README.md` di folder ini |

**Yang sengaja TIDAK dipakai:** font Satoshi (lisensi Fontshare bukan open
source — dilarang subset & commit file font ke repo publik); OBS untuk rekam
video (headless tidak layak di VM — pakai Xvfb + ffmpeg, lihat `DEPLOY-PLAN.md` §6).

---

## 2. Struktur halaman (satu halaman, satu flow)

```
Header (ConnectButton + badge chain aktif + status watcher Lasna)
  → Hero status global (banner incident + ring konfirmasi + angka latensi)
  → Grid sibling (3 kartu: A / B / C)
  → Timeline loop (4 langkah + 4 tx hash)
  → Tabel incident (riwayat)
  → Aksi (emergencyPause / unpause / deposit uji — masing-masing Dialog konfirmasi)
```

Alur pengguna untuk video demo (1 pengguna, 1 flow — `design.md` §10.3):

1. Buka dashboard → 3 kartu sibling hijau ACTIVE.
2. Klik `emergencyPause` (owner vault A, Dialog konfirmasi + isi reason) →
   banner TRIPPED muncul + ring konfirmasi 0/2.
3. Timeline terisi langkah demi langkah (tx hash muncul + link explorer).
4. Ring 2/2 → banner CONTAINED (sky) → kartu B dan C merah PAUSED.
5. Klik `deposit()` di kartu B → revert terlihat di UI (bukti pembekuan).
6. (Di luar loop) Owner B klik `unpause()` → kartu B kembali ACTIVE.

Seluruh flow ini direkam sebagai video demo (< 3 menit).

---

## 3. Bagian 1 — Dashboard status per-chain (kartu per sibling)

Satu kartu per sibling (A, B, C). Kartu adalah unit visual utama dashboard —
juri harus bisa membaca keadaan seluruh sistem dalam 2 detik.

| Elemen kartu | Isi | Sumber data (wagmi `useReadContract`) |
|---|---|---|
| Judul | Nama sibling + peran: "A — Origin" / "B — Sibling" / "C — Sibling" | Statis (konfigurasi) |
| Badge status | **● ACTIVE** (hijau) / **⏸ PAUSED** (merah) — ikon + label teks, tidak pernah warna saja | `paused()` (OpenZeppelin `Pausable`) per vault |
| Chain | Nama chain + chain ID + dot warna chain: Unichain Sepolia (1301) / Base Sepolia (84532) | Statis + `useChainId` |
| Alamat | Alamat kontrak, monospace, terpotong `0x1234…abcd`, klik → salin + link explorer | Statis (diisi setelah deploy — placeholder `0x…` sampai ada alamat nyata) |
| Waktu paused | Timestamp blok saat `Paused` ter-emit (bila paused); "—" bila active | Event `Paused` / `trippedAt` watcher |
| Saldo / reserves | Saldo ETH vault + `reserves`/`debt` callback (bar kecil debt vs reserves) | `address.balance` + `debt()`/`reserves()` per sibling |
| Tombol aksi | `emergencyPause` (hanya kartu A, hanya owner — Dialog konfirmasi + input reason) · `unpause` (tiap kartu, hanya owner — Dialog konfirmasi, aksi berbahaya) · `deposit` uji (tiap kartu, nilai kecil — untuk bukti revert pasca-pause) | `useWriteContract`; tombol non-owner di-disable dengan penjelasan, bukan disembunyikan |

**Aturan kartu:**

- Status paused = keadaan darurat, bukan keadaan normal — kartu PAUSED memakai
  border + badge merah, bukan sekadar titik merah kecil.
- Kartu origin (A) dibedakan visual tipis (label "ORIGIN" + border indigo)
  agar juri langsung tahu mana pemicu.
- Bila `debt > 0` di suatu sisi, kartu itu menampilkan peringatan amber
  "Reserves menipis / utang > 0 — eksekusi bisa stall" (lihat §7 kesehatan
  pendanaan) — jangan sembunyikan kondisi ini.

---

## 4. Bagian 2 — Hero status global + angka latensi

### 4a. Banner incident (di atas hero, hanya saat ada incident aktif)

- **TRIPPED (amber `#FBBF24`):** "Incident ACTIVE — origin A, reason `0x…`
  (label manusia bila ada pemetaan, mis. `EXPLOIT`), trippedAt
  `<timestamp>`, progres konfirmasi x/2 sibling."
- **CONTAINED (sky `#38BDF8`):** "CONTAINED — semua sibling confirmed paused
  dalam … detik (T2 − T0). Unpause manual per deployment setelah audit."
- Bila tidak ada incident: hero menampilkan "Semua deployment ACTIVE — tidak
  ada incident berjalan" (hijau, tenang — bukan banner kosong).

### 4b. Ring progres konfirmasi (hero visual utama)

`react-countdown-circle-timer` dipakai ulang sebagai **ring progres
konfirmasi** (menggantikan countdown ring WillVault — di sini tidak ada waktu
tersisa yang dihitung):

- Angka di tengah ring: `x/2` sibling confirmed (bukan detik).
- Warna ring: indigo saat 0/2 → amber saat 1/2 → hijau saat 2/2 (CONTAINED).
- Di bawah ring: label "Sibling confirmed paused" + nama sibling yang sudah
  confirmed (B ✓ / C …) agar progresnya konkret, bukan angka abstrak.

### 4c. Angka latensi hero (bandingkan dengan patokan)

Angka besar monospace (`Metric` Tremor + JetBrains Mono + `tabular-nums`),
diambil dari pengukuran testnet nyata (`DEPLOY-PLAN.md` Langkah 9 — T0/T1/T2
dari block timestamp explorer). **Jangan tampilkan angka sebelum ada
pengukuran nyata — tampilkan "—" + "belum diukur" bila loop belum jalan.**

| Angka hero | Definisi | Tampil sebagai |
|---|---|---|
| Loop penuh | max(T2a, T2b) − T0 | Angka terbesar, satuan detik, 1 desimal |
| Event → react | T1 − T0 | Angka kecil di bawah loop penuh |
| React → callback (Base) | T2a − T1 | Per tujuan |
| React → callback (Unichain) | T2b − T1 | Per tujuan |
| Gas `react()` | gasUsed tx react vs batas 900.000 | "… / 900.000 gas" |
| Gas callback | gasUsed vs gasLimit 200.000 | "… / 200.000 gas" |

**Perbandingan dengan patokan (wajib tampil di samping angka hero):**

| Patokan | Nilai | Konteks yang ditulis |
|---|---|---|
| Tripwire | Median 1,4 dtk | Loop 1 chain (stop-loss) |
| SnapGuard | ~2 dtk | Loop 1 chain (stop-loss) |
| OmniStop | 2.000 ms | Loop 1 chain (sinyal stop-loss) |

Keterangan jujur di bawah angka (bila latensi kita lebih lambat dari patokan):
"Loop kami fan-out ke 2 chain (2 callback + 2 konfirmasi lintas chain),
sementara patokan di atas adalah loop 1 chain — bandingkan per tujuan
(T2 per chain), bukan hanya headline." Bila setara/lebih cepat: tonjolkan
angka tanpa keterangan defensif. **Jangan pernah menyesuaikan angka.**

---

## 5. Bagian 3 — Timeline event → callback

Tremor `Timeline`, 4 langkah + 4 tx hash, masing-masing link explorer
(klik → tab explorer). Langkah terisi progresif saat loop berjalan
(polling `useReadContract` + event — tanpa CRON on-chain; polling UI wajar,
yang dilarang CRON adalah di kontrak).

| Langkah | Label | Chain / explorer | Tx hash |
|---|---|---|---|
| 1 | `EmergencyPaused` — pemicu | Unichain Sepolia (sepolia.uniscan.xyz) | `0x…` — PLACEHOLDER sampai uji loop |
| 2 | `react()` — watcher Lasna | Lasna (lasna.reactscan.net) | `0x…` — PLACEHOLDER |
| 3 | Callback `pause()` B | Base Sepolia (sepolia.basescan.org) | `0x…` — PLACEHOLDER |
| 4 | Callback `pause()` C | Unichain Sepolia (sepolia.uniscan.xyz) | `0x…` — PLACEHOLDER |

- Tiap langkah menampilkan block timestamp (T0/T1/T2a/T2b) + selisih dari
  langkah sebelumnya (mis. "+0,8 dtk") — selisih adalah isi teknis yang
  dinilai juri track ini.
- Langkah yang belum terjadi: state pending (abu, spinner) — bukan hilang.
- Di bawah timeline: baris bukti pembekuan — tx `deposit()` pasca-pause yang
  revert + label "deposit() revert — deployment membeku" (link explorer).

---

## 6. Bagian 4 — Tabel incident (riwayat)

TanStack `Table` (sorting + filtering), satu baris per incident:

| Kolom | Isi |
|---|---|
| Origin | Alamat vault origin + chain (A / Unichain) |
| Reason | `bytes32` hex (monospace) + label manusia bila ada pemetaan |
| TrippedAt | Timestamp Lasna (`trippedAt` dari `incidents[origin]`) |
| Durasi sampai CONTAINED | `trippedAt` → konfirmasi terakhir (detik) |
| Konfirmasi | x/2 sibling confirmed (B ✓ / C ✓) |
| Status akhir | ACTIVE (amber) / CONTAINED (sky) |
| Tx | Link ke tx (1) `emergencyPause` |

Catatan: tabel ini membaca state watcher (`incidents`, `confirmedPaused`) —
bukan database off-chain. Bila watcher tidak subscribe `Unpaused`, tabel
tidak menampilkan unpause (sengaja — unpause adalah urusan manusia per
deployment, watcher tidak melacaknya).

---

## 7. Bagian 5 — Kesehatan pendanaan (kartu kecil, di bawah grid sibling)

| Elemen | Isi |
|---|---|
| Watcher | lREACT `reserves`/`debt` + status `active`/`inactive` (Reactscan) — bar Recharts `debt vs reserves` |
| Tiap sibling | Saldo ETH + `reserves`/`debt` callback |
| Peringatan | Banner amber bila reserves menipis atau `debt > 0` ("eksekusi bisa stall diam-diam — `coverDebt()` sebelum demo") |

Angka biaya yang ditampilkan sebagai referensi (terukur, `design.md` §7c):
`react()` fall-through ±0,014 lREACT · `react()` yang meminta callback
±0,030 lREACT · deploy watcher ±0,12 lREACT · satu loop penuh ≈0,30–0,35
lREACT · callback Base Sepolia ≈0,000003 ETH. Dana yang dipakai: watcher
0,5 lREACT, tiap sibling 0,02 ETH reserves. **Koreksi yang dipertahankan:**
0,1 lREACT hanya ≈7 tick — TIDAK CUKUP untuk satu loop.

---

## 8. Bagian 6 — Aksi (kartu aksi di bawah tabel)

| Aksi | Siapa | Konfirmasi | Catatan |
|---|---|---|---|
| `emergencyPause(reason)` | Owner vault A | **Dialog wajib** — input reason (bytes32, mis. `EXPLOIT`) + peringatan "ini mem-pause A dan memicu freeze B + C" | Satu-satunya pemicu loop; tombol paling menonjol di dashboard (indigo solid) |
| `unpause()` | Owner tiap vault | **Dialog wajib** — aksi berbahaya, teks eksplisit "unpause hanya setelah audit; watcher tidak terlibat" | Per vault, bukan "unpause semua" |
| `deposit()` uji | Siapa saja | Tanpa dialog (nilai kecil, 0,001 ETH) — hasil revert ditampilkan inline sebagai bukti | Dipakai di video untuk membuktikan pembekuan |
| `coverDebt()` | Siapa saja | Tanpa dialog | Muncul hanya bila `debt > 0` (kartu kesehatan pendanaan) |

Semua aksi memakai `useWriteContract` + status tx inline (pending → sukses /
revert + link explorer). **Tidak ada aksi otomatis di UI** — tidak ada tombol
"retry otomatis" atau "unpause semua" (keduanya melanggar desain: retry via
re-emit operator, unpause manual per deployment).

---

## 9. Palette "ContagionStop Dark — Trust Indigo" (token final)

Satu keluarga netral (Zinc) untuk seluruh chrome — jangan campur Slate + Zinc.

| Token | Hex | Peran |
|---|---|---|
| Background | `#09090B` | zinc-950 — canvas aplikasi |
| Surface (card) | `#18181B` | zinc-900 — kartu/panel |
| Surface elevated / hover | `#27272A` | zinc-800 — input, hover, dropdown |
| Border | `#27272A` | zinc-800 — divider; `#3F3F46` bila butuh lebih tegas |
| Teks primer | `#FAFAFA` | zinc-50 |
| Teks sekunder | `#A1A1AA` | zinc-400 — label, timestamp, meta |
| Aksen primer | `#818CF8` teks/ikon · `#6366F1` tombol solid | indigo-400 / indigo-500 — CTA, link aktif, fokus ring. Terpisah dari semua warna status |
| Active / sukses | `#34D399` | emerald-400 — ACTIVE, tx sukses |
| Paused / danger | `#F87171` | red-400 — PAUSED (keadaan darurat), error, aksi destruktif |
| Incident TRIPPED / pending | `#FBBF24` | amber-400 — banner TRIPPED, konfirmasi 1/2, reserves menipis |
| CONTAINED / info | `#38BDF8` | sky-400 — CONTAINED (selesai), info |

```css
/* globals.css — .dark (Tailwind v4 + shadcn) */
--background: #09090B; --foreground: #FAFAFA;
--card: #18181B; --card-foreground: #FAFAFA;
--primary: #6366F1; --primary-foreground: #FFFFFF;
--muted: #27272A; --muted-foreground: #A1A1AA;
--border: #27272A; --ring: #818CF8;
--destructive: #F87171;
--success: #34D399; --warning: #FBBF24; --info: #38BDF8;
```

**Pemetaan status (ikon + label teks — tidak pernah warna saja):**

| Status | Warna badge | Ikon + label |
|---|---|---|
| Active | Sukses `#34D399` | ● ACTIVE |
| Paused | Danger `#F87171` | ⏸ PAUSED |
| Incident TRIPPED | Warning `#FBBF24` | ⚠ TRIPPED — "containment berjalan x/2" |
| CONTAINED | Info `#38BDF8` | ✓ CONTAINED |
| Pending (langkah timeline belum terjadi) | Netral abu `#A1A1AA` | ○ PENDING |

**Aturan visual yang mengikat (dari riset):**

1. Status tidak pernah warna saja (WCAG 1.4.1, buta warna) — selalu ikon +
   label teks.
2. Di dark UI pakai **shade-400 Tailwind untuk teks status** (shade 500/600
   gagal kontras). Target WCAG AA: teks normal ≥ 4,5:1, teks besar ≥ 3:1.
3. **Cek kontras semua pasangan teks/latar di WebAIM Contrast Checker**
   sebelum submit — terutama `#A1A1AA` di atas `#18181B` dan badge status.
4. Emas jangan jadi aksen primer — tabrakan dengan Warning amber; emas hanya
   dekorasi tipis bila ada.
5. Satu aksen per section; hijau hanya sukses, merah hanya negatif/darurat.

---

## 10. Font & tipografi

| Font | Peran | Lisensi | Sumber |
|---|---|---|---|
| Inter Variable | UI + heading + body | SIL OFL 1.1 | Fontsource `@fontsource-variable/inter` (self-host — jangan hotlink Google Fonts, demo tetap tampil benar tanpa internet cepat) |
| JetBrains Mono | Saldo, latensi, alamat, tx hash, timestamp, tabel | SIL OFL 1.1 | Fontsource `@fontsource-variable/jetbrains-mono` |

Aturan: semua angka `font-variant-numeric: tabular-nums` (angka latensi tidak
"berjoget", kolom rata); Inter punya `tnum` + `slashed-zero` (0/O tak tertukar
di alamat). Skala: judul 20–24px/600, label mikro 11–12px uppercase, body
13–14px, angka latensi hero 28–32px/600 mono, tabel 13px, alamat 12–13px.

---

## 11. Komponen shadcn per bagian (ringkas)

| Bagian | Komponen |
|---|---|
| Header | `ConnectButton` (RainbowKit) + `Badge` chain + `Badge` status watcher |
| Hero status global | Banner Warning (TRIPPED) / Info (CONTAINED) + `react-countdown-circle-timer` (ring konfirmasi) + Tremor `Metric` (angka latensi) |
| Grid sibling | `Card` + `Badge` + `Dialog` (konfirmasi aksi) + `Progress` kecil (debt vs reserves) |
| Timeline loop | Tremor `Timeline` |
| Tabel incident | TanStack `Table` di atas komponen `Table` shadcn |
| Kesehatan pendanaan | `Card` + Recharts Bar (`debt vs reserves`) |
| Aksi | `Dialog` (konfirmasi `emergencyPause`/`unpause`) + tombol indigo solid (pemicu) / destructive (unpause) |

Poles hemat (maks 2–3 efek, jangan lebih): `NumberTicker` untuk angka latensi
hero saat terisi pertama kali; `BorderBeam` tipis di kartu origin A. Jangan
tambah efek lain — dashboard keamanan harus terasa tenang dan tepercaya,
bukan ramai.

---

## 12. Checklist sebelum demo ke juri

- [ ] Status tidak pernah warna saja: ikon + label teks di setiap badge.
- [ ] Ring konfirmasi menampilkan x/2 + nama sibling confirmed (bukan angka abstrak).
- [ ] Angka latensi terisi dari pengukuran nyata (T0/T1/T2) — bila belum diukur, tampilkan "—" + "belum diukur", jangan angka karangan.
- [ ] Perbandingan patokan (Tripwire 1,4 dtk / SnapGuard ~2 dtk / OmniStop 2.000 ms) tampil dengan konteks "loop 1 chain".
- [ ] Semua alamat + tx hash di dashboard adalah alamat/tx nyata pasca-deploy (placeholder `0x…` sudah diganti).
- [ ] Tombol `emergencyPause` dan `unpause` di balik Dialog konfirmasi; tombol non-owner di-disable dengan penjelasan.
- [ ] Cek kontras WebAIM lolos AA untuk semua pasangan teks/latar.
- [ ] Font self-host via Fontsource (bukan hotlink); tanpa font Satoshi.
- [ ] Dashboard tampil benar di 1920×1080 (ukuran rekam video Xvfb + ffmpeg).
- [ ] Satu keluarga netral (Zinc) di seluruh chrome; tidak ada Slate tercampur.

---

## 13. Yang BUKAN bagian catatan ini

| Item | Di mana |
|---|---|
| Kode frontend (komponen, `wagmi.ts`, halaman) | Dibangun dari catatan ini saat fase frontend 21–23 Nov |
| Alamat kontrak + tx hash nyata | `README.md` (diisi setelah deploy 19–22 Nov) |
| Langkah deploy testnet | `DEPLOY-PLAN.md` |
| Desain kontrak + protokol fan-out/retry | `design.md` |
| Naskah video demo | `DEMO.md` + `docs/demo-script.md` (dibuat saat fase video 23–24 Nov) |
