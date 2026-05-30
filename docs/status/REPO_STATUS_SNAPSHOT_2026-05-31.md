# Kaswise Repo Status Snapshot

Date: 2026-05-31
Repo: `/home/Danu88/catat-in`
Branch: `main`
Purpose: point-in-time engineering snapshot for current Kaswise repo state.

## Current Git State

Latest commits:

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

Working tree before this snapshot was clean.

## Product Focus

Current execution focus is **Kaswise mobile/PWA** first:

```text
apps/mobile
https://kaswise.com
```

The mobile/PWA app has been the primary go-live target. Web/backend are present, but web/backend cleanup and blocker resolution are not yet the active priority.

## Monorepo Shape

```text
apps/
  mobile/      Expo Router mobile app and PWA
  web/         React/Vite web app
backend/       FastAPI backend
packages/
  shared/      Shared theme/type primitives
supabase/      PostgreSQL migrations, storage policies, edge functions, tests
docs/          Project docs, handoffs, cleanup/status notes
```

Reference structure document:

```text
docs/PROJECT_STRUCTURE.md
```

## Main Tech Stack

### Mobile/PWA

```text
Expo 54
Expo Router 6
React 19
React Native 0.81
React Native Web
TypeScript
NativeWind
Supabase JS
AsyncStorage
Expo Secure Store plugin
Expo Image Picker
Jest / jest-expo
Testing Library React Native
Playwright go-live PWA tests
```

### Web

```text
React 18
Vite
TypeScript
React Router DOM
TanStack React Query
Zustand
Axios
Zod
Recharts
Tailwind CSS
Vitest
Playwright
```

### Backend / Data

```text
FastAPI
Uvicorn
Pydantic v2
Supabase Python client
PostgreSQL 15 via Supabase
Supabase Auth / Storage / Realtime / Edge Functions
Anthropic SDK
Midtrans
Pytest
Docker Compose local setup
```

## Mobile/PWA Current Status

Recent completed mobile areas:

- Auth and login/register hardening.
- PWA OAuth flow for installed Add-to-Home-Screen mode.
- Responsive logout.
- Dashboard/report focus refresh.
- Stable transaction edit flow.
- Category-first budget allocation sync.
- Shared/custom monthly budget cycles.
- AI transaction classifier and amount splitting.
- Reports Cashflow Pulse.
- Category-first visual sync using DB-backed category visual fields.
- PWA install icon polish.
- Settings password change.
- Settings profile photo/avatar picker.
- Avatar storage bucket and policies.
- Persisted profile visual preference after logout/login.
- Dashboard avatar now matches Settings profile visual.
- Improved Dashboard avatar contrast.
- Localized category taxonomy.
- Language preference persistence.
- Theme preference persistence verified.
- Safe cleanup phase 1 documentation and gitignore hardening.

## Latest Mobile Validation Known

Latest full mobile validation before this snapshot:

```text
type-check ✅
settings + dashboard tests ✅
full Jest ✅ 36 suites, 244 tests
export:pwa ✅
deploy:pwa ✅
```

Latest live PWA bundle observed:

```text
/_expo/static/js/web/entry-017cde22f805335d7280abca0f0facb3.js
```

No PWA redeploy was required for docs-only cleanup/snapshot work.

## Important Mobile Files

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
apps/mobile/src/services/category-taxonomy.ts
apps/mobile/src/services/transaction-classifier.ts
apps/mobile/src/theme/category-visuals.ts
apps/mobile/src/i18n/i18n-context.tsx
apps/mobile/src/theme/theme-context.tsx
apps/mobile/scripts/deploy-pwa.mjs
```

## Important Supabase Migrations

```text
supabase/migrations/202605280001_drop_legacy_wallet_balance_trigger.sql
supabase/migrations/202605290001_unique_transaction_envelope_allocations.sql
supabase/migrations/202605290002_add_category_type.sql
supabase/migrations/202605290003_category_visual_sync.sql
supabase/migrations/202605300001_profile_avatars_storage.sql
```

Live-applied and verified recently:

```text
202605290003_category_visual_sync.sql
202605300001_profile_avatars_storage.sql
```

## Current Documentation Map

Recent key docs:

```text
docs/PROJECT_STRUCTURE.md
docs/cleanup/SAFE_CLEANUP_PHASE_1_2026-05-30.md
docs/AI_CONTINUATION_HANDOFF_MOBILE_CATEGORY_FIRST_BUDGET_SYNC_2026-05-29.md
docs/AI_CONTINUATION_HANDOFF_MOBILE_BUDGET_AI_SYNC_RULES_2026-05-29.md
docs/AI_CONTINUATION_HANDOFF_MOBILE_CATEGORY_VISUAL_SYNC_AND_APP_ICON_2026-05-29.md
docs/AI_CONTINUATION_HANDOFF_MOBILE_AUTH_PROFILE_SETTINGS_2026-05-30.md
docs/AI_CONTINUATION_HANDOFF_MOBILE_PROFILE_PREFERENCES_DASHBOARD_2026-05-30.md
```

This snapshot is paired with:

```text
docs/handoffs/AI_CONTINUATION_HANDOFF_REPO_STATUS_2026-05-31.md
```

## Known Blockers / Risks

### Web/backend blockers

If continuing outside mobile:

```text
Web type-check has known React typing mismatch around NavLink JSX usage.
Web theme test has known color expectation mismatch.
Backend tests previously did not run in the current shell because python command was unavailable.
```

### Security risks from static audit

Priority risks identified:

1. `profiles.plan_type` and billing/server-managed fields should not be directly user-updatable through broad RLS.
2. `require_premium()` in FastAPI is still placeholder and currently allows all authenticated users.
3. Import confirm endpoint uses `transactions: list[dict]` and should use strict Pydantic models.
4. Import flow may double-update wallet balance if DB trigger also updates balances.
5. FastAPI JWT verification should cache JWKS and verify issuer/audience/role explicitly.
6. FastAPI and Supabase Edge Function CORS should be restricted for production origins.
7. Rate limiting should move from in-memory to Redis/proxy-backed production limiting.
8. PWA tokens are stored in JS-accessible storage, so CSP/security headers are important.
9. Previously shared `SUPABASE_SERVICE_ROLE_KEY` should be rotated.

## Safe Cleanup State

Phase 1 safe cleanup has been completed and committed:

```text
b1c1147 chore: document safe project cleanup
```

It only touched docs and `.gitignore`.

No runtime folders were intentionally changed:

```text
apps/mobile/app/
apps/mobile/src/
supabase/migrations/
backend/app/
apps/web/src/
```

## Recommended Next Steps

### Mobile go-live QA

1. Google login in browser.
2. Google login from installed PWA/Add to Home Screen.
3. Settings password change.
4. Settings photo/avatar picker on real device.
5. Logout/login after changing photo/avatar.
6. Dashboard avatar matches Settings visual.
7. Language persists after app close/reopen.
8. Theme persists after app close/reopen.
9. Category visuals consistent across Budget, Transactions, Reports, Dashboard.

### Security hardening

1. Rotate `SUPABASE_SERVICE_ROLE_KEY`.
2. Add migration to protect profile billing fields and usage counters.
3. Implement real `require_premium()`.
4. Harden FastAPI JWT verification.
5. Fix import validation and wallet balance source-of-truth.
6. Restrict CORS and add PWA security headers/CSP.
7. Add Redis/proxy-backed rate limiting.

### Cleanup phase 2, after go-live stability

1. Move root markdown docs into `docs/product`, `docs/deployment`, `docs/audit`, `docs/changelog`.
2. Decide final location for `Kaswise Design System/`.
3. Untrack/archive `testsprite_tests/tmp` if confirmed generated.
4. Split large Settings screen into components/hooks.
5. Consider feature-based mobile organization under `apps/mobile/src/features`.

## Snapshot Verdict

Mobile/PWA is currently the strongest and most go-live-ready part of the repo. The next highest-value work is security hardening around Supabase/FastAPI and manual QA on live PWA. Avoid broad runtime refactors until go-live behavior is stable.
