# AI Continuation Handoff — Repo Status Snapshot

Date: 2026-05-31
Repo: `/home/Danu88/catat-in`
Branch: `main`
Live PWA: `https://kaswise.com`

## Why This File Exists

User requested the current repo state be saved as both:

```text
1. status snapshot
2. handoff
```

The paired status snapshot is:

```text
docs/status/REPO_STATUS_SNAPSHOT_2026-05-31.md
```

This handoff is optimized for future AI/dev continuation.

## Current Repo State

Latest commits before this handoff:

```text
b1c1147 chore: document safe project cleanup
1db4e47 docs: add mobile profile preferences handoff
633845b fix(mobile): persist app preferences and improve avatar contrast
46bd4ff fix(mobile): show saved profile visual on dashboard
74f1c88 fix(mobile): persist profile visual preference
6f992a3 fix(mobile): auto hide profile photo success
75750f8 fix(mobile): localize category taxonomy
6ce34c4 docs: add mobile auth profile settings handoff
```

Latest observed deployed PWA bundle:

```text
/_expo/static/js/web/entry-017cde22f805335d7280abca0f0facb3.js
```

Working tree was clean before creating this handoff/snapshot.

## Primary Project Priority

Continue to prioritize:

```text
apps/mobile
Kaswise mobile/PWA
```

Do not start broad web/backend cleanup unless user explicitly asks.

## Key Product/Engineering Context

User prefers Indonesian communication.

Design preference:

```text
clean, modern, premium fintech, rounded cards, soft elevation, mobile-first
```

For UI/design work, review:

```text
PRODUCT.md
DESIGN.md
/home/Danu88/.agents/skills/impeccable/SKILL.md
```

Important constraints:

- Do not expose secrets.
- Rotate previously shared `SUPABASE_SERVICE_ROLE_KEY`.
- Mobile/PWA first.
- Use existing Kaswise design system and semantic theme tokens.
- Validate before deploy.
- Keep placeholder features hidden for first go-live.
- Category visual source of truth should remain `categories` with budget visual fallback.
- Profile visual source of truth should remain Supabase auth metadata with `profile_visual_mode`.

## Current Architecture

```text
apps/mobile     Expo Router React Native PWA
apps/web        React/Vite web app
backend         FastAPI backend
packages/shared Shared types/theme primitives
supabase        PostgreSQL migrations, storage policies, edge functions
docs            project docs, cleanup notes, handoffs/status
```

Project structure doc:

```text
docs/PROJECT_STRUCTURE.md
```

Safe cleanup doc:

```text
docs/cleanup/SAFE_CLEANUP_PHASE_1_2026-05-30.md
```

## Mobile/PWA Completed Work

Completed areas include:

- Auth/register/login hardening.
- Installed PWA Google OAuth redirect fix.
- Logout responsiveness.
- Capture AI stuck-state fix.
- Dashboard/report focus refresh.
- Stable transaction edit UX.
- Category-first budget sync.
- Shared/custom budget cycle support.
- AI classifier for transactions and split amounts.
- Reports Cashflow Pulse.
- DB-backed category visual sync.
- PWA install icon polish.
- Settings password change.
- Settings photo/avatar picker.
- Avatar upload and storage policies.
- Profile visual persistence after logout/login.
- Dashboard avatar sync with Settings.
- Dashboard avatar contrast improvement.
- Localized category taxonomy.
- Language preference persistence.
- Theme persistence verified.
- Safe cleanup phase 1.

## Latest Known Validation

Latest full mobile validation from recent work:

```text
corepack pnpm --filter mobile type-check ✅
corepack pnpm --filter mobile test ✅ 36 suites, 244 tests
corepack pnpm --filter mobile export:pwa ✅
corepack pnpm --filter mobile deploy:pwa ✅
```

Docs-only cleanup did not require PWA redeploy.

## Important Files for Future Work

Mobile:

```text
apps/mobile/app/(auth)/login.tsx
apps/mobile/app/(auth)/callback.tsx
apps/mobile/app/reset-password.tsx
apps/mobile/app/(tabs)/index.tsx
apps/mobile/app/(tabs)/settings.tsx
apps/mobile/app/(tabs)/transactions.tsx
apps/mobile/app/(tabs)/budgets.tsx
apps/mobile/app/(tabs)/reports.tsx
apps/mobile/src/lib/supabase.ts
apps/mobile/src/lib/auth-redirects.ts
apps/mobile/src/components/profile/ProfileAvatar.tsx
apps/mobile/src/services/transactions.ts
apps/mobile/src/services/budget-envelopes.ts
apps/mobile/src/services/categories.ts
apps/mobile/src/services/category-taxonomy.ts
apps/mobile/src/services/transaction-classifier.ts
apps/mobile/src/theme/category-visuals.ts
apps/mobile/src/i18n/i18n-context.tsx
apps/mobile/src/theme/theme-context.tsx
```

Backend/security:

```text
backend/app/core/auth.py
backend/app/core/rate_limit.py
backend/app/api/v1/imports.py
backend/main.py
supabase/functions/process-image/index.ts
supabase/functions/process-text/index.ts
supabase/functions/process-voice/index.ts
```

Supabase:

```text
supabase/migrations/202605060001_kaswise_base_schema.sql
supabase/migrations/202605210001_household_finance_context.sql
supabase/migrations/202605210002_wallet_balance_trigger.sql
supabase/migrations/202605290003_category_visual_sync.sql
supabase/migrations/202605300001_profile_avatars_storage.sql
```

## Key Decisions to Preserve

1. Mobile/PWA remains the go-live priority.
2. Do not do broad runtime refactors before go-live stability.
3. Category-first budget sync is intentional.
4. Category visuals live on `categories`; budget visuals are fallback/backward compatibility.
5. Profile visual is controlled by metadata:
   ```text
   avatar_url
   avatar_path
   avatar_key
   profile_visual_mode
   profile_visual_updated_at
   ```
6. Provider `picture` must not override explicit user avatar choice.
7. Language/theme preferences must persist locally.
8. PWA OAuth standalone mode uses full-page redirect.
9. Placeholder features should stay hidden for first go-live.
10. For security, Supabase anon key is public by design; RLS is the true boundary.

## Known Blockers

If working beyond mobile:

```text
Web type-check has React typing mismatch around NavLink JSX component usage.
Web theme test has color expectation mismatch.
Backend tests previously failed to run because python command was unavailable.
```

Security blockers/risks:

```text
SUPABASE_SERVICE_ROLE_KEY should be rotated.
profiles.plan_type should be protected from client update.
require_premium() is placeholder.
Import confirm endpoint should use strict Pydantic models.
Import flow should avoid double wallet balance update.
JWT verification should cache JWKS and verify issuer/audience/role.
CORS should be restricted for production.
Rate limiting should be Redis/proxy-backed.
PWA needs CSP/security headers because tokens are JS-accessible.
```

## Recommended Next Actions

### If user asks for go-live QA

Run/perform:

```bash
corepack pnpm --filter mobile test:golive
```

Manual checks:

- Google login browser.
- Google login installed PWA.
- Password change.
- Photo/avatar picker on real device.
- Logout/login after profile visual change.
- Dashboard avatar matches Settings.
- Language/theme persistence after close/reopen.
- Category visuals across Budget/Transactions/Reports/Dashboard.

### If user asks for security hardening

Start with:

1. Add migration protecting profile billing fields and usage counters.
2. Implement hardened FastAPI JWT dependency.
3. Fix `imports.py` validation and wallet balance update.
4. Restrict FastAPI and Edge Function CORS.
5. Add security headers/CSP to PWA serving layer.
6. Rotate service role key.

### If user asks for cleanup

Only safe cleanup unless explicitly approved:

1. Organize docs.
2. Update `.gitignore`/inventory.
3. Avoid `apps/mobile/app`, `apps/mobile/src`, migrations, deploy scripts.
4. Do not split `settings.tsx` until after go-live stability.

## Handoff Verdict

Repo is in a stable mobile/PWA-focused state. The app side has strong recent validation and deployment. The next major engineering risk is not UI polish; it is production security hardening around Supabase/FastAPI, secrets rotation, CORS, rate limiting, and import/data-integrity controls.
