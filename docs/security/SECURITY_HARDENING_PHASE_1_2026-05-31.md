# Kaswise Security Hardening Phase 1

Date: 2026-05-31
Repo: `/home/Danu88/catat-in`
Scope: first-pass production security hardening for Supabase/FastAPI/PWA surfaces.

## Implemented Changes

### 1. Supabase billing/quota protection migration

New migration:

```text
supabase/migrations/202605310001_security_hardening_phase1.sql
```

Protects server-managed fields:

```text
profiles.plan_type
profiles.plan_expires_at
```

Adds trigger:

```text
prevent_profile_server_managed_field_change
```

Also removes direct client mutation policies for:

```text
usage_counters insert/update/delete
```

`usage_counters_select_own` remains available so users can still read their own quota/usage display.

### 2. FastAPI Supabase JWT hardening

Updated:

```text
backend/app/core/auth.py
```

Improvements:

- JWKS keys are cached in memory with TTL.
- Handles key rotation by refreshing cache once when `kid` is not found.
- Verifies JWT audience.
- Verifies JWT issuer.
- Verifies `role == authenticated`.
- Validates `sub` as UUID.
- Adds real `require_premium()` enforcement using server-side profile lookup.

Relevant environment overrides:

```text
SUPABASE_JWKS_CACHE_SECONDS=3600
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_JWT_ISSUER=https://<project>.supabase.co/auth/v1
SUPABASE_JWT_SECRET=<legacy HS256 Supabase JWT secret, only if project still uses HS256>
```

### 3. FastAPI CORS hardening

Updated:

```text
backend/main.py
backend/app/core/config.py
```

Changes:

- Added production origins:
  ```text
  https://kaswise.com
  https://www.kaswise.com
  ```
- Replaced wildcard methods with explicit methods.
- Replaced wildcard headers with explicit auth/content headers.
- Added `CORS_ALLOW_CREDENTIALS=false` default.
- Added production hosts to trusted host configuration.

### 4. Import endpoint validation/data-integrity hardening

Updated:

```text
backend/app/api/v1/imports.py
```

Changes:

- Replaced `transactions: list[dict]` with strict Pydantic model.
- Validates:
  ```text
  wallet_id UUID
  date
  type income|expense
  amount > 0
  amount max digits/decimals
  description length
  category length
  hash format
  max transaction count
  ```
- Removed manual wallet balance update after transaction insert.
- Wallet balance is expected to be maintained by DB trigger/RPC source-of-truth to avoid double-counting.

### 5. Supabase Edge Function CORS hardening

Updated:

```text
supabase/functions/process-image/index.ts
supabase/functions/process-text/index.ts
supabase/functions/process-voice/index.ts
```

Changes:

- Removed `Access-Control-Allow-Origin: *`.
- Default origin is now:
  ```text
  https://kaswise.com
  ```
- Runtime override supported via:
  ```text
  KASWISE_ALLOWED_ORIGIN
  ```
- Adds explicit methods:
  ```text
  POST, OPTIONS
  ```

### 6. Image AI URL restriction

Updated:

```text
supabase/functions/process-image/index.ts
```

Adds validation so `image_url` must point to the configured Kaswise Supabase Storage host and storage object path. This reduces abuse where an authenticated user could send arbitrary third-party image URLs to the AI extraction function.

## Validation Performed

```bash
python3 -m compileall -q backend/app
corepack pnpm --filter mobile type-check
```

Results:

```text
backend Python syntax compile ✅
mobile type-check ✅
```

## Operational Follow-up Required

This code/migration hardening does **not** rotate secrets automatically.

Manual action still required:

```text
Rotate SUPABASE_SERVICE_ROLE_KEY in Supabase and all deployment environments.
```

Deployment follow-up:

1. Apply new Supabase migration to live DB.
2. Deploy FastAPI backend with the updated auth/CORS/import code.
3. Deploy Supabase Edge Functions if those functions are used in production.
4. Configure Edge Function secret if needed:
   ```bash
   supabase secrets set KASWISE_ALLOWED_ORIGIN=https://kaswise.com
   ```
5. Add PWA security headers/CSP at Nginx Proxy Manager or upstream serving layer.

## Remaining Security Work

Recommended next hardening phase:

1. Add Redis/proxy-backed rate limiting.
2. Add PWA security headers/CSP at serving layer.
3. Consider BFF + HttpOnly cookie model for PWA sessions.
4. Add audit logs for transaction/wallet/profile billing changes.
5. Add DB constraints for financial values if not already present.
6. Add automated RLS regression tests for BOLA prevention.
