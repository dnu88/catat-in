# Web Landing Phase 2 MVP — 2026-05-31

## Scope

Implemented a focused public landing MVP in `apps/web` based on the Phase 1 audit. The live Mobile/PWA remains untouched.

## What changed

### Landing experience

Added:

```text
apps/web/src/pages/LandingPage.tsx
```

Landing sections:

1. Header with Kaswise mark and CTA.
2. Hero with concrete Indonesian-first value proposition.
3. Product proof card using a real-style example: `beli kopi 35rb di Kopi Kenangan`.
4. Feature cards for AI text capture, budget/category sync, and monthly reports.
5. Three-step usage explanation.
6. Trust/security section referencing Supabase RLS and go-live hardening.
7. Footer.

### Routing

Updated `apps/web/src/main.tsx` so `/` renders the public landing page. Legacy authenticated dashboard routes are isolated behind a lazy `LegacyApp` route:

```text
apps/web/src/legacy/LegacyApp.tsx
```

This keeps the public landing page available without Firebase config and avoids preloading the Firebase vendor chunk on the landing entry HTML.

### Validation blockers fixed

- Aligned `apps/web` React/React DOM and React type packages with the workspace React 19 stack.
- Fixed `web-theme.ts` mapping for current shared Kaswise tokens.
- Updated theme tests to assert against `kaswiseTokens` instead of stale hardcoded colors.
- Added landing render coverage in `App.test.tsx`.

## Anti AI-slop checks

The MVP intentionally avoids:

- generic AI SaaS claims,
- fake metrics,
- gradient text as the main hook,
- stock-style copy,
- claiming unavailable features as live.

It uses concrete product flows and restrained Kaswise visual language.

## Deployment recommendation

Do not replace the live PWA at `kaswise.com` yet. Recommended next deployment target:

```text
www.kaswise.com = landing candidate
kaswise.com     = current live PWA
```

After visual QA, decide whether to keep this split or plan a later `/app` routing migration.

## Validation

```bash
git diff --check
corepack pnpm --filter web type-check
corepack pnpm --filter web test
corepack pnpm --filter web build
corepack pnpm --filter mobile type-check
```
