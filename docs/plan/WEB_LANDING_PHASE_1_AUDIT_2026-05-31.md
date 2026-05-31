# Web Landing Phase 1 Audit — 2026-05-31

## Goal

Prepare `apps/web` to become a professional Kaswise landing/marketing site without disturbing the live Mobile/PWA at `https://kaswise.com`.

This is an audit/planning phase only. No runtime web/mobile code was changed.

## Product and design guardrails

Source of truth reviewed:

```text
docs/product/PRODUCT.md
docs/design/DESIGN.md
docs/status/GO_LIVE_SIGNOFF_MOBILE_PWA_2026-05-31.md
apps/mobile as the live app behavior reference
```

The web landing must feel like Kaswise, not a generic AI SaaS page.

### Anti AI-slop rules

Avoid:

- Generic claims like “revolutionize your finance with AI”.
- Overloaded SaaS hero with vague dashboard metrics.
- Gradient text as the main visual hook.
- Random glassmorphism, floating cards, or decorative charts that do not explain a real user flow.
- Stock-style personas or copy that sounds translated from English.
- Showing unavailable features as if they are live.

Prefer:

- Concrete Indonesian-first copy around real flows: “Tulis: beli kopi 35rb”, budget category colors, monthly report review.
- Honest CTA: open/install the PWA, not fake dashboard signup promises.
- Premium fintech restraint: matte dark, warm light, rounded cards, disciplined emerald accent.
- Real product proof: screenshots/device mockups from the live PWA or carefully recreated product states.
- Small number of sections with clear purpose.

## Current `apps/web` audit

### Current role

`apps/web` is currently a legacy React/Vite finance dashboard, not a landing page. It still uses Firebase auth/data paths and contains many authenticated app routes:

```text
/dashboard
/transactions
/capture
/wallets
/budgets
/bills
/reports
/groups
/imports
/settings
```

For the new web goal, this should not be treated as the product app source of truth. The live source of truth is `apps/mobile`/PWA.

### Build and validation status

Commands run:

```bash
corepack pnpm --filter web type-check
corepack pnpm --filter web test
corepack pnpm --filter web build
```

Results:

```text
web type-check ❌
web test ❌
web build ✅
```

Key failures:

1. React typing mismatch: `react-router-dom` and `recharts` components fail JSX typing because the workspace resolves React 19 types while `apps/web` is React 18.
2. Theme test mismatch: test expects older colors (`#050C1B`, `#4F46E5`) while shared Kaswise tokens use current Dark Luxury values (`#141414`, `#A3FF12`).
3. `apps/web/src/theme/web-theme.ts` references `token.color.brand.accent`, but shared tokens expose `primary`, `primaryDeep`, `secondary`, and `secondaryDeep`; no `accent` field.

### Current implementation risks for a professional landing page

- The bundle still includes Firebase and Recharts; useful for legacy dashboard, unnecessary for a lightweight landing.
- `index.css` has mixed token usage plus older hardcoded blues/slates. This risks visual inconsistency.
- Auth routes and dashboard pages can distract from the landing scope.
- Current web copy/UI is app-dashboard oriented, not public marketing oriented.
- Building on top of all existing authenticated routes may produce a “busy SaaS template” feel.

## Recommended architecture for Web Phase 2

### Keep live app untouched

```text
kaswise.com      = existing live PWA for now
www.kaswise.com  = landing page candidate
```

Do not move the PWA under `/app` until the landing has been reviewed and deployment routing is explicitly planned.

### Landing MVP scope

Create a focused landing experience in `apps/web`:

1. Header with Kaswise mark, concise nav, CTA “Buka aplikasi”.
2. Hero: one clear promise around fast finance logging in Indonesian.
3. Product proof: AI text input example and budget/report preview.
4. Features: AI capture, budget envelopes, category insights, PWA install/login.
5. Trust/security: Supabase RLS, privacy-aware finance data handling, no exaggerated claims.
6. CTA/footer: open PWA, support/contact, privacy/terms placeholders if not ready.

### Technical direction

Recommended for Phase 2:

- Build a landing route/shell that does not require Firebase config.
- Prefer static content and CSS tokens over data/auth integration.
- Reuse shared design tokens, but fix `web-theme.ts` mapping first.
- Keep dependencies minimal in landing path; avoid importing Firebase/Recharts into public landing.
- Consider archiving or isolating legacy dashboard routes behind an explicit `/legacy` or not routing them at all for landing deployment.

## Definition of professional quality

Phase 2 landing should meet this bar before deployment:

```text
web type-check ✅
web test ✅
web build ✅
responsive mobile/tablet/desktop QA ✅
copy reads natural in Indonesian ✅
no fake/unavailable feature claims ✅
CTA target verified ✅
no Firebase/auth config required for public landing render ✅
```

## Proposed next tasks

1. Fix the minimum web validation blockers:
   - align React/@types version or isolate landing from affected router/chart types,
   - update theme test to current shared tokens,
   - replace missing `brand.accent` reference.
2. Create a landing content spec and section wireframe.
3. Implement landing MVP with Kaswise design tokens.
4. Validate and optionally deploy to `www.kaswise.com` first.

## Explicit non-goals for Phase 2

- Do not rebuild the full finance dashboard in `apps/web` yet.
- Do not migrate web auth/data to Supabase yet.
- Do not change live PWA deployment routing yet.
- Do not copy Expo/mobile code verbatim into Vite web.
