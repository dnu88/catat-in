# Kaswise — VPS Deployment Handover

**Last updated:** 2026-05-25 (update 4 — PWA live)
**Status:** ✅ DEPLOYMENT COMPLETE — semua domain live dengan HTTPS + PWA live di kaswise.com.

---

## 1. Infrastruktur Saat Ini

### VPS
- **Provider:** Biznet Neo Lite (`portal.neo.biznetcloud.com`)
- **IP publik:** `103.93.163.51`
- **OS:** Ubuntu 24.04 LTS, 3.8GB RAM, 2 CPU, 58GB disk
- **User:** `Danu88` (sudo NOPASSWD aktif)

### Cloud Firewall (Biznet Neo) — port terbuka
| Port | Fungsi |
|---|---|
| `22` | SSH |
| `80` | HTTP (NPM) |
| `443` | HTTPS (NPM) |

> Port `81` (NPM admin) **SUDAH DITUTUP** di cloud firewall. Akses NPM admin hanya via SSH tunnel.

### Akses NPM Admin
```bash
# Buka di Termius: SSH tunnel port 81 ke localhost:8181
# Lalu buka http://localhost:8181 di browser
# Credentials: danubudiarto88@gmail.com / (sudah diganti user)
```

### DNS (Cloudflare)
| Domain | Type | Target | Proxy |
|---|---|---|---|
| `kaswise.com` | A | `103.93.163.51` | 🟠 Proxied |
| `www.kaswise.com` | CNAME | `kaswise.com` | 🟠 Proxied |
| `api.kaswise.com` | A | `103.93.163.51` | 🟠 Proxied |
| `code.kaswise.com` | A | `103.93.163.51` | ⚪ DNS only |

---

## 2. Docker Containers

### Stack
| Container | Image | Port internal | Status |
|---|---|---|---|
| `nginx-proxy-manager` | `jc21/nginx-proxy-manager:latest` | 80, 443, 81 | ✅ Healthy |
| `kaswise-backend` | `catat-in-backend:latest` | 8000 | ✅ Healthy |
| `kaswise-placeholder` | `catat-in-backend:latest` | 8000 | ✅ Healthy |

### Network
- Semua container di network `proxy-network` (bridge)
- NPM pakai `extra_hosts: host.docker.internal:host-gateway` untuk akses `code-server` di host

### Docker Compose files
| File | Fungsi |
|---|---|
| `/home/Danu88/nginx-proxy-manager/docker-compose.yml` | NPM + placeholder |
| `/home/Danu88/catat-in/docker-compose.production.yml` | Backend Kaswise |

### Command berguna
```bash
# Status semua container
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# PENTING: SELALU sertakan overlay hardening (-f ops/hardening/docker/compose.hardening.yml)
# Tanpa itu, container backend di-recreate TANPA read_only/cap_drop/limit (hardening hilang).
cd /home/Danu88/catat-in

# Restart backend
sudo docker compose -f docker-compose.production.yml -f ops/hardening/docker/compose.hardening.yml --env-file .env.production up -d --force-recreate backend

# Rebuild backend setelah code change
sudo docker compose -f docker-compose.production.yml -f ops/hardening/docker/compose.hardening.yml --env-file .env.production build backend && \
sudo docker compose -f docker-compose.production.yml -f ops/hardening/docker/compose.hardening.yml --env-file .env.production up -d --force-recreate backend

# Logs backend
sudo docker logs kaswise-backend --tail 50 -f

# Logs NPM
sudo docker logs nginx-proxy-manager --tail 50
```

---

## 3. NPM Proxy Hosts

| ID | Domain | Forward ke | SSL cert | HTTPS |
|---|---|---|---|---|
| 1 | `api.kaswise.com` | `kaswise-backend:8000` | npm-2 (api.kaswise.com) | ✅ Force SSL |
| 2 | `code.kaswise.com` | `host.docker.internal:8080` | npm-1 (code.kaswise.com) | ✅ Force SSL |
| 3 | `kaswise.com`, `www.kaswise.com` | `kaswise-placeholder:8000` | npm-5 (kaswise.com + www) | ✅ Force SSL |

### Sertifikat Let's Encrypt (di NPM)
| ID | Domain | Expired |
|---|---|---|
| npm-1 | `code.kaswise.com` | 2026-08-23 |
| npm-2 | `api.kaswise.com` | 2026-08-23 |
| npm-5 | `kaswise.com`, `www.kaswise.com` | 2026-08-23 |

> Certbot sistem (`/etc/letsencrypt/`) sudah **disabled** — NPM yang handle renewal otomatis.

### Advanced config code.kaswise.com (WebSocket support)
Disuntik via SQLite langsung (NPM UI tidak support di mobile):
```nginx
proxy_read_timeout 3600;
proxy_send_timeout 3600;
proxy_buffering off;
proxy_request_buffering off;
```

---

## 4. Backend Kaswise

### Secrets — `/home/Danu88/catat-in/.env.production`
> ⚠️ chmod 600, JANGAN commit ke git

| Variable | Status |
|---|---|
| `ENVIRONMENT=production` | ✅ |
| `SECRET_KEY` | ✅ auto-generated 64-char hex |
| `SUPABASE_URL` | ✅ `https://xqvtsgfakuehjwdmenuw.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `ANTHROPIC_API_KEY` | ✅ `sk-ant-api03-...` |
| `ALLOWED_ORIGINS` | ✅ `https://kaswise.vercel.app,https://kaswise.com` |
| `ALLOWED_HOSTS` | ✅ `api.kaswise.com,localhost,127.0.0.1` |
| `MIDTRANS_*` | ⚠️ Kosong (belum dipakai) |

### Test endpoint
```bash
# Dari VPS host
curl https://api.kaswise.com/health
# → {"status":"ok","version":"0.1.0","environment":"production"}

# Dari dalam container NPM (bypass Cloudflare)
sudo docker exec nginx-proxy-manager curl -H "Host: api.kaswise.com" http://kaswise-backend:8000/health
```

> **Gotcha:** Backend pakai `TrustedHostMiddleware`. Request tanpa `Host: api.kaswise.com` akan HTTP 400 — ini normal.

---

## 5. kaswise.com — Expo PWA

Container `kaswise-placeholder` menjalankan Python SPA server (`server.py`) yang serve hasil build Expo web:
- **Server:** `/home/Danu88/nginx-proxy-manager/placeholder/server.py` — handle SPA fallback routing + cache headers
- **Build output:** `/home/Danu88/nginx-proxy-manager/placeholder/` (hasil `expo export --platform web`)
- **Manifest PWA:** `/home/Danu88/nginx-proxy-manager/placeholder/manifest.json`
- **Source app:** `/home/Danu88/catat-in/apps/mobile/`

### Cara rebuild setelah ada update kode
```bash
cd /home/Danu88/catat-in/apps/mobile

# Build web
# Build dan deploy PWA dengan config publik dari app.json / env runtime
corepack pnpm --filter mobile export:pwa
corepack pnpm --filter mobile deploy:pwa

# Deploy ke placeholder (jangan hapus server.py dan manifest.json!)
cp dist/index.html /home/Danu88/nginx-proxy-manager/placeholder/
cp dist/metadata.json /home/Danu88/nginx-proxy-manager/placeholder/
cp -r dist/_expo /home/Danu88/nginx-proxy-manager/placeholder/
cp -r dist/assets /home/Danu88/nginx-proxy-manager/placeholder/

# Re-inject Supabase config ke index.html (wajib — Metro tidak embed env vars)
# Lihat bagian <head> di index.html dan tambahkan script inject seperti yang ada
```

> ⚠️ **Gotcha penting:** Expo Metro web build tidak men-embed `EXPO_PUBLIC_*` env vars ke bundle.
> Supabase config di-inject manual via `<script>` di awal `index.html`. Setiap kali rebuild,
> pastikan script inject tetap ada di `placeholder/index.html` (bukan `dist/index.html`).

---

## 6. Layanan Sistem

| Layanan | Status |
|---|---|
| `nginx` (sistem) | ⛔ stopped + disabled |
| `certbot.timer` | ⛔ stopped + disabled |
| Docker Engine | ✅ running, auto-start |

---

## 7. Yang Masih Perlu Dilakukan

| # | Task | Prioritas |
|---|---|---|
| 1 | **Test end-to-end Supabase JWT auth** via backend (lihat Gotcha §8.1) | ⚠️ Medium |
| 2 | **Update `VITE_API_BASE_URL`** di Vercel jika web app dipakai | Medium |
| 3 | **Ganti placeholder** `kaswise.com` ke landing page sungguhan | Low |
| 4 | **Tutup port 81** hanya lewat SSH tunnel sudah cukup (sudah ditutup) | ✅ Done |
| 5 | **Integrasi fitur AI/Import** di mobile app ke `api.kaswise.com` | Future |
| 6 | **Amankan port 81 (NPM admin)** — kini HTTP polos publik. Proxy HTTPS + Access List, lalu tutup 81 di cloud firewall. Lihat hardening doc §6 | ⚠️ High |
| 7 | **Backup off-site** (rclone) — backup harian masih lokal di VPS | 🟠 Medium |

> 🛡️ **Hardening host/container sudah diterapkan 2026-06-03.** Deploy backend ke depan **WAJIB** menyertakan `-f ops/hardening/docker/compose.hardening.yml` (lihat §2), kalau tidak hardening container hilang. Detail lengkap & sisa pekerjaan: `docs/security/HARDENING_OPS_APPLIED_2026-06-03.md`.

---

## 8. Gotchas Penting

### 8.1 Supabase JWKS — belum ditest end-to-end
Backend `auth.py` fetch JWKS dari `/auth/v1/jwks`. Endpoint ini return 401 tanpa `apikey` header. Jika auth gagal di production, cek apakah perlu pass `apikey: {SUPABASE_ANON_KEY}` header saat fetch JWKS, atau Supabase project pakai HS256 (shared secret) bukan RS256.

### 8.2 code-server (code.kaswise.com) adalah service kritis
Jangan restart NPM tanpa cek dulu bahwa `code.kaswise.com` masih accessible. WebSocket timeout Cloudflare = 100s, itulah kenapa `code.kaswise.com` pakai DNS-only (bukan CF proxy).

### 8.3 NPM admin tidak support subpath
Pernah dicoba `https://kaswise.com/npm-admin/` — gagal karena HTML NPM pakai absolute asset path. Jangan ulangi. Selalu akses via SSH tunnel ke port 81.

### 8.4 kaswise-placeholder memakai image backend
Container `kaswise-placeholder` pakai image `catat-in-backend:latest` dengan command override `python -m http.server`. Ini karena Docker Hub timeout saat pull `nginx:alpine`. Jika di masa depan `nginx:alpine` bisa di-pull, ganti image untuk lebih ringan.

---

## 9. Referensi

| Resource | URL / Path |
|---|---|
| Frontend (Vercel) | `https://kaswise.vercel.app` |
| Backend API | `https://api.kaswise.com` |
| Code-server | `https://code.kaswise.com` |
| Supabase project | `https://supabase.com/dashboard/project/xqvtsgfakuehjwdmenuw` |
| Cloudflare DNS | `https://dash.cloudflare.com` |
| Biznet Neo portal | `https://portal.neo.biznetcloud.com` |
| Repo | `https://github.com/dnu88/catat-in` |
| **Hardening host/container (2026-06-03)** | `docs/security/HARDENING_OPS_APPLIED_2026-06-03.md` + bundle `ops/hardening/` |
| File secrets | `/home/Danu88/catat-in/.env.production` |
| NPM data | `/home/Danu88/nginx-proxy-manager/data/` |
| Placeholder HTML | `/home/Danu88/nginx-proxy-manager/placeholder/index.html` |
