# Kaswise — Operational Hardening Bundle

Bundle hardening **level host & infrastruktur** untuk VPS produksi Kaswise
(`103.93.163.51`, Ubuntu 24.04, Docker + Nginx Proxy Manager).

Ini melengkapi hardening **level aplikasi** yang sudah ada:

- `docs/security/SECURITY_HARDENING_PHASE_1_2026-05-31.md` (Supabase RLS, FastAPI JWT/CORS, import validation)
- `docs/security/SECURITY_PHASE_2_LIGHT_2026-05-31.md` (RLS regression tests, rate-limit plan, CSP plan)
- `ops/nginx/kaswise-pwa-security-headers.conf` (CSP/HSTS untuk PWA di NPM)

Bundle ini menambah lapisan yang belum ada: SSH, firewall host, auto-update,
fail2ban, hardening Docker daemon & container, audit posture, dan backup.

> ✅ **STATUS: sudah diterapkan ke produksi 2026-06-03.**
> Catatan terapan, bukti verifikasi, gotcha, dan sisa pekerjaan ada di
> `docs/security/HARDENING_OPS_APPLIED_2026-06-03.md`.
> ⚠️ Deploy backend WAJIB menyertakan `-f docker/compose.hardening.yml`
> (lihat bagian "Container hardening" di bawah).

> ⚠️ Semua skrip **idempoten** dan **non-destruktif by default**. Skrip yang
> berisiko (SSH, firewall, restart Docker) punya guard + konfirmasi dan tidak
> akan mengunci kamu keluar tanpa prasyarat terpenuhi.

---

## Konteks infra yang dijaga (JANGAN dirusak)

| Hal | Catatan |
|---|---|
| Port publik | Hanya `22`, `80`, `443` (cloud firewall Biznet = perimeter utama) |
| NPM admin (`81`) | **DIPAKAI user — JANGAN ditutup.** ufw meng-allow 81. `AllowTcpForwarding` tetap `yes` agar akses via SSH tunnel juga jalan |
| `code.kaswise.com` | Service kritis (code-server :8080), DNS-only (tanpa CF proxy). Jangan blok 8080 dari docker bridge |
| Cloudflare | `kaswise.com` & `api.kaswise.com` proxied → IP klien asli = IP Cloudflare. fail2ban di-scope ke **SSH saja** |
| `.env.production` | Rahasia, harus `chmod 600`, tidak boleh ke-commit |

---

## Urutan apply

Jalankan dari root repo (`/home/Danu88/catat-in`). Butuh `sudo`.

```bash
# Audit dulu — lihat posture saat ini (read-only, aman)
sudo bash ops/hardening/verify/audit.sh

# Lalu apply bertahap (atau pakai orchestrator di bawah)
sudo bash ops/hardening/host/01-ssh-hardening.sh
sudo bash ops/hardening/host/02-firewall-ufw.sh
sudo bash ops/hardening/host/03-unattended-upgrades.sh
sudo bash ops/hardening/host/04-fail2ban.sh
sudo bash ops/hardening/host/05-docker-daemon.sh   # minta konfirmasi sebelum restart Docker

# Atau semua sekaligus (interaktif, konfirmasi per langkah)
sudo bash ops/hardening/apply-all.sh

# Verifikasi ulang
sudo bash ops/hardening/verify/audit.sh
```

---

## Isi bundle

```
ops/hardening/
├── README.md                      # dokumen ini
├── apply-all.sh                   # orchestrator interaktif (panggil host/*)
├── host/
│   ├── 01-ssh-hardening.sh        # drop-in sshd config + guard key-auth
│   ├── 02-firewall-ufw.sh         # ufw deny-by-default (22/80/443) + caveat Docker
│   ├── 03-unattended-upgrades.sh  # auto security update Ubuntu
│   ├── 04-fail2ban.sh             # fail2ban jail sshd
│   └── 05-docker-daemon.sh        # daemon.json: log rotation + live-restore
├── config/
│   ├── sshd_hardening.conf        # → /etc/ssh/sshd_config.d/99-kaswise-hardening.conf
│   ├── jail.local                 # → /etc/fail2ban/jail.local
│   ├── docker-daemon.json         # → /etc/docker/daemon.json
│   ├── 50unattended-upgrades      # → /etc/apt/apt.conf.d/50unattended-upgrades
│   └── 20auto-upgrades            # → /etc/apt/apt.conf.d/20auto-upgrades
├── docker/
│   └── compose.hardening.yml      # overlay container hardening untuk backend
├── verify/
│   └── audit.sh                   # cek posture (read-only)
└── backup/
    └── backup.sh                  # backup .env.production + data NPM + placeholder
```

---

## Container hardening (opt-in)

Overlay `docker/compose.hardening.yml` menambah `no-new-privileges`, `cap_drop: ALL`,
`read_only`, `pids_limit`, dan resource limit ke container backend. Pakai dengan:

```bash
cd /home/Danu88/catat-in
sudo docker compose \
  -f docker-compose.production.yml \
  -f ops/hardening/docker/compose.hardening.yml \
  --env-file .env.production up -d --force-recreate backend
```

> Uji dulu `read_only: true`. Jika uvicorn/lib butuh tulis di luar `/tmp`,
> tambahkan `tmpfs` path atau set `read_only: false` di overlay.

---

## Caveat penting

1. **Docker mem-bypass ufw.** Port yang di-*publish* container (mis. NPM 80/443)
   diatur langsung di iptables rantai `DOCKER`, melewati `ufw`. Jadi `ufw` di sini
   adalah **defense-in-depth** untuk port yang dilayani host (SSH, code-server),
   bukan pengganti cloud firewall Biznet. Perimeter utama tetap cloud firewall.
2. **Jangan disable password SSH tanpa key.** `01-ssh-hardening.sh` menolak jalan
   kalau belum ada `authorized_keys` valid untuk user — supaya tidak terkunci.
3. **Restart Docker.** `05-docker-daemon.sh` mengaktifkan `live-restore` agar
   container tetap jalan saat daemon restart, tapi pengaktifan pertama tetap perlu
   restart daemon sekali. Skrip minta konfirmasi eksplisit.
4. **fail2ban hanya SSH.** Karena trafik web lewat Cloudflare/NPM, IP asli ter-mask;
   memban di layer itu berisiko memban CF. Rate-limit web ditangani di rencana
   Phase 2 (Redis/proxy) — lihat `docs/security/SECURITY_PHASE_2_LIGHT_*`.

## Rollback singkat

| Komponen | Rollback |
|---|---|
| SSH | hapus `/etc/ssh/sshd_config.d/99-kaswise-hardening.conf`, `sudo systemctl reload ssh` |
| ufw | `sudo ufw disable` |
| unattended-upgrades | `sudo dpkg-reconfigure -plow unattended-upgrades` (pilih No) |
| fail2ban | `sudo systemctl stop fail2ban && sudo systemctl disable fail2ban` |
| Docker daemon | restore `/etc/docker/daemon.json.bak-*`, `sudo systemctl restart docker` |
