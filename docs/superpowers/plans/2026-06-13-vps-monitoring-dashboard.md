# Dashboard Monitoring VPS Kaswise — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memasang 3 alat monitoring open-source (Uptime Kuma, Beszel, Portainer) di VPS Kaswise, di balik NPM + Cloudflare Access, dengan alert Telegram — untuk ketenangan pikiran pemilik non-teknis.

**Architecture:** Stack Docker terpisah (`ops/monitoring/docker-compose.yml`) yang join ke `proxy-network` yang sudah ada. NPM mem-proxy tiap alat ke subdomain ber-HTTPS; Cloudflare Access membatasi akses ke email pemilik. Tidak menyentuh `kaswise-backend` selain menambah 3 proxy host.

**Tech Stack:** Docker Compose, Uptime Kuma, Beszel (hub+agent), Portainer CE, Nginx Proxy Manager, Cloudflare Zero Trust, Telegram Bot API.

**Spec:** `docs/superpowers/specs/2026-06-13-vps-monitoring-dashboard-design.md`

---

## ✅ STATUS: SELESAI — deploy 16 Juni 2026

**VPS RAM:** di-upgrade ke 8 GB (7.939 MB). Pra-cek: available **4.989 MB** — sangat longgar.

**Keputusan:** deploy dilanjutkan setelah upgrade RAM dikonfirmasi owner.

### Ringkasan Deploy (16 Juni 2026)

| Alat | Subdomain | Container | Status |
|---|---|---|---|
| Uptime Kuma | `status.kaswise.com` | `kaswise-uptime-kuma` | Up |
| Beszel | `health.kaswise.com` | `kaswise-beszel` + `kaswise-beszel-agent` | Up |
| Portainer | `panel.kaswise.com` | `kaswise-portainer` | Up |

**Notifikasi Telegram:**
- Bot: `@Kaswisemonitorbot` (token: `8195551249:***`)
- Chat ID tujuan: `877430903` (DM owner)
- Uptime Kuma: Telegram notification OK (test received)
- Beszel: Webhook gagal → alert threshold tetap diset, notifikasi mengandalkan Uptime Kuma

**Resource aktual:**
- Total monitoring: **~145 MB** (jauh di bawah anggaran 350 MB)
- RAM VPS available setelah deploy: **4.278 MB**
- Container produksi tidak terganggu

**Deviasi dari plan:**
- Portainer image: `portainer/portainer-ce:2` → `portainer/portainer-ce:lts` (tag `:2` tidak ada di Docker Hub)
- Beszel notifikasi: Telegram native tidak tersedia, Webhook gagal → skip, alert threshold tetap diset
- Bot: pakai bot terpisah (`@Kaswisemonitorbot`) bukan DANU Prime, untuk isolasi

**File terdampak (commit `b51f122`):**
- `ops/monitoring/docker-compose.yml` (update Portainer tag)
- `docs/ops/PANDUAN_DASHBOARD_VPS.md` (panduan owner, baru)

**All 12 tasks complete.**

---

## Catatan eksekusi (baca dulu)

- **Target:** semua langkah Docker/SSH dijalankan **di VPS** `103.93.163.51` (user `Danu88`, sudo NOPASSWD). Langkah Cloudflare/NPM/Telegram dilakukan lewat **dashboard web**.
- **Artefak yang di-version-control:** hanya `ops/monitoring/docker-compose.yml` (+ `ops/monitoring/.env.example`) yang masuk repo. File `.env` berisi nilai rahasia **tidak** di-commit.
- **Banyak langkah bersifat manual UI** (Cloudflare, NPM, setup akun alat). Untuk langkah itu, "verifikasi" = membuka URL dan melihat hasil yang diharapkan, bukan menjalankan test otomatis.
- **Prasyarat akses:** operator punya SSH ke VPS, login Cloudflare (zona `kaswise.com`), dan login NPM admin (via SSH tunnel port 81). Jika salah satu tidak ada, selesaikan dulu sebelum mulai.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `ops/monitoring/docker-compose.yml` | Definisi 4 container (uptime-kuma, beszel, beszel-agent, portainer) + volumes + network eksternal |
| `ops/monitoring/.env.example` | Template variabel (`BESZEL_KEY`) — di-commit |
| `ops/monitoring/.env` | Nilai asli `BESZEL_KEY` — **TIDAK** di-commit (gitignored) |
| `ops/monitoring/README.md` | Catatan teknis singkat untuk operator |
| `docs/ops/PANDUAN_DASHBOARD_VPS.md` | Panduan bahasa awam untuk pemilik (Task 11) |

---

## Task 0: Prasyarat & kumpulkan kredensial

**Files:** (tidak ada perubahan file)

- [ ] **Step 1: Verifikasi SSH ke VPS**

Run: `ssh Danu88@103.93.163.51 "docker ps --format '{{.Names}}'"`
Expected: muncul minimal `nginx-proxy-manager`, `kaswise-backend`, `kaswise-placeholder`.

- [ ] **Step 2: Verifikasi network `proxy-network` ada**

Run: `ssh Danu88@103.93.163.51 "docker network ls | grep proxy-network"`
Expected: satu baris berisi `proxy-network` (driver `bridge`).

- [ ] **Step 3: Buat Telegram Bot & ambil token**

Manual di Telegram: chat `@BotFather` → kirim `/newbot` → ikuti → catat **bot token** (format `123456789:ABC...`).

- [ ] **Step 4: Ambil chat ID pemilik**

Manual: chat bot `@userinfobot` → ia membalas dengan **Id** angka. Catat sebagai **chat ID**.
Verifikasi token+chatID dengan:
Run: `curl -s "https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHATID>&text=tes-kaswise"`
Expected: JSON `"ok":true` dan pesan "tes-kaswise" masuk ke Telegram pemilik.

- [ ] **Step 5: Catat semua kredensial di password manager**

Simpan: bot token, chat ID. (Password tiap alat dibuat di task masing-masing.)

---

## Task 1: Tambah DNS record di Cloudflare

**Files:** (tidak ada — konfigurasi di dashboard Cloudflare)

- [ ] **Step 1: Tambah 3 A record (Proxied)**

Manual di Cloudflare → zona `kaswise.com` → DNS → Add record, ulangi untuk tiga subdomain:

| Type | Name | IPv4 | Proxy status |
|---|---|---|---|
| A | `status` | `103.93.163.51` | Proxied (orange) |
| A | `health` | `103.93.163.51` | Proxied (orange) |
| A | `panel` | `103.93.163.51` | Proxied (orange) |

- [ ] **Step 2: Verifikasi resolusi DNS**

Run: `for s in status health panel; do echo "$s:"; dig +short $s.kaswise.com; done`
Expected: tiap subdomain mengembalikan IP Cloudflare (bukan kosong). *(Karena Proxied, IP yang muncul adalah IP Cloudflare, bukan `103.93.163.51` — ini benar.)*

---

## Task 2: Buat file compose stack monitoring (di repo)

**Files:**
- Create: `ops/monitoring/docker-compose.yml`
- Create: `ops/monitoring/.env.example`
- Create: `ops/monitoring/README.md`
- Modify: `.gitignore` (tambah `ops/monitoring/.env`)

- [ ] **Step 1: Tulis `ops/monitoring/docker-compose.yml`**

```yaml
# Stack monitoring VPS Kaswise — TERPISAH dari stack aplikasi.
# Deploy: salin folder ini ke /home/Danu88/monitoring/ di VPS, isi .env, lalu:
#   docker compose up -d uptime-kuma beszel portainer   # agent menyusul setelah KEY diisi
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: kaswise-uptime-kuma
    restart: unless-stopped
    volumes:
      - uptime-kuma-data:/app/data
    expose:
      - "3001"
    mem_limit: 256m
    networks:
      - proxy-network

  beszel:
    image: henrygd/beszel:latest
    container_name: kaswise-beszel
    restart: unless-stopped
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - beszel-data:/beszel_data
    expose:
      - "8090"
    mem_limit: 128m
    networks:
      - proxy-network

  beszel-agent:
    image: henrygd/beszel-agent:latest
    container_name: kaswise-beszel-agent
    restart: unless-stopped
    network_mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      LISTEN: "45876"
      KEY: "${BESZEL_KEY}"
    mem_limit: 128m

  portainer:
    image: portainer/portainer-ce:2
    container_name: kaswise-portainer
    restart: unless-stopped
    command: -H unix:///var/run/docker.sock
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer-data:/data
    expose:
      - "9000"
    mem_limit: 256m
    networks:
      - proxy-network

volumes:
  uptime-kuma-data:
  beszel-data:
  portainer-data:

networks:
  proxy-network:
    external: true
```

- [ ] **Step 2: Tulis `ops/monitoring/.env.example`**

```bash
# Public key yang dihasilkan Beszel Hub saat "Add System" (Task 4).
# Salin file ini menjadi .env dan isi nilainya.
BESZEL_KEY=
```

- [ ] **Step 3: Tulis `ops/monitoring/README.md`**

```markdown
# Stack Monitoring VPS Kaswise

Berisi Uptime Kuma, Beszel (hub+agent), Portainer. Terpisah dari stack aplikasi.

## Deploy
1. Salin folder ini ke `/home/Danu88/monitoring/` di VPS.
2. `cp .env.example .env` lalu isi `BESZEL_KEY` (dari Beszel Hub, lihat plan Task 4).
3. `docker compose up -d uptime-kuma beszel portainer`
4. Setelah `BESZEL_KEY` terisi: `docker compose up -d beszel-agent`

## Network
Join ke `proxy-network` (eksternal) — sama dengan NPM & backend.
Akses hanya via NPM (subdomain status/health/panel.kaswise.com), tidak expose port ke host.

## Update aman
`docker compose pull && docker compose up -d` — tidak memengaruhi kaswise-backend.
```

- [ ] **Step 4: Tambahkan `.env` ke `.gitignore`**

Tambahkan baris berikut di `.gitignore` (di bawah bagian ENVIRONMENT VARIABLES):
```
# Monitoring stack secrets
ops/monitoring/.env
```

- [ ] **Step 5: Validasi sintaks compose secara lokal**

Run: `docker compose -f ops/monitoring/docker-compose.yml config -q`
Expected: tidak ada output error (sintaks valid). *(Peringatan soal variabel `BESZEL_KEY` kosong boleh diabaikan pada tahap ini.)*

- [ ] **Step 6: Commit**

```bash
git add ops/monitoring/docker-compose.yml ops/monitoring/.env.example ops/monitoring/README.md .gitignore
git commit -m "feat(ops): add VPS monitoring stack compose (uptime-kuma, beszel, portainer)"
```

---

## Task 3: Deploy stack ke VPS (tanpa agent dulu)

**Files:** (menyalin artefak ke VPS)

- [ ] **Step 1: Salin folder monitoring ke VPS**

Run: `rsync -av ops/monitoring/ Danu88@103.93.163.51:/home/Danu88/monitoring/`
Expected: `docker-compose.yml`, `.env.example`, `README.md` tersalin.

- [ ] **Step 2: Siapkan `.env` di VPS (sementara KEY kosong)**

Run: `ssh Danu88@103.93.163.51 "cd /home/Danu88/monitoring && cp -n .env.example .env"`
Expected: file `.env` ada (KEY masih kosong — diisi di Task 4).

- [ ] **Step 3: Tarik image & nyalakan 3 container (tanpa agent)**

Run: `ssh Danu88@103.93.163.51 "cd /home/Danu88/monitoring && docker compose up -d uptime-kuma beszel portainer"`
Expected: 3 container dibuat, status `Started`.

- [ ] **Step 4: Verifikasi container sehat**

Run: `ssh Danu88@103.93.163.51 "docker ps --filter name=kaswise-uptime-kuma --filter name=kaswise-beszel --filter name=kaswise-portainer --format '{{.Names}} {{.Status}}'"`
Expected: tiga baris, semuanya `Up`.

- [ ] **Step 5: Verifikasi backend & NPM tidak terganggu**

Run: `ssh Danu88@103.93.163.51 "docker ps --filter name=kaswise-backend --filter name=nginx-proxy-manager --format '{{.Names}} {{.Status}}'"`
Expected: `kaswise-backend` dan `nginx-proxy-manager` tetap `Up` (tidak restart).

---

## Task 4: Konfigurasi 3 Proxy Host di NPM

**Files:** (konfigurasi di NPM admin UI)

> Akses NPM admin: SSH tunnel port 81 → `http://localhost:8181` (lihat `docs/deployment/DEPLOY_VPS_HANDOVER.md`).

- [ ] **Step 1: Buka NPM admin**

Run: `ssh -L 8181:127.0.0.1:81 Danu88@103.93.163.51` *(biarkan terbuka)*, buka `http://localhost:8181`, login.
Expected: dashboard NPM tampil.

- [ ] **Step 2: Tambah Proxy Host — status.kaswise.com**

Manual → Hosts → Proxy Hosts → Add Proxy Host:
- Domain Names: `status.kaswise.com`
- Scheme: `http` · Forward Hostname: `kaswise-uptime-kuma` · Forward Port: `3001`
- Aktifkan: Block Common Exploits, Websockets Support
- Tab SSL: Request a new SSL Certificate (Let's Encrypt), Force SSL, HTTP/2 — Save.

- [ ] **Step 3: Tambah Proxy Host — health.kaswise.com**

Sama seperti Step 2, dengan:
- Domain Names: `health.kaswise.com`
- Forward Hostname: `kaswise-beszel` · Forward Port: `8090`
- Aktifkan Websockets Support · SSL Let's Encrypt + Force SSL.

- [ ] **Step 4: Tambah Proxy Host — panel.kaswise.com**

Sama seperti Step 2, dengan:
- Domain Names: `panel.kaswise.com`
- Forward Hostname: `kaswise-portainer` · Forward Port: `9000`
- Aktifkan Websockets Support · SSL Let's Encrypt + Force SSL.

- [ ] **Step 5: Verifikasi ketiga subdomain memuat via HTTPS**

Run: `for s in status health panel; do echo "$s -> $(curl -s -o /dev/null -w '%{http_code}' https://$s.kaswise.com)"; done`
Expected: tiap subdomain mengembalikan kode `200`, `302`, atau `401` (artinya NPM+SSL bekerja; `401`/redirect bisa muncul bila Cloudflare Access sudah aktif). **Bukan** `502`/`522`.

---

## Task 5: Pasang Cloudflare Access (Lapis 1 keamanan)

**Files:** (konfigurasi di Cloudflare Zero Trust dashboard)

- [ ] **Step 1: Buka Zero Trust → Access → Applications**

Manual: `one.dash.cloudflare.com` → pilih akun → Access → Applications → Add an application → **Self-hosted**.

- [ ] **Step 2: Buat aplikasi untuk tiap subdomain**

Manual, ulangi untuk `status`, `health`, `panel`:
- Application name: `Kaswise <nama>`
- Subdomain: `status`/`health`/`panel`, Domain: `kaswise.com`
- Session duration: 24 jam (atau preferensi).

- [ ] **Step 3: Buat policy "Allow owner only"**

Manual untuk tiap aplikasi → Add policy:
- Policy name: `Owner only`
- Action: **Allow**
- Include → **Emails** → `danubudiarto88@gmail.com` — Save.

- [ ] **Step 4: Verifikasi gerbang Access aktif**

Manual: buka `https://panel.kaswise.com` di browser samaran (incognito).
Expected: muncul halaman login Cloudflare Access (minta email + kode OTP), **bukan** langsung halaman Portainer.

- [ ] **Step 5: Verifikasi email pemilik bisa masuk**

Manual: login dengan email pemilik → terima kode OTP di email → masukkan.
Expected: setelah lolos, halaman Portainer (setup admin) tampil. Ulangi cek untuk `status` & `health`.

---

## Task 6: Inisialisasi Beszel Hub + sambungkan Agent

**Files:** Modify `/home/Danu88/monitoring/.env` di VPS (isi `BESZEL_KEY`)

> Dilakukan setelah NPM (Task 4) & Cloudflare Access (Task 5) aktif, jadi Beszel diakses lewat `https://health.kaswise.com` (lolos Access dengan email pemilik) — tanpa SSH tunnel.

- [ ] **Step 1: Buat akun admin Beszel**

Manual: buka `https://health.kaswise.com` → lolos Cloudflare Access → halaman pembuatan akun admin Beszel → isi email + password kuat unik → simpan di password manager.

- [ ] **Step 2: Add System → dapatkan KEY**

Manual: klik **Add System** → Name `kaswise-vps`, Host `host.docker.internal`, Port `45876`. UI menampilkan **public key**. **Salin public key** tersebut.

- [ ] **Step 3: Isi `BESZEL_KEY` di `.env` VPS**

Run: `ssh Danu88@103.93.163.51 "cd /home/Danu88/monitoring && sed -i 's#^BESZEL_KEY=.*#BESZEL_KEY=\"<TEMPEL_PUBLIC_KEY>\"#' .env && grep BESZEL_KEY .env"`
Expected: baris `BESZEL_KEY="ssh-ed25519 AAAA..."` terisi.

- [ ] **Step 4: Nyalakan agent**

Run: `ssh Danu88@103.93.163.51 "cd /home/Danu88/monitoring && docker compose up -d beszel-agent"`
Expected: container `kaswise-beszel-agent` `Up`.

- [ ] **Step 5: Verifikasi metrik muncul**

Manual di Beszel UI (refresh `https://health.kaswise.com`): sistem `kaswise-vps` menjadi **online/hijau**, menampilkan CPU/RAM/disk dan daftar container.
Expected: data metrik tampil dalam <60 detik.

---

## Task 7: Inisialisasi akun admin Uptime Kuma & Portainer

**Files:** (setup via UI, lewat Cloudflare Access)

- [ ] **Step 1: Setup admin Uptime Kuma**

Manual: buka `https://status.kaswise.com` (lolos Access) → buat username + password kuat unik → simpan di password manager.

- [ ] **Step 2: Setup admin Portainer**

Manual: buka `https://panel.kaswise.com` → buat user `admin` + password kuat unik (≥12 karakter) → simpan. Pilih **"Get Started"** → environment **local** (Docker socket).
Expected: Portainer menampilkan environment `local` dengan daftar container Kaswise.

- [ ] **Step 3: Verifikasi Portainer melihat container & bisa lihat log**

Manual: Containers → klik `kaswise-backend` → tab **Logs**.
Expected: log backend tampil (bukti socket Docker tersambung).

---

## Task 8: Konfigurasi monitor & notifikasi Telegram di Uptime Kuma

**Files:** (konfigurasi via UI)

- [ ] **Step 1: Tambah notifikasi Telegram**

Manual di Uptime Kuma → Settings → Notifications → Add → Type **Telegram** → isi **Bot Token** & **Chat ID** (dari Task 0) → **Test** → Save.
Expected: pesan tes masuk ke Telegram pemilik.

- [ ] **Step 2: Tambah monitor — Aplikasi (kaswise.com)**

Manual → Add New Monitor:
- Type: HTTP(s) · Friendly Name: `Aplikasi Kaswise` · URL: `https://kaswise.com`
- Interval: 60 dtk · aktifkan notifikasi Telegram · Save.

- [ ] **Step 3: Tambah monitor — Backend API**

Manual → Add New Monitor:
- Type: HTTP(s) · Name: `Backend API` · URL: `https://api.kaswise.com/health`
- Interval: 60 dtk · aktifkan notifikasi · Save.
Expected: kedua monitor menjadi **hijau/Up** dalam ~1 menit.

- [ ] **Step 4: Tambah monitor kedaluwarsa sertifikat**

Manual: pada monitor `Aplikasi Kaswise` → aktifkan "Certificate Expiry Notification" (peringatan H-14).

- [ ] **Step 5: Uji alert down → Telegram**

Manual: edit monitor `Backend API`, ganti URL sementara ke `https://api.kaswise.com/endpoint-tidak-ada-xyz` → Save → tunggu hingga status **Down**.
Expected: notifikasi "Down" masuk ke Telegram. Lalu **kembalikan URL ke `/health`** dan pastikan kembali **Up** (+ notifikasi "Up").

---

## Task 9: Konfigurasi alert ambang & Telegram di Beszel

**Files:** (konfigurasi via UI)

- [ ] **Step 1: Tambah notifikasi Telegram di Beszel**

Manual di Beszel → Settings → Notifications → tambah **Telegram** (Bot Token + Chat ID) → kirim test.
Expected: pesan tes masuk ke Telegram.

- [ ] **Step 2: Set alert ambang untuk sistem `kaswise-vps`**

Manual → pilih sistem → Alerts, aktifkan:
- **Memory** > 85%
- **Disk** > 85%
- **CPU** > 90% (durasi ≥ 5 menit)
Save.

- [ ] **Step 3: Uji satu alert (opsional, aman)**

Manual: sementara turunkan ambang Memory ke nilai di bawah pemakaian saat ini (mis. 10%) → tunggu → pastikan notifikasi Telegram masuk → **kembalikan ke 85%**.
Expected: satu pesan alert masuk, lalu ambang dikembalikan.

---

## Task 10: Pengecekan sumber daya & non-regresi

**Files:** (verifikasi)

- [ ] **Step 1: Cek pemakaian RAM total VPS**

Run: `ssh Danu88@103.93.163.51 "free -m | awk '/Mem:/{print \"used \"\$3\" MB / total \"\$2\" MB\"}'"`
Expected: `used` jauh di bawah total (target < 2500 MB).

- [ ] **Step 2: Cek pemakaian per container baru**

Run: `ssh Danu88@103.93.163.51 "docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' | grep -E 'uptime-kuma|beszel|portainer'"`
Expected: total ketiga + agent ≈ ≤ 350 MB.

- [ ] **Step 3: Verifikasi aplikasi tetap normal**

Run: `curl -s -o /dev/null -w '%{http_code}\n' https://kaswise.com && curl -s -o /dev/null -w '%{http_code}\n' https://api.kaswise.com/health`
Expected: keduanya `200`.

- [ ] **Step 4: Checklist Definition of Done (spec Bagian 10)**

Manual: lewati tiap poin 1–8 di spec → centang. Catat bila ada yang gagal sebagai task baru.

---

## Task 11: Panduan operasional bahasa awam untuk pemilik

**Files:**
- Create: `docs/ops/PANDUAN_DASHBOARD_VPS.md`

- [ ] **Step 1: Tulis panduan**

Buat `docs/ops/PANDUAN_DASHBOARD_VPS.md` berisi (bahasa awam, langkah klik):
1. **3 bookmark** & fungsinya: `status.` (situs hidup/mati), `health.` (kesehatan server), `panel.` (kelola container).
2. **Cara masuk:** lewat Cloudflare (email + kode OTP), lalu login alat.
3. **Apa yang harus dilakukan saat dapat alert Telegram:**
   - "Aplikasi Down" → buka `status.`, cek; bila perlu buka `panel.` → restart container terkait.
   - "RAM/Disk > 85%" → buka `health.`, lihat apa yang berat; hubungi teknisi bila perlu.
4. **Cara restart container di Portainer** (langkah klik + tombol Restart).
5. **Cara baca grafik Beszel** (hijau = sehat; merah = perlu perhatian).
6. **Yang TIDAK boleh disentuh** di Portainer (jangan hapus/stop `kaswise-backend` & `nginx-proxy-manager` sembarangan).

- [ ] **Step 2: (Opsional) Render PDF**

Bila diinginkan, buat versi PDF mengikuti pola `docs/ops/gen_panduan_pdf.py`.

- [ ] **Step 3: Commit**

```bash
git add docs/ops/PANDUAN_DASHBOARD_VPS.md
git commit -m "docs(ops): add plain-language VPS dashboard guide for owner"
```

---

## Verifikasi akhir (acceptance)

Setelah semua task: buka ketiga subdomain (lolos Cloudflare Access), pastikan Uptime Kuma menampilkan 2 monitor Up, Beszel menampilkan metrik VPS, Portainer bisa restart/lihat log. Picu satu down + satu ambang → dua-duanya mengirim Telegram. RAM VPS < 2.5 GB. `kaswise-backend` & NPM tidak terganggu.
