# AI Continuation Handoff — Kaswise Option B Domain Migration — 2026-07-16

## Goal

Migrate Kaswise public/app routing to Option B:

```text
kaswise.com      = public landing / marketing site
www.kaswise.com  = 301 redirect to kaswise.com
app.kaswise.com  = Kaswise PWA application
api.kaswise.com  = backend API
```

## What changed

### Code/config

- `apps/web/src/pages/LandingPage.tsx`
  - Default landing CTA now points to `https://app.kaswise.com`.
- `apps/web/src/App.test.tsx`
  - Updated CTA expectation to `https://app.kaswise.com`.
- `apps/web/vite.config.ts`
  - Added `kaswise.com` to preview allowed hosts.
- `apps/mobile/scripts/verify-live-url.mjs`
- `apps/mobile/scripts/marker-diff-report.mjs`
- `apps/mobile/scripts/generate-release-report.mjs`
  - Default live PWA URL is now `https://app.kaswise.com/`.
- `backend/app/core/config.py`
  - Added `https://app.kaswise.com` to required CORS origins.
  - Added `app.kaswise.com` to required allowed hosts.
- `supabase/config.toml`
  - Added local config entries for `https://app.kaswise.com/callback` and `https://app.kaswise.com/reset-password`.
- `.env.production`
  - Added `https://app.kaswise.com` to `ALLOWED_ORIGINS`.
  - Added `app.kaswise.com` to `ALLOWED_HOSTS`.
  - Changed `MAYAR_REDIRECT_URL` to `https://app.kaswise.com/upgrade`.

Backups created:

```text
/home/Danu88/apps/kaswise/.env.production.bak.app-domain-20260716
/home/Danu88/nginx-proxy-manager/data/database.sqlite.bak-option-b-20260716
/home/Danu88/nginx-proxy-manager/data/nginx/proxy_host/3.conf.bak-option-b-20260716
```

### Landing deployment

Created a dedicated static landing service:

```text
/home/Danu88/services/kaswise-landing/docker-compose.yml
/home/Danu88/services/kaswise-landing/server.py
/home/Danu88/services/kaswise-landing/site/
```

Container:

```text
kaswise-landing
```

The landing server serves the built `apps/web/dist` output and redirects app-like legacy paths to `https://app.kaswise.com`, including:

```text
/login
/register
/reset-password
/auth/callback
/callback
/upgrade
/transactions
/capture
/wallets
/budgets
/bills
/reports
/groups
/imports
/settings
/notifications
```

### Nginx Proxy Manager routing

NPM database was updated:

```text
proxy_host 3: ["kaswise.com"]      -> kaswise-landing:8000
proxy_host 9: ["app.kaswise.com"]  -> kaswise-placeholder:8000
redirection_host 1: ["www.kaswise.com"] -> https://kaswise.com$request_uri
```

Important: NPM did not regenerate config files from the edited SQLite DB on restart. Manual config files were written and reloaded:

```text
/data/nginx/proxy_host/3.conf
/data/nginx/proxy_host/9.conf
/data/nginx/redirection_host/1.conf
```

After writing configs:

```bash
docker exec nginx-proxy-manager nginx -t
docker exec nginx-proxy-manager nginx -s reload
```

passed.

### Backend redeploy

Backend container was rebuilt and recreated with the updated `.env.production` values.

Verified live env inside container:

```text
ALLOWED_ORIGINS=https://kaswise.vercel.app,https://kaswise.com,https://www.kaswise.com,https://app.kaswise.com
ALLOWED_HOSTS=api.kaswise.com,kaswise.com,www.kaswise.com,app.kaswise.com,localhost,127.0.0.1
MAYAR_REDIRECT_URL=https://app.kaswise.com/upgrade
```

## Verification performed

### Build/tests

```bash
corepack pnpm --filter @kaswise/web type-check
corepack pnpm --filter @kaswise/web test
corepack pnpm --filter @kaswise/web build:static
corepack pnpm --filter mobile type-check
python3 -m py_compile backend/app/core/config.py
```

Results:

```text
web type-check: PASS
web tests: PASS — 3 files, 11 tests
web build:static: PASS
mobile type-check: PASS
backend config syntax: PASS
```

### Runtime checks

```text
kaswise-landing: healthy
kaswise-backend: healthy
kaswise-placeholder: healthy
nginx-proxy-manager: running
```

Public/direct checks:

```text
https://kaswise.com       -> 200 OK, landing title: "Kaswise — Catat Keuangan, Bijak Setiap Hari"
https://www.kaswise.com   -> 301 to https://kaswise.com/
api CORS preflight from https://app.kaswise.com -> 200 OK with access-control-allow-origin: https://app.kaswise.com
https://api.kaswise.com/health -> {"status":"ok","version":"0.1.0","environment":"production"}
```

PWA origin routing was verified with a host override because public DNS is not created yet:

```bash
curl -k --resolve app.kaswise.com:443:103.93.163.51 https://app.kaswise.com/
```

Results:

```text
app.kaswise.com origin route -> 200 OK, x-served-by: app.kaswise.com
PWA entry bundle -> entry-04fe09598c03ec989f8f4231f002f2c8.js
required live markers -> 32/32 present
manifest.json -> valid standalone PWA manifest
```

## External actions completed after initial migration

User confirmed Cloudflare DNS and Supabase Auth redirect URLs were added.

Follow-up verification and fix performed:

- `app.kaswise.com` DNS now resolves through Cloudflare.
- Initial public `https://app.kaswise.com` returned Cloudflare `526` because origin Nginx still served a cert without `app.kaswise.com` SAN.
- Issued a dedicated Let's Encrypt cert with certbot webroot:

```bash
sudo certbot certonly --webroot \
  --config-dir /home/Danu88/nginx-proxy-manager/letsencrypt \
  --work-dir /tmp/certbot-work-kaswise-app \
  --logs-dir /tmp/certbot-logs-kaswise-app \
  -w /home/Danu88/nginx-proxy-manager/data/letsencrypt-acme-challenge \
  -d app.kaswise.com \
  --agree-tos --non-interactive --email danubudiarto88@gmail.com --keep-until-expiring
```

- Updated `/home/Danu88/nginx-proxy-manager/data/nginx/proxy_host/9.conf` to use:

```nginx
ssl_certificate /etc/letsencrypt/live/app.kaswise.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/app.kaswise.com/privkey.pem;
```

- Ran `nginx -t` and reloaded NPM Nginx.

Post-fix results:

```text
https://app.kaswise.com -> 200 OK, x-served-by: app.kaswise.com
KASWISE_LIVE_URL=https://app.kaswise.com/ corepack pnpm --filter mobile verify:live-url -> PASS, 32/32 markers
Supabase Google authorize with redirect_to=https://app.kaswise.com/callback -> 302 to Google OAuth
https://app.kaswise.com/callback -> 200 OK
https://app.kaswise.com/reset-password -> 200 OK
```

## Recommended next verification after user testing

```bash
dig +short app.kaswise.com A app.kaswise.com AAAA
curl -I https://app.kaswise.com/
KASWISE_LIVE_URL=https://app.kaswise.com/ corepack pnpm --filter mobile verify:live-url
curl -i -X OPTIONS https://api.kaswise.com/health \
  -H 'Origin: https://app.kaswise.com' \
  -H 'Access-Control-Request-Method: GET'
```

Then manually verify:

- Email/password login on `https://app.kaswise.com`.
- Google OAuth login redirects back to `https://app.kaswise.com/callback`.
- Reset password redirects to `https://app.kaswise.com/reset-password`.
- Core PWA flows: dashboard, capture, transactions, wallets, budgets, reports.
