# Spec — Dashboard Monitoring VPS Kaswise

> **Tanggal:** 2026-06-13
> **Status:** Disetujui (brainstorming) — siap masuk tahap rencana implementasi
> **Tujuan pemilik:** "Ketenangan pikiran" — tahu server & aplikasi sehat, dapat alert otomatis kalau bermasalah, dan bisa restart container sendiri bila perlu.
> **Pemilik:** non-teknis (lihat catatan bahasa awam di Bagian 9).

---

## 1. Tujuan & Lingkup

Memasang **dashboard monitoring + manajemen** untuk VPS Kaswise menggunakan **3 alat open-source siap-pakai** (bukan dibangun dari nol), di balik Nginx Proxy Manager (NPM) yang sudah ada, masing-masing pada subdomain ber-HTTPS, dan diamankan dengan 2 lapis.

Ketiga fungsi yang harus terpenuhi (kebutuhan "gabungan semuanya / D"):

1. 🩺 **Kesehatan server** — CPU, RAM, disk, status tiap container; dengan **alert dini** saat ambang terlampaui.
2. 🚦 **Uptime + alert** — deteksi situs/aplikasi down dan kirim notifikasi otomatis.
3. 🐳 **Kelola container** — restart, lihat log, kelola container lewat web tanpa SSH.

## 2. Non-Goals (YAGNI — sengaja TIDAK dikerjakan dulu)

- Halaman "menu utama" tunggal penggabung ketiga alat (cukup 3 bookmark; bisa ditambah nanti).
- Dashboard custom buatan sendiri (ditolak saat brainstorming — beban perawatan, bertentangan dengan tujuan ketenangan).
- Pengumpulan metrik bisnis/aplikasi (user, pendapatan) — itu ranah "Halaman Owner" Tahap 2 yang terpisah.
- Log aggregation/observability tingkat lanjut (Grafana/Loki/Prometheus) — berlebihan untuk skala 1 VPS.

## 3. Arsitektur

```
                    Internet
                       │
              Cloudflare (DNS + Proxy + Access)
                       │   ← Lapis 1: Cloudflare Access (email OTP, hanya email owner)
                       ▼
        Nginx Proxy Manager (sudah ada, HTTPS via Let's Encrypt)
          │                │                │
   status.kaswise.com  health.kaswise.com  panel.kaswise.com
          │                │                │
     Uptime Kuma         Beszel          Portainer        ← Lapis 2: login bawaan tiap alat
          └────────────── proxy-network (Docker bridge) ──────────────┘
                       (jaringan yang sama dengan backend & NPM)
```

- Ketiga alat menjadi **container Docker baru** yang join ke network `proxy-network` (sama dengan `kaswise-backend` dan `nginx-proxy-manager`), agar NPM bisa mem-proxy via nama container.
- Dideklarasikan dalam **satu file compose baru** di VPS: `/home/Danu88/monitoring/docker-compose.yml` (terpisah dari stack aplikasi agar isolasi jelas — bisa di-update/restart tanpa menyentuh backend).
- Tiap alat memakai **named volume** untuk data persisten (riwayat metrik, konfigurasi, akun).

## 4. Komponen

### 4.1 Uptime Kuma — `status.kaswise.com`
- **Image:** `louislam/uptime-kuma:1` (pin minor, bukan `latest`).
- **Port internal:** `3001`. Volume: `uptime-kuma-data:/app/data`.
- **Monitor awal:**
  - `https://kaswise.com` (HTTP 200, interval 60s)
  - `https://api.kaswise.com/health` (endpoint health backend, interval 60s)
  - `https://code.kaswise.com` (opsional)
  - Monitor **kedaluwarsa sertifikat HTTPS** & domain (peringatan H-14).
- **Notifikasi:** Telegram (lihat Bagian 6).

### 4.2 Beszel — `health.kaswise.com`
- **Hub image:** `henrygd/beszel:latest` → web UI, port internal `8090`. Volume: `beszel-data:/beszel_data`.
- **Agent image:** `henrygd/beszel-agent:latest` → membaca metrik host + Docker. Mount `/var/run/docker.sock:/var/run/docker.sock:ro` dan baca metrik host. Agent didaftarkan ke Hub memakai public key yang dihasilkan Hub.
- **Fungsi:** grafik riwayat CPU/RAM/disk/jaringan per sistem & per container.
- **Alert ambang (Telegram):** RAM > 85%, Disk > 85%, CPU sustained > 90% (nilai final dikonfirmasi saat setup).

### 4.3 Portainer — `panel.kaswise.com`
- **Image:** `portainer/portainer-ce:2` (pin major).
- **Port internal:** `9000` (HTTP; HTTPS di-handle NPM). Volume: `portainer-data:/data`.
- **Akses Docker:** mount `/var/run/docker.sock:/var/run/docker.sock`. 
  - ⚠️ **Catatan keamanan:** socket Docker = setara akses root host. Inilah alasan **Lapis 1 (Cloudflare Access) wajib** untuk subdomain ini, dan password admin Portainer harus kuat & unik.
- **Fungsi yang dipakai owner:** lihat status container, lihat log, tombol restart.

## 5. Keamanan (2 lapis)

**Lapis 1 — Cloudflare Access (Zero Trust):**
- Ketiga subdomain di-set **Proxied (orange cloud)** di Cloudflare DNS.
- Buat 3 "Access Application" (atau 1 dengan wildcard) dengan policy: **Allow** hanya email `danubudiarto88@gmail.com` (login via one-time PIN ke email). Gratis (Zero Trust free tier).
- Efek: halaman login alat tidak terjangkau publik tanpa lolos Cloudflare dulu.

**Lapis 2 — Auth bawaan tiap alat:**
- Uptime Kuma, Beszel, Portainer masing-masing dibuatkan akun admin dengan **password kuat unik**, disimpan di password manager owner.

**Fallback bila Cloudflare Access dianggap ribet:** NPM **Access List** (Basic Auth) di depan tiap proxy host. Lebih sederhana tapi kurang nyaman (popup password browser). Cloudflare Access tetap rekomendasi utama.

**Catatan port:** semua UI hanya di-`expose` ke `proxy-network`, **tidak** di-`ports:` ke host publik (pola sama dengan `kaswise-backend`). Akses hanya lewat NPM.

## 6. Alert — Telegram

- Buat **Telegram Bot** via `@BotFather` → dapat **bot token**.
- Dapatkan **chat ID** owner (via `@userinfobot` atau getUpdates).
- Daftarkan token + chat ID sebagai channel notifikasi di **Uptime Kuma** dan **Beszel**.
- Uji: matikan sementara satu monitor / picu ambang → pastikan pesan masuk ke Telegram owner.

## 7. DNS & NPM yang perlu ditambah

**Cloudflare DNS (A record, Proxied):**
| Subdomain | Type | Target | Proxy |
|---|---|---|---|
| `status.kaswise.com` | A | `103.93.163.51` | 🟠 Proxied |
| `health.kaswise.com` | A | `103.93.163.51` | 🟠 Proxied |
| `panel.kaswise.com` | A | `103.93.163.51` | 🟠 Proxied |

**NPM Proxy Hosts (3 baru):** tiap subdomain → forward ke container (mis. `uptime-kuma:3001`, `beszel:8090`, `portainer:9000`), aktifkan SSL (Let's Encrypt), Force SSL, HTTP/2, dan Block Common Exploits.

## 8. Beban sumber daya (anggaran)

| Alat | Perkiraan RAM |
|---|---|
| Uptime Kuma | ~80–150 MB |
| Beszel (hub+agent) | ~50 MB |
| Portainer | ~80–100 MB |
| **Total** | **~300 MB** |

> ⚠️ **KOREKSI (pra-cek 2026-06-13):** asumsi "baseline ~1 GB" SALAH. Realita di VPS:
> - RAM `available` hanya **~1.060 MB** dari 3.915 MB; **swap hampir penuh** (2.034/2.047 MB).
> - Container aplikasi sebenarnya ringan (**~213 MB** total). Beban RAM berasal dari **tool development** yang jalan di VPS yang sama (`node`, `claude`, `hermes-agent`, `pi`, `tmux`) — VPS merangkap produksi + dev.
> - **Keputusan owner: deploy DITAHAN sampai RAM di-upgrade.** Lihat blok STATUS di file plan.
> - Resource limit per container (`mem_limit`) tetap diterapkan di compose.

## 9. Catatan untuk pelaksana (penting)

- **Pemilik non-teknis.** Semua hasil akhir (panduan operasional) harus berbahasa awam, langkah klik-demi-klik.
- **Lokasi eksekusi:** perubahan ini dijalankan **di VPS** (`103.93.163.51`), bukan otomatis dari mesin dev. Rencana implementasi harus menetapkan cara menerapkannya (SSH manual oleh owner mengikuti panduan, atau via akses SSH bila tersedia). Ini **item terbuka** untuk tahap rencana.
- **Idempotensi & rollback:** karena stack monitoring terpisah dari aplikasi, `docker compose down` pada stack ini tidak memengaruhi `kaswise-backend`. Backend & NPM tidak boleh disentuh selain menambah 3 proxy host.

## 10. Kriteria penerimaan (Definition of Done)

1. Membuka `status.kaswise.com`, `health.kaswise.com`, `panel.kaswise.com` → semua tampil via HTTPS, dan **terkunci Cloudflare Access** (hanya email owner yang bisa masuk).
2. Uptime Kuma memantau minimal `kaswise.com` & `api.kaswise.com` dan berstatus "Up".
3. Mematikan/men-down-kan salah satu target memicu **notifikasi Telegram** ke owner.
4. Beszel menampilkan grafik CPU/RAM/disk VPS + container, dan alert ambang terkonfigurasi.
5. Portainer menampilkan ketiga container aplikasi dan owner dapat melihat log + restart.
6. `kaswise-backend`, `kaswise-placeholder`, dan NPM tetap berjalan normal (tidak terganggu).
7. Setelah ketiga alat aktif, RAM `available` VPS tetap nyaman (target: tersisa > 500 MB & swap tidak makin penuh). *(Catatan: kriteria "< 2.5 GB" versi awal dibatalkan — baseline asli sudah ~2.8 GB karena tool dev; lihat Bagian 8.)*
8. Tersedia **panduan operasional bahasa awam** (cara baca tiap dashboard, cara restart container, apa yang harus dilakukan saat dapat alert).

## 11. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Portainer socket = akses root | Wajib Cloudflare Access + password kuat; tidak expose port ke host |
| Alat tertaut `:latest` bisa breaking | Pin versi (Uptime Kuma `:1`, Portainer `:2`); Beszel dipantau changelog |
| RAM membengkak | Set `mem_limit` per container; pantau via Beszel sendiri |
| Cloudflare Access salah konfig → owner terkunci | Uji policy sebelum menutup akses; simpan fallback NPM Access List |
| Subdomain baru gagal terbit SSL | Pakai pola NPM yang sudah terbukti untuk domain proxied lain |

## 12. Item terbuka (diselesaikan di tahap rencana)

- Cara penerapan di VPS: SSH manual (owner + panduan) vs akses langsung.
- Nilai ambang alert final Beszel.
- Apakah `code.kaswise.com` ikut dipantau Uptime Kuma.
- Konfirmasi nama subdomain final (`status`/`health`/`panel` vs preferensi lain).
