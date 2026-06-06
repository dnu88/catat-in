# Web Landing Phase 3 — 2026-06-07

Menaikkan landing `apps/web` dari placeholder sederhana (Phase 2) menjadi **landing
serius** untuk dua segmen pengunjung, tetap patuh design system Kaswise + aturan
anti AI-slop. Live PWA di `kaswise.com` **tidak disentuh**.

## Keputusan (hasil sesi grill)

1. **Target:** 2 segmen — orang asing (cold) + referral teman (warm).
2. **Ambisi:** landing serius (bukan sekadar placeholder), tetap restraint.
3. **Bukti produk:** screenshot PWA asli (dikirim user), bukan hanya mockup CSS.
4. **Hook pesan:** AI-speed **dominan**; didukung konteks lokal + ringan; keamanan di sectionnya sendiri.
5. **Tema:** full dark (matte black `#141414` + neon emerald `#A3FF12`), dipatok — tidak ikut theme toggle global.
6. **Monetisasi:** "Mulai gratis", tanpa harga (Midtrans belum live).
7. **CTA:** "Mulai gratis" → `/register`, "Masuk" → `/login` (via `VITE_KASWISE_APP_URL` + path).
8. **Trust:** keamanan bahasa awam + identitas "dibuat di Indonesia"; nol metrik/testimoni karangan.
9. **Struktur:** 9 section (Header, Hero, Kenapa/pembeda, Cara kerja, Fitur, Keamanan, FAQ, Final CTA, Footer).

## Perubahan kode

| File | Perubahan |
|------|-----------|
| `apps/web/src/pages/LandingPage.tsx` | Ditulis ulang — 9 section, CTA register/login, before/after pembeda, support point, FAQ, slot screenshot |
| `apps/web/src/index.css` | Token full-dark dipatok di `.landing-page`; style section baru (versus, support, feature+`.landing-shot`, faq, ghost button); responsif 980/720/420 |
| `apps/web/src/App.test.tsx` | Assertion CTA disesuaikan ("Mulai gratis"→/register, "Masuk"→/login) |
| `apps/web/public/shots/*.webp` | 3 screenshot produk asli (capture/budget/reports) |
| `ops/hardening/host/02-firewall-ufw.sh` | Tambah rule ufw 4173 (lihat Deploy) |

## Screenshot produk

- User mengirim screenshot mentah (JPG portrait ~1170×2000 + 1 HEIC) ke `apps/web/public/shots/`.
- Dioptimasi via **ffmpeg** → WebP 720×1230, **26–42 KB** (dari 400–540 KB). File mentah dihapus dari `public/` agar tidak ter-deploy.
- Reports memakai varian **Overview** (Income/Expense/Savings = "arus kas"); varian chart "Cashflow Pulse" sengaja dihindari (copy bilang *"bukan dashboard penuh chart"*).
- Hero **tetap mockup CSS** (HEIC tidak bisa dikonversi dengan tooling di VPS; hero opsional).

### ⚠️ Catatan bahasa (penting)
UI aplikasi pada screenshot **berbahasa Inggris** ("Capture AI", "Process with AI",
"Budgets", "Top 5 Expenses"). Keputusan user: **pakai screenshot Inggris + sesuaikan
copy landing**. Maka:
- proof strip `Bahasa Indonesia` → `Konteks lokal`,
- support point `GoFood` → `QRIS` (yang memang tampil: Kopi Kenangan, QRIS, BCA/Seabank, Rupiah).

Konsekuensi: hero ber-rasa Indonesia, screenshot fitur Inggris. Kalau mau seragam:
kirim ulang Hero sbg PNG/JPG, atau switch bahasa app ke ID lalu re-capture, atau
selaraskan teks mockup hero ke Inggris.

## Deploy (preview)

```
kaswise.com      = live PWA (kaswise-placeholder container) — TIDAK disentuh
www.kaswise.com  = landing Phase 3 (Cloudflare-proxied -> NPM 4.conf -> vite preview :4173)
```

**Mekanisme:** `vite preview` (host `0.0.0.0`, port `4173`, `allowedHosts` =
www/preview.kaswise.com) menyajikan `apps/web/dist`. NPM `proxy_host/4.conf`
proxy `www.kaswise.com` → `172.17.0.1:4173`.

**Dijalankan sebagai systemd service** (reboot-persistent, menggantikan nohup lama):
`/etc/systemd/system/kaswise-web-landing.service` — `User=Danu88`, memanggil node+vite
langsung, `Restart=on-failure`, `enabled` (WantedBy multi-user.target).

```bash
# rebuild lalu muat ulang
cd /home/Danu88/catat-in/apps/web && corepack pnpm --filter web build
sudo systemctl restart kaswise-web-landing.service

# operasional
sudo systemctl status   kaswise-web-landing.service
sudo journalctl -u kaswise-web-landing.service -f
```

ExecStart:
`/home/Danu88/.nvm/versions/node/v22.22.3/bin/node \
  /home/Danu88/catat-in/apps/web/node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port 4173 --strictPort`

### 🔴 GOTCHA ufw (akar penyebab www down)
ufw `default deny incoming` aktif. NPM (container `proxy-network` 172.18.x) connect ke
host `:4173` di-**DROP** (silent) → NPM hang → Cloudflare/curl timeout → `HTTP 000`
(bukan 502). Fix:
```bash
sudo ufw allow from 172.18.0.0/16 to any port 4173 proto tcp \
  comment 'NPM bridge -> web landing preview'
```
Rule ini **sudah diterapkan runtime** + **ditambahkan ke `02-firewall-ufw.sh`** agar
tidak hilang saat hardening di-run ulang (persis pola code-server :8080).

> Catatan debug: test `wget` ke `172.17.0.1:4173` dari dalam container bisa misleading
> (kena `allowedHosts` 403). Sumber kebenaran = `curl https://www.kaswise.com/` atau
> `wget --header="Host: www.kaswise.com"`.

### Persistensi (DONE — systemd)
- ✅ `kaswise-web-landing.service` **enabled + active**, start otomatis saat boot,
  auto-restart on failure. Diverifikasi via `systemctl restart` → www tetap 200.
- ⚠️ ExecStart memakai path node nvm version-specific
  (`.../v22.22.3/bin/node`). Jika node di-upgrade via nvm, update `ExecStart` lalu
  `daemon-reload` + `restart`.
- Setelah rebuild `dist`, jalankan `sudo systemctl restart kaswise-web-landing.service`.
- pid/log nohup lama (`/tmp/kaswise_web_preview.*`) sudah dihapus; log kini via journald.

## Validasi (2026-06-07)

```
web type-check ✅
web test       ✅ 9 passed
web build      ✅ LandingPage 11.31kB; dist/shots/* ter-copy
QA visual      ✅ desktop/tablet/mobile (breakpoint 980/720/420 diverifikasi)
deploy E2E     ✅ https://www.kaswise.com/ -> 200, judul benar, screenshot fitur render
               ✅ https://www.kaswise.com/shots/capture.webp -> 200
apex aman      ✅ https://kaswise.com/ -> 200 (tidak berubah)
```

## Rollback www.kaswise.com

```bash
# stop + disable service
sudo systemctl disable --now kaswise-web-landing.service
# (opsional) hapus unit: sudo rm /etc/systemd/system/kaswise-web-landing.service && sudo systemctl daemon-reload
# (opsional) kembalikan www ke PWA lama: edit NPM 3.conf/4.conf server_name,
#   lalu: docker exec nginx-proxy-manager nginx -t && nginx -s reload
```
Rule ufw 4173 boleh dibiarkan (tidak membuka apa pun ke publik; hanya bridge→host).

## Langkah berikutnya (opsional)

1. Seragamkan bahasa hero vs screenshot (lihat Catatan bahasa).
2. ✅ ~~Preview durable~~ — DONE via systemd `kaswise-web-landing.service`.
3. Saat Midtrans live: tambah section pricing (Free vs Premium Rp29rb/Rp249rb).
4. Tambah `www` ke cert kalau belum (lihat memory VPS deploy).
