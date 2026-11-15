# ContagionStop — Demo Video Script (draft, 15 Nov 2026)

**Status:** DRAFT — disiapkan untuk pengguna; belum direkam, belum disetujui.
**Tujuan:** video demo < 3 menit untuk submit DoraHacks (Reactive Omni Buildathon).
**Target durasi:** 2:30 (~330 kata VO @ ~135 WPM). Bahasa VO: Inggris.
**Sumber angka:** `VERIFICATION.md` (semua hash/blok/timestamp on-chain, diverifikasi 14 Nov 2026).
**Keputusan terbuka yang memengaruhi naskah:** blok benchmark di dashboard (hapus/biarkan) belum
dijawab pengguna — naskah ini TIDAK menampilkan kartu benchmark di layar. Bila pengguna memilih
"biarkan", tambahkan satu kalimat di beat 5 (lihat catatan di sana).

## VO script (English, ±330 kata)

### Beat 1 — Hook (0:00–0:15, ~35 kata)
> "One exploit. Three vaults. Two chains. In DeFi, an attack on one contract
> spreads to every copy of it — in seconds. Stopping it by hand is already
> too late. So we built a breaker that trips itself."

### Beat 2 — What it is (0:15–0:40, ~55 kata)
> "ContagionStop is a cross-chain circuit breaker on Reactive Network.
> Three vaults hold funds — one on Unichain Sepolia, two more across Unichain
> and Base Sepolia. One watcher on Lasna listens to all of them. When one
> vault screams, the watcher freezes the rest — automatically."

### Beat 3 — The loop, recorded run (0:40–1:25, ~95 kata)
> "This is a real run, recorded on testnet on November 14th. We trip vault A
> with an exploit signal. In the same second, the watcher on Lasna reacts —
> one call, fanning out to both chains. Two seconds later, vault B on Base
> Sepolia is paused. Three seconds after the trip, vault C on Unichain is
> paused too. Full loop: three seconds. Contained after two. And the freeze
> is real — a deposit attempted after the pause reverts on-chain, on both
> chains."

### Beat 4 — Resilience: retry (1:25–1:55, ~55 kata)
> "It also survives failure. When a callback fee went unpaid, the proxy held
> the next callback as debt — the vault stayed open. We covered the debt,
> re-ran the same trip, and both vaults confirmed in under fifteen seconds.
> The incident was never overwritten. The retry never double-counted."

### Beat 5 — Verify it yourself (1:55–2:15, ~45 kata)
> "Nothing here is a simulation. Every contract is verified exact-match on
> Sourcify. Every hash, block, and timestamp is in VERIFICATION.md — check
> them on Basescan, Uniscan, and Reactscan. The dashboard shows the recorded
> run; the code shows how it works."

*[OPSIONAL — hanya bila kartu benchmark dipertahankan: "Three seconds is
slower than a single-chain stop-loss — because this fans out to two chains,
with two confirmations. Per destination, it is two and three seconds."]*

### Beat 6 — Close (2:15–2:30, ~40 kata)
> "ContagionStop. One event. Two chains frozen. Three seconds. Built for the
> Reactive Omni Buildathon — Every Second Counts. Repo and live demo in the
> description."

**Hitung kata:** ±325 (tanpa kalimat opsional). Target 2:30 @ 135 WPM.

## Shot list (apa yang tampil di layar per beat)

| Beat | Visual | Sumber / cara rekam |
|---|---|---|
| 1 | Dashboard overview: terminal UI, incident #1 CONTAINED 3,0 dtk | https://contagion-stop.vercel.app — rekam Xvfb + ffmpeg x11grab (terbukti 14 Nov) atau screen recorder HP |
| 2 | Diagram loop sederhana: A (Unichain) → Watcher (Lasna) → B (Base) + C (Unichain); atau halaman Docs "How it works" | Docs di situs (Inggris, profesional) |
| 3 | Explorer berdampingan: trip A `0xe9f11b…2257` (Uniscan, blok 67816030) → react Lasna `0x98dd6d…293a` (Reactscan, blok 8335436) → pause B `0xe84c25…506b` (Basescan, blok 58732960, +2 dtk) → pause C `0x60e534…5912` (Uniscan, blok 67816033, +3 dtk); timer latensi tampil di layar | Explorer di browser; potong bergantian atau split-screen; tampilkan timer karena ini track Every Second Counts |
| 3b | Bukti freeze: deposit revert B `0x47c8e6…db76` + C `0xe1b8c9…a499` (status 0x0) | Explorer, tampilkan status gagal |
| 4 | Dashboard live log / incident table (retry incident 3: 2× PauseRequested, contained < 15 dtk) — boleh satu layar statis + VO; jangan klaim angka yang tidak tampil | Dashboard; angka dari VERIFICATION.md Scenario 2 |
| 5 | VERIFICATION.md / README tabel alamat kontrak + badge Sourcify exact_match | Repo GitHub / file lokal |
| 6 | End card: repo https://github.com/0xward/contagion-stop + demo https://contagion-stop.vercel.app | Teks statis |

## Fakta yang dipakai (semua dari VERIFICATION.md — jangan ubah angkanya)

- Kontrak: A Unichain `0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5`; B Base
  `0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a`; C Unichain
  `0xb07a380104ac093485566cfc964540b04518b354`; Watcher Lasna = alamat A (lowercase).
- Loop incident #1 (14 Nov 2026): trip T0 = 1794668458; react 0 dtk (detik sama);
  B +2 dtk; C +3 dtk; **loop penuh 3 dtk; contained setelah 2 dtk**.
- Skenario 5/5 PASS (loop, retry, fall-through, idempotency, manual unpause).
- Callback fee ~0,00000061 ETH per tujuan; proxy debt memblokir callback sampai `coverDebt()`.
- Data di web = RECORDED RUN testnet 14 Nov (bukan live-polling) — katakan jujur bila ditanya;
  jangan klaim dashboard memantau live.

## Cara produksi (sudah diverifikasi 14 Nov, lihat research/prebuild-video-tech.md)

1. **VO:** pengguna rekam suara sendiri via HP (Voice Recorder bawaan, ruangan sepi,
   HP ±20 cm) — 2 take, ±30 menit. Cadangan: ElevenLabs free tier (10 mnt/bln, wajib atribusi).
2. **Rekam layar:** utama Xvfb + ffmpeg x11grab 1080p/30fps di VM (uji asap 2 dtk LOLOS);
   cadangan screen recorder bawaan HP (1080p/30fps).
3. **Edit:** CapCut (gratis, JANGAN sentuh aset Pro) atau Kdenlive; export 1080p MP4 H.264.
4. **Upload:** YouTube **unlisted** ("Not for Kids") — syarat DoraHacks hanya "video demo under
   three minutes", platform tidak disebut; uji link di incognito sebelum submit.
5. **QA sebelum upload:** tonton penuh sekali; cek durasi < 3:00; cek semua hash di layar
   cocok dengan VERIFICATION.md (jangan ketik hash dari ingatan).

## Yang masih butuh pengguna (tidak bisa dikerjakan asisten)

- Rekam VO (±30 menit, via HP).
- Keputusan blok benchmark (hapus/biarkan) — memengaruhi beat 5 opsional.
- Upload ke YouTube (akun pengguna) + akun DoraHacks + klik submit (jendela 28 Nov–2 Des;
  tenggat resmi 6 Des 2026 03:00 WIB, target aman 5 Des siang WIB).
