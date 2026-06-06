# Kaswise — Operational Hardening Applied (Handover)

**Tanggal:** 2026-06-03
**Repo:** `/home/Danu88/catat-in`
**VPS:** Biznet Neo `103.93.163.51` (Ubuntu 24.04), Docker + Nginx Proxy Manager
**Status:** ✅ Diterapkan ke produksi & terverifikasi. Beberapa item lanjutan masih terbuka (lihat §6).

> Dokumen ini melengkapi:
> - `docs/deployment/DEPLOY_VPS_HANDOVER.md` (state infra kanonik — **baca dulu**)
> - `docs/security/SECURITY_HARDENING_PHASE_1_2026-05-31.md` (hardening level aplikasi)
> - `docs/security/SECURITY_PHASE_2_LIGHT_2026-05-31.md`
> - `ops/hardening/README.md` (bundle skrip + caveat + rollback)

---

## 1. Ringkasan

Penambahan lapisan hardening **level host & container** di atas hardening
aplikasi yang sudah ada. Semua artefak skrip/config hidup di repo: `ops/hardening/`.
Bundle ini idempoten dan punya skrip audit read-only (`ops/hardening/verify/audit.sh`).

Posture naik dari baseline aplikasi ke host+container yang ter-hardening. Sisa
gap utama: **port 81 (NPM admin) masih HTTP polos publik** dan **belum ada
backup off-site** (lihat §6).

---

## 2. Yang sudah diterapkan (live di VPS)

| # | Area | Tindakan | Bukti verifikasi |
|---|------|----------|------------------|
| 1 | SSH | Drop-in `/etc/ssh/sshd_config.d/99-kaswise-hardening.conf`: password-auth OFF, root-login OFF, `AllowTcpForwarding yes` (tunnel NPM), MaxAuthTries 3 | `sshd -T` → `passwordauthentication no`, `permitrootlogin no` |
| 2 | Firewall | ufw `default deny incoming`; allow 22/80/443/**81** + `172.18.0.0/16 → 8080` | `ufw status` |
| 3 | Auto-update | `unattended-upgrades` (security-only, **tanpa** auto-reboot) | `unattended-upgrade --dry-run` |
| 4 | fail2ban | Jail `sshd` + `recidive` (SSH saja — web di belakang Cloudflare/NPM) | `fail2ban-client status sshd` (sudah ban IP nyata) |
| 5 | Docker daemon | `/etc/docker/daemon.json`: `live-restore`, log-rotation 10m×5, `no-new-privileges`. Diaktifkan via **`systemctl reload docker`** (tanpa downtime) | `docker info` → `LiveRestoreEnabled: true` |
| 6 | Container backend | Overlay `read_only` + `cap_drop ALL` + `no-new-privileges` + `pids_limit 256` + mem 768m + cpus 1 | `docker inspect kaswise-backend` → `ReadonlyRootfs=true CapDrop=[ALL]` |
| 7 | sudo | `/etc/sudoers.d/95-kaswise-sensitive`: pertahankan `NOPASSWD:ALL` harian, tapi **wajib password** untuk perintah sensitif | `sudo -l` (lihat §3.7) |
| 8 | Backup | Cron root harian 03:00 → `/home/Danu88/backups`, retensi 14, +sha256 | `crontab -l` (root), test run 784K OK |
| 9 | Bersih-bersih | Matikan `vite preview` nyasar (`apps/web`) di :4173; hapus rule ufw stray :20128 | `ss -tlnp` (4173 hilang) |

---

## 3. Detail per komponen

### 3.1 SSH
- Drop-in: `ops/hardening/config/sshd_hardening.conf` → `/etc/ssh/sshd_config.d/99-kaswise-hardening.conf`.
- **Catatan:** sudah ada `60-cloudimg-settings.conf` yang juga set `PasswordAuthentication no`. Drop-in kita memperkuat & konsisten.
- `AllowTcpForwarding yes` **wajib** dipertahankan (user akses NPM admin port 81 via SSH tunnel & juga browser).
- Login user saat ini **publickey** (ED25519). Guard di skrip menolak disable password kalau `authorized_keys` kosong.

### 3.2 Firewall (ufw) — KRITIS
- Perimeter utama tetap **cloud firewall Biznet** (hanya 22/80/443 di portal). ufw = defense-in-depth.
- **GOTCHA yang sempat memutus layanan:** code-server (`code.kaswise.com`) jalan sebagai **proses HOST** di `0.0.0.0:8080`. NPM (container di `proxy-network`, subnet `172.18.0.0/16`) mencapainya via `host.docker.internal`. Saat `ufw default deny incoming` diaktifkan, jalur bridge→host:8080 **ikut terblokir → code.kaswise.com DOWN**.
  - **Fix permanen:** `ufw allow from 172.18.0.0/16 to any port 8080 proto tcp` — sudah masuk otomatis di `ops/hardening/host/02-firewall-ufw.sh` (subnet dideteksi dinamis dari `docker network inspect proxy-network`).
  - **JANGAN** aktifkan ufw tanpa rule ini.
- Port yang di-*publish* container (NPM 80/443/81 via docker-proxy) **bypass ufw** (rantai iptables `DOCKER`). Jadi penutupan port container harus di cloud firewall atau pakai `ufw-docker`.

### 3.3 unattended-upgrades
- Config: `ops/hardening/config/{50unattended-upgrades,20auto-upgrades}`.
- Hanya origin `*-security`. Docker & gh (repo pihak ketiga) **tidak** auto-upgrade → runtime produksi aman dari update tak terduga.
- `Automatic-Reboot "false"` — reboot tetap manual.

### 3.4 fail2ban
- Config: `ops/hardening/config/jail.local`. Scope **SSH saja**.
- Web TIDAK di-ban di sini: trafik lewat Cloudflare/NPM, IP klien ter-mask → ban berisiko memban Cloudflare. Rate-limit web = rencana Phase 2 (Redis/proxy).

### 3.5 Docker daemon
- Config: `ops/hardening/config/docker-daemon.json` (merge aman via `jq` jika `daemon.json` sudah ada).
- `live-restore` diaktifkan via **reload (SIGHUP)**, bukan restart → container tidak ikut mati (uptime tetap).
- `log-opts` (rotation) berlaku untuk container **baru**; container lama ikut saat di-recreate berikutnya.

### 3.6 Container hardening (backend) — PENTING untuk deploy berikutnya
- Overlay: `ops/hardening/docker/compose.hardening.yml`.
- **Perintah deploy WAJIB menyertakan overlay**, kalau tidak hardening hilang diam-diam saat recreate:
  ```bash
  cd /home/Danu88/catat-in
  sudo docker compose \
    -f docker-compose.production.yml \
    -f ops/hardening/docker/compose.hardening.yml \
    --env-file .env.production up -d --force-recreate backend
  ```
  (Command di `DEPLOY_VPS_HANDOVER.md` §2 sudah diperbarui menyertakan ini.)
- **Belum teruji di bawah `read_only`:** endpoint **import** (upload file). `/tmp` writable via tmpfs, semestinya cukup. Jika import error, tambahkan path tulis lain ke `tmpfs` di overlay atau set `read_only: false`.
- Placeholder/NPM container belum di-hardening (opsional).

### 3.7 sudo
- File: `/etc/sudoers.d/95-kaswise-sensitive` (salinan dok: `ops/hardening/config/sudoers-95-kaswise-sensitive`).
- Prefiks `95-` **wajib** agar sort setelah `90-cloud-init-users` (last-match-wins) supaya override berlaku.
- Perintah yang kini **minta password**: `visudo, useradd/userdel/usermod, groupadd/del/mod, passwd, chpasswd, su, reboot/shutdown/poweroff/halt, fdisk, dd, mkfs*`.
- **Batasan jujur:** `NOPASSWD:ALL` umum tetap ada → `sudo bash` masih root tanpa password. Ini menahan perintah destruktif/akun (terutama dari script/kesalahan), bukan benteng penuh atas SSH key bocor.
- User `Danu88` punya password Unix (`passwd -S` = `P`) → prompt password berfungsi.
- **Validasi sebelum pasang:** selalu `visudo -cf <file>` (skrip sudah melakukannya).

### 3.8 Backup
- Skrip: `ops/hardening/backup/backup.sh`. Cron root: `0 3 * * * .../backup.sh >> /home/Danu88/backups/backup.log 2>&1`.
- **Isi backup (yang tak tergantikan):** `.env.production` + `nginx-proxy-manager/data` (proxy config + cert DB + keys.json) + `nginx-proxy-manager/letsencrypt`. Ukuran ~784K.
- **Sengaja TIDAK di-backup:** `nginx-proxy-manager/placeholder` (290M, build PWA **regenerable** via `corepack pnpm --filter mobile export:pwa && deploy:pwa`).
- Data finansial ada di **Supabase Cloud** (managed backup, di luar VPS).
- Tiap arsip punya `.sha256`; folder `700 root`, file `600 root`; rotasi simpan 14 terbaru.

---

## 4. Verifikasi cepat (read-only)

```bash
cd /home/Danu88/catat-in
sudo bash ops/hardening/verify/audit.sh        # ringkasan posture host
sudo docker inspect kaswise-backend --format \
  'ReadonlyRootfs={{.HostConfig.ReadonlyRootfs}} CapDrop={{.HostConfig.CapDrop}}'
curl -s -H "Host: api.kaswise.com" https://api.kaswise.com/health   # → {"status":"ok",...}
curl -s -o /dev/null -w "%{http_code}\n" https://code.kaswise.com/  # → 302 (login redirect)
sudo crontab -l                                 # cek cron backup
```

Snapshot audit 2026-06-03: semua item OK (SSH, ufw, auto-update, fail2ban, docker daemon, secrets 600, restart policy).

---

## 5. Inventaris file (di repo)

```
ops/hardening/
├── README.md                          # overview, urutan apply, caveat, rollback
├── apply-all.sh                       # orchestrator interaktif (TTY)
├── host/
│   ├── 01-ssh-hardening.sh
│   ├── 02-firewall-ufw.sh             # + rule KRITIS bridge→8080 (auto-detect subnet)
│   ├── 03-unattended-upgrades.sh
│   ├── 04-fail2ban.sh
│   └── 05-docker-daemon.sh
├── config/
│   ├── sshd_hardening.conf
│   ├── jail.local
│   ├── docker-daemon.json
│   ├── 50unattended-upgrades, 20auto-upgrades
│   └── sudoers-95-kaswise-sensitive   # salinan dok dari /etc/sudoers.d/95-...
├── docker/compose.hardening.yml       # overlay container backend
├── verify/audit.sh
└── backup/backup.sh
```

File sistem yang diubah (di luar repo): `/etc/ssh/sshd_config.d/99-kaswise-hardening.conf`,
`/etc/docker/daemon.json` (+`.bak-*`), `/etc/fail2ban/jail.local`,
`/etc/apt/apt.conf.d/{50unattended-upgrades,20auto-upgrades}`,
`/etc/sudoers.d/95-kaswise-sensitive`, ufw rules, root crontab.

---

## 6. Sisa pekerjaan (untuk model/sesi berikutnya)

Urut prioritas:

1. **🔴 Port 81 (NPM admin) — risiko tertinggi.** User akses via browser → login admin lewat **HTTP polos di internet publik** (rawan sniff & brute force). Rencana:
   - Buat Proxy Host NPM, mis. `npm.kaswise.com` → `127.0.0.1:81` (atau container NPM), **Force SSL** + Let's Encrypt.
   - Tambah **Access List** (basic auth) atau IP allowlist di tab Advanced.
   - Setelah `https://npm.kaswise.com` jalan, **tutup port 81** di cloud firewall Biznet.
   - Butuh akses NPM UI (via SSH tunnel) + portal Biznet — **tidak bisa otomatis**.
2. **🟠 Backup off-site.** Backup masih lokal di VPS — hilang jika disk/VPS hilang. Setup `rclone` ke object storage + enkripsi (butuh kredensial storage).
3. **🟡 Uji endpoint import di bawah `read_only`.** Pastikan upload/parse CSV/Excel tidak butuh tulis di luar `/tmp`. Jika gagal, sesuaikan `tmpfs` di overlay.
4. **🟡 Verifikasi rotasi `SUPABASE_SERVICE_ROLE_KEY`.** User menyatakan sudah dirotasi (2026-06-03). Pastikan key baru sudah terpasang di `.env.production`, backend, Edge Functions, dan Vercel — lalu backend di-recreate (dengan overlay).
5. **🟢 Opsional:** rate-limit web (Redis/proxy, Phase 2), DB audit logs (Phase 2), hardening container placeholder/NPM, cabut/perketat NOPASSWD lebih jauh, enable 2FA/IP-allowlist code-server.

---

## 7. Rollback singkat

| Komponen | Rollback |
|---|---|
| SSH | hapus `/etc/ssh/sshd_config.d/99-kaswise-hardening.conf`; `sudo systemctl reload ssh` |
| ufw | `sudo ufw disable` |
| unattended-upgrades | `sudo dpkg-reconfigure -plow unattended-upgrades` |
| fail2ban | `sudo systemctl disable --now fail2ban` |
| Docker daemon | restore `/etc/docker/daemon.json.bak-*`; `sudo systemctl restart docker` (akan blip NPM) |
| Container backend | recreate **tanpa** overlay `-f ops/hardening/docker/compose.hardening.yml` |
| sudo | `sudo rm /etc/sudoers.d/95-kaswise-sensitive` (validasi: `sudo visudo -c`) |
| Backup cron | `sudo crontab -e` lalu hapus baris backup |
```
