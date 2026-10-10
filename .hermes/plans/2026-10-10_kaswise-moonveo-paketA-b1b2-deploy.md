# Kaswise — Deploy Plan: Moonveo parity (Paket A + B1/B2 + Controls/Forms)

> **Otorisasi:** dokumen ini **hanya rencana**. Tidak ada deploy, commit, push, atau perubahan target yang dijalankan. Eksekusi menunggu perintah eksplisit pengguna.
> Disiapkan: 2026-10-10 · Repo: `/home/Danu88/apps/kaswise` · Branch: `release/v2-transaction-entry`

**Goal:** Menerbitkan pekerjaan Moonveo-parity yang sudah lolos verifikasi lokal (Paket A `G01/G02/G08/G24/G33/G35/G36`, audit browser `G16–G23`, B1/B2 simple-premium, controls/forms premium) ke produksi `https://app.kaswise.com/` dengan gate, snapshot rollback, dan readback live.

**Tech Stack:** Expo SDK 54 / RN 0.81 / Expo Router 6 / TypeScript / Supabase / Jest + RNTL / Playwright. Perintah dijalankan lewat pnpm workspace (`--filter mobile`).

---

## 1. Pre-flight go/no-go (sudah saya periksa, 2026-10-10)

| Cek | Hasil | Vonis |
|---|---|---|
| Working tree | bersih; dokumen verifikasi sudah di-commit `594d408` | ✅ |
| Branch | `release/v2-transaction-entry` — cocok regex `^release/`, **tidak** perlu `ALLOW_NON_PROD_BRANCH=1` | ✅ |
| Bundle live sekarang | `entry-94b7ee80…` (commit `47508bf`, rilis 2026-10-05) | — |
| Bundle kandidat | `entry-c75572…` (dist hasil `export:pwa` dari sumber `f2bbf9e`) | ✅ berbeda → ada yang di-deploy |
| Marker diff kandidat→live | **43 unchanged, 0 added, 0 removed** | ✅ tidak ada flag/marker baru yang perlu didaftarkan |
| Flag rollout (live vs `rollout-flags.json`) | identik: `simpleNavigation`/`transactionEntryV2`/`aiAutosaveText`/`simplePremiumExperience` = `true` | ✅ deploy **tidak mengubah** status flag |
| Target deploy | `/home/Danu88/services/nginx-proxy-manager/placeholder` (dir ada, `index.html` + 22 rute SPA) | ✅ |
| Disk | **3.4 GB free (95% terpakai)** | ⚠️ tipis — wajib cek headroom sebelum `export:pwa` |
| Backup otomatis | `deploy-pwa.mjs` **tidak** mem-backup target | ⚠️ snapshot manual wajib (langkah 3) |
| QA perangkat | **belum** dijalankan (G17 keyboard, G20 motion) | ⚠️ lihat §7 |

**Go/no-go:** semua teknis **GO**, dengan 3 catatan (disk, snapshot manual, QA perangkat). Tidak ada blocker kode.

---

## 2. Urutan eksekusi (copy-paste)

Semua dijalankan dari repo. Jalankan build/test/export sebagai background + `notify_on_complete`; jangan pipe ke `head`/`tail`/`cat` (exit code harus milik command asli).

### Langkah 1 — Gate kualitas (wajib lulus sebelum deploy)
```bash
cd /home/Danu88/apps/kaswise && corepack pnpm --filter mobile quality:live
```
Isi gate: `verify:live-registry` → `type-check` → `test:live-regression` → `export:pwa` → `check:bundle`.
Hasil yang harus terlihat: type-check exit 0, `check:bundle` menemukan **43/43** marker, `export:pwa` menghasilkan `entry-*.js` baru di `apps/mobile/dist/`.

### Langkah 2 — Bukti tambahan (rekomendasi kuat untuk perubahan UI seluas ini)
```bash
cd /home/Danu88/apps/kaswise/apps/mobile && corepack pnpm exec jest --runInBand
cd /home/Danu88/apps/kaswise/apps/mobile && corepack pnpm exec playwright test -c playwright.experience.config.ts
```
Alasan: gate `quality:live` hanya menjalankan subset `test:live-regression`. Perubahan B1/B2 + controls/forms + Paket A menyentuh banyak layar, jadi full Jest + experience suite memberi cakupan lebih jujur. (Sesi ini sudah: Jest fokus 61/0, Playwright experience 237/0.)

### Langkah 3 — Snapshot rollback (WAJIB — tidak ada backup otomatis)
```bash
TS=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p /home/Danu88/apps/kaswise/docs/qa/deploy-rollback-$TS
cp -a /home/Danu88/services/nginx-proxy-manager/placeholder/. /home/Danu88/apps/kaswise/docs/qa/deploy-rollback-$TS/
ls /home/Danu88/apps/kaswise/docs/qa/deploy-rollback-$TS/index.html
```
Catat nama folder `$TS` di laporan; itu jalur rollback. (`docs/qa/` gitignored — aman untuk artefak besar.)

### Langkah 4 — Deploy
```bash
cd /home/Danu88/apps/kaswise \
  && KASWISE_PWA_TARGET=/home/Danu88/services/nginx-proxy-manager/placeholder \
     KASWISE_LIVE_URL=https://app.kaswise.com/ \
     corepack pnpm --filter mobile deploy:pwa
```
Yang dijalankan script secara berurutan: cek branch → `quality:live` (gate) → cek `dist` → copy ke target (+ manifest, 22 rute SPA, aset, viewport lock, **injeksi runtime config Supabase + flag**) → verifikasi marker target → marker-diff report → `verify:live-url` → `generate-release-report`.

Catatan penting:
- **Tanpa** `SKIP_LIVE_QUALITY=1` → gate ikut jalan lagi di dalam script (aman, hanya lambat). Jika ingin gate dijalankan sekali saja di Langkah 1, tambahkan `SKIP_LIVE_QUALITY=1` — jangan mengosongkan gate tanpa alasan.
- **Tanpa** `ALLOW_NON_PROD_BRANCH=1` → tidak diperlukan karena `release/*` sudah diizinkan.
- Jangan menjalankan push paralel saat gate/deploy membaca `dist`.

### Langkah 5 — Verifikasi live (readback)
```bash
cd /home/Danu88/apps/kaswise/apps/mobile && corepack pnpm verify:live-url
```
Harus lulus: bundle di live `==` bundle di `dist/index.html`, marker lengkap 43/43.
Cek manual tambahan: `docs/releases/<tanggal>-<commit>.md` terbaru berisi commit = HEAD dan bundle = kandidat.

---

## 3. Rollback

Tidak ada flag yang berubah, jadi rollback = **kembalikan berkas statis**, bukan flip flag.

```bash
# ganti <TS> dengan folder snapshot dari Langkah 3
cp -a /home/Danu88/apps/kaswise/docs/qa/deploy-rollback-<TS>/. /home/Danu88/services/nginx-proxy-manager/placeholder/
cd /home/Danu88/apps/kaswise/apps/mobile && corepack pnpm verify:live-url   # harus kembali ke entry-94b7ee80…
```
- Nginx **tidak** perlu di-restart (ini berkas statis, bukan penggantian container).
- PWA yang sudah terpasang bisa masih memegang bundle lama lewat service worker → minta hard refresh / hapus data situs.
- Jangan pakai `git reset`/`checkout` untuk rollback target produksi.

---

## 4. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Disk 95% penuh | `export:pwa` gagal / sebagian | Cek `df -h /`; bersihkan cache aman lebih dulu; jalankan export ulang setelah headroom cukup |
| Service worker cache | User melihat bundle lama | Hard refresh / clear site data; verifikasi `verify:live-url` (bundle live == kandidat) |
| Tanpa snapshot | Rollback tidak mungkin | Langkah 3 wajib |
| Perubahan UI luas ter-deploy sebelum QA perangkat | Keyboard (G17) / motion (G20) bisa bermasalah di HP | Jalankan QA perangkat lebih dulu (§7) **atau** terima risiko + siap rollback |
| Nginx/proxy cache setelah ganti berkas | 502/versi lama | Ingat pola container-swap: upstream ter-cache → restart nginx-proxy-manager bila muncul 502 |
| Marker/flag baru terlewat | Fitur tidak aktif di live | Sudah dinetralkan: marker diff 0 added/0 removed; flag identik |

---

## 5. Acceptance checklist (tandai saat eksekusi)

- [ ] Working tree bersih, branch `release/v2-transaction-entry`
- [ ] `quality:live`: type-check 0, marker 43/43, `export:pwa` sukses
- [ ] (Rekomendasi) full Jest hijau
- [ ] (Rekomendasi) Playwright experience suite hijau
- [ ] Snapshot rollback dibuat + `index.html` ada di dalamnya
- [ ] `deploy:pwa` selesai: "Deployed mobile PWA dist to …" + "Deploy completed with live regression guards"
- [ ] `verify:live-url` lulus (bundle live == kandidat, marker lengkap)
- [ ] `docs/releases/<tanggal>-<commit>.md` memuat commit + bundle kandidat
- [ ] PWA di HP hard-refresh → menampilkan bundle baru
- [ ] Catat di topik: pass/fail, sisa blocker, status local-test vs deployed vs live-verified

---

## 6. Yang TIDAK termasuk dalam rencana ini

- Tidak mengubah `rollout-flags.json` (tidak ada flag baru).
- Tidak mengubah backend, migration, RLS, trigger saldo.
- Tidak push ke remote (langkah terpisah — minta izin terpisah).
- Tidak menjalankan QA perangkat dari sini (butuh HP).

## 7. Sebelum deploy — QA perangkat (opsional tapi disarankan)

Preview bundle yang sama dengan kandidat sudah dilayani di tailnet:
`http://100.115.205.61:8090/` (restart: `python3 -m http.server 8090 --bind 100.115.205.61 -d dist`).
Checklist klik-demi-klik: `docs/design/moonveo-reference/Kaswise Device QA - Moonveo G16-G23 Checklist.md`.
Jika dipakai lebih dulu, item G17/G20 bisa naik dari "QA perangkat tertunda" menjadi terverifikasi sebelum deploy.
