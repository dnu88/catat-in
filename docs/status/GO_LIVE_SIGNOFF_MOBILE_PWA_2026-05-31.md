# Kaswise Mobile/PWA Go-live Sign-off — 2026-05-31

## Scope
Mobile/PWA live release for `https://kaswise.com` with Supabase-backed auth, wallet, budget, transactions, reports, AI capture, profile/preferences, PWA login/install behavior, and Phase 1 security hardening.

## Live identifiers
- Live PWA: `https://kaswise.com`
- API: `https://api.kaswise.com`
- Supabase project ref: `xqvtsgfakuehjwdmenuw`
- Live bundle at sign-off: `/_expo/static/js/web/entry-b9e79da27abf5783c63317a703f685cf.js`
- Latest app commit before sign-off: `9a7380f fix(mobile): stabilize go-live smoke flow`

## Automated validation
Latest go-live smoke command:

```bash
corepack pnpm --filter mobile test:golive
```

Primary result:

```text
5 passed
1 skipped
```

Post-migration rerun result after applying `202605310002` also exited successfully:

```text
4 passed
1 flaky recovered on retry
1 skipped
```

Coverage:
- Mobile public/runtime config check ✅
- Mobile login/logout ✅
- Mobile core finance E2E flow ✅
  - wallet create
  - budget create
  - manual transaction
  - reports category check
  - transaction edit affordance
  - AI text capture
  - transaction/budget allocation persistence
- Desktop public/runtime config check ✅
- Desktop login/logout ✅
- Desktop core finance skipped by design because data-mutating smoke runs once on mobile ✅

Additional validation after sign-off hardening:

```text
mobile type-check ✅
budget-envelopes Jest test ✅
post-migration go-live smoke exit code 0 ✅
Supabase migration dry-run: Remote database is up to date ✅
API health: {"status":"ok","version":"0.1.0","environment":"production"} ✅
PWA security headers: CSP/HSTS/X-Frame-Options present ✅
```

## Manual QA confirmation
User manually confirmed category-color QA is sesuai after latest PWA deploy.

## Security/data follow-ups completed in this sign-off pass
1. Legacy JWT-style key references in tracked docs were redacted/replaced with placeholders or `sb_publishable_...` guidance.
2. Live DB was repaired with idempotent allocation uniqueness migration:
   - Migration: `supabase/migrations/202605310002_repair_transaction_envelope_allocations_unique.sql`
   - Applied via explicit `supabase db query --linked --file ...`
   - Migration history repaired as applied: `202605310002`
   - Verified unique index exists:
     `transaction_envelope_allocations_tx_env_uidx` on `(transaction_id, envelope_id)`
3. Supabase migration dry-run confirms remote DB is up to date.

## Known non-mobile blockers
These remain outside the mobile/PWA go-live scope:
- Web type-check still has React typing mismatch around `NavLink` JSX usage.
- Web theme test still has color expectation mismatch.
- Backend pytest cannot run in system Python until pytest/FastAPI test deps are installed.

## Rollback notes
If a critical PWA regression appears:
1. Revert/deploy the previous known-good mobile commit or restore previous PWA bundle from backup if available.
2. Re-run:
   ```bash
   corepack pnpm --filter mobile export:pwa
   corepack pnpm --filter mobile deploy:pwa
   ```
3. Verify:
   ```bash
   curl -fsS https://api.kaswise.com/health
   corepack pnpm --filter mobile test:golive
   ```

The DB uniqueness migration is additive/idempotent and should not be rolled back under normal operation; it prevents duplicate budget deductions.

## Post sign-off monitoring checklist
Run for at least 24 hours:

```bash
docker logs kaswise-backend --tail 100 -f
```

```bash
tail -f /home/Danu88/nginx-proxy-manager/data/logs/proxy-host-3_error.log
```

```bash
tail -f /home/Danu88/nginx-proxy-manager/data/logs/proxy-host-1_error.log
```

Watch for auth errors, Supabase REST errors, PWA asset 404s, Edge Function failures, and unexpected backend 5xx responses.

## Recommended next phase
After 24h stable monitoring:
- Security Phase 2: Redis/proxy-backed rate limiting, RLS regression tests, audit logs for financial mutations, CSP `unsafe-inline` reduction, and optional BFF + HttpOnly session architecture.
- Cleanup Phase 2: move root docs into `docs/*`, decide final location for design-system assets, split large Settings screen.
