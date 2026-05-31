# Security Operations Deploy — 2026-05-31

Date: 2026-05-31
Repo: `/home/Danu88/catat-in`
Live PWA: `https://kaswise.com`
API: `https://api.kaswise.com`
Supabase project ref: `xqvtsgfakuehjwdmenuw`

## Summary

Operational follow-up after Security Hardening Phase 1.

Completed:

1. Backend FastAPI security hardening deployed.
2. Supabase Edge Functions redeployed.
3. PWA CSP/security headers added through Nginx Proxy Manager.
4. Backend JWT verification adjusted for live Supabase ES256/JWKS signing key.

Still manual/pending:

```text
Rotate SUPABASE_SERVICE_ROLE_KEY in Supabase Dashboard and update all deployment environments.
```

The current Supabase CLI can list API keys but does not provide a service-role-key rotation command.

## Backend FastAPI Deploy

Updated files:

```text
backend/app/core/auth.py
docker-compose.production.yml
```

Important live JWT observation:

```text
Supabase JWKS key type: EC
Supabase JWKS alg: ES256
```

Backend auth now supports:

```text
RSA / RS256-family
EC / ES256-family
legacy HS256 via SUPABASE_JWT_SECRET if needed
```

Deployment commands used:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production build backend
docker compose -f docker-compose.production.yml --env-file .env.production up -d --force-recreate backend
```

Validation:

```bash
curl -fsS https://api.kaswise.com/health
```

Result:

```json
{"status":"ok","version":"0.1.0","environment":"production"}
```

Container status:

```text
kaswise-backend healthy
```

## Supabase Edge Functions Deploy

Secret set:

```bash
supabase secrets set KASWISE_ALLOWED_ORIGIN=https://kaswise.com --project-ref xqvtsgfakuehjwdmenuw
```

Functions redeployed:

```bash
supabase functions deploy process-image --project-ref xqvtsgfakuehjwdmenuw
supabase functions deploy process-text --project-ref xqvtsgfakuehjwdmenuw
supabase functions deploy process-voice --project-ref xqvtsgfakuehjwdmenuw
```

Result:

```text
process-image deployed ✅
process-text deployed ✅
process-voice deployed ✅
```

## PWA CSP / Security Headers

Applied to Nginx Proxy Manager proxy host:

```text
id: 3
domains: kaswise.com, www.kaswise.com
forward: kaswise-placeholder:8000
```

Configured headers:

```text
Content-Security-Policy
X-Frame-Options
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Strict-Transport-Security
```

Nginx validation:

```bash
docker exec nginx-proxy-manager nginx -t
docker exec nginx-proxy-manager nginx -s reload
```

Result:

```text
nginx config syntax ok ✅
nginx reload ok ✅
```

Live header verification:

```bash
curl -fsS -H 'Cache-Control: no-cache' -D - -o /dev/null 'https://kaswise.com/?security-header-check=1'
```

Observed headers:

```text
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data:; connect-src 'self' https://api.kaswise.com https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self' blob:;
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(self), microphone=(self), geolocation=(), payment=()
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

Implementation note:

- Nginx Proxy Manager stores the header block in `proxy_host.advanced_config` for host id 3.
- Because NPM's `proxy.conf` defines `add_header X-Served-By` inside `location /`, the same security headers were also inserted into generated `data/nginx/proxy_host/3.conf` inside `location /` and Nginx was reloaded.
- If NPM regenerates proxy host files later, re-check live headers.

## Service Role Key Rotation — Pending Manual Action

Required manual steps:

1. Open Supabase Dashboard for project `xqvtsgfakuehjwdmenuw`.
2. Rotate/regenerate the service role key according to Supabase's current dashboard flow.
3. Update `.env.production` on the VPS:
   ```text
   SUPABASE_SERVICE_ROLE_KEY=<new value>
   ```
4. Update any other environments using the old key.
5. Recreate backend:
   ```bash
   docker compose -f docker-compose.production.yml --env-file .env.production up -d --force-recreate backend
   ```
6. Update Edge Function secret if any function secret still references the old service role manually. Supabase-managed `SUPABASE_SERVICE_ROLE_KEY` is normally provided by the platform, but verify in Dashboard secrets.
7. Validate:
   ```bash
   curl -fsS https://api.kaswise.com/health
   ```

Do not paste the new service role key into chat or commit it to git.
