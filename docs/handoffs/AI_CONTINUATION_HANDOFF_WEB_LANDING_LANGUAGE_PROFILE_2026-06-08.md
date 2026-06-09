# AI Continuation Handoff: Web Landing Language Toggle + Profile Avatar Polish

**Date:** 2026-06-08  
**Branch:** `feat/freemium-ai-monetization`  
**Scope:** `apps/web` landing page, theme/language controls, mockup polish

## Summary

Added language toggle (ID/EN) next to the theme toggle in landing and legal page headers. Refined the mockup profile avatar circle in the device preview for precision. Light-theme landing green tuned to match mobile forest emerald.

## Changes Made

### 1. Language Toggle (ID ↔ EN)

New component: `apps/web/src/components/i18n/LanguageToggle.tsx`
- Uses Phosphor `Translate` icon
- Two pill buttons: `ID` / `EN`
- Persisted via existing `useI18nStore` (key: `catat-in-language`)
- Placed next to `ThemeToggle` in `.landing-header-actions`

Files:
- **New:** `apps/web/src/components/i18n/LanguageToggle.tsx`
- **Modified:** `apps/web/src/pages/LandingPage.tsx` — added `<LanguageToggle>` next to `<ThemeToggle>`
- **Modified:** `apps/web/src/pages/LegalInfoPage.tsx` — added `<LanguageToggle>` in legal header
- **Modified:** `apps/web/src/index.css` — `.language-toggle`, `.language-toggle-options`, mobile compact styles

### 2. Theme Toggle Phosphor Icons

- `apps/web/src/components/theme/ThemeToggle.tsx` — replaced emoji with Phosphor `Sun` / `Moon` icons
- Dependency added: `@phosphor-icons/react` in `apps/web/package.json`

### 3. Light-Theme Landing Green

Scoped light-theme overrides for landing/legal pages to match mobile forest emerald:
- `--ks-brand-primary: #3F6212`
- `--ks-brand-primary-deep: #3F6212`
- `--ks-bubble-primary-bg: rgba(101, 163, 13, 0.16)`
- `--ks-bubble-primary-fg: #65A30D`

Applied via `[data-theme="light"] .landing-page, [data-theme="light"] .legal-page` in `apps/web/src/index.css`.

### 4. Mockup Profile Avatar Precision

- Replaced `.landing-kw-bubble` (`KW` text) with `.landing-profile-avatar` (`RP` initials)
- Added `::after` status dot (active/presence indicator)
- Ring + soft inner glow + status dot with dark/light variants

File: `apps/web/src/pages/LandingPage.tsx` (line ~237) and `apps/web/src/index.css`.

### 5. Final Landing Page Structure (from earlier session)

Full landing page sections: Hero, Problem, Cara Kerja, Periode Gajian, Feature Grid, Product Preview, Trust/Security, FAQ, Help Center, Final CTA, Professional Footer.

Static legal pages added:
- `/help`
- `/terms`
- `/privacy`
- `/contact`

File: **New:** `apps/web/src/pages/LegalInfoPage.tsx`

### 6. Static Fallback Routes

Updated `apps/web/scripts/generate-spa-fallbacks.mjs` to include `help`, `terms`, `privacy`, `contact` routes.

## Supporting Files

| File | Status |
|------|--------|
| `apps/web/src/components/i18n/LanguageToggle.tsx` | New (untracked) |
| `apps/web/src/pages/LegalInfoPage.tsx` | New (untracked) |
| `apps/web/src/pages/LandingPage.tsx` | Modified |
| `apps/web/src/components/theme/ThemeToggle.tsx` | Modified |
| `apps/web/src/main.tsx` | Modified |
| `apps/web/src/index.css` | Modified |
| `apps/web/package.json` | Modified (added `@phosphor-icons/react`) |
| `apps/web/src/App.test.tsx` | Modified |
| `apps/web/scripts/generate-spa-fallbacks.mjs` | Modified |
| `pnpm-lock.yaml` | Modified |

## Existing Infrastructure (from prior sessions)

- `apps/web/src/store/theme.store.ts` — theme persistence (`kaswise-web-theme`)
- `apps/web/src/store/i18n.store.ts` — language persistence (`catat-in-language`, `id` | `en`)
- `apps/web/src/lib/i18n.ts` — i18n messages + `useI18n()` hook
- `apps/web/src/theme/web-theme.ts` — `applyWebTheme()` / `resolveThemeMode()`

## Validation

```text
type-check ✅
web test ✅ 10 passed
web build:static ✅ (5501 modules, 19 routes)
```

## Deployment

- Landing preview: `https://www.kaswise.com` (Vite preview on port 4173)
- Root PWA: `https://kaswise.com` (untouched, Expo mobile)
- Vite preview server: `nohup corepack pnpm --filter web preview -- --host 0.0.0.0 --port 4173`
- PID file: `/tmp/kaswise_web_preview.pid`

## Uncommitted Files

All landing changes are **uncommitted** in working tree. Untracked:
- `apps/web/src/pages/LegalInfoPage.tsx`
- `apps/web/src/components/i18n/LanguageToggle.tsx`
- `.impeccable/` (live mode metadata)

## Next Steps

1. Commit web landing, legal pages, language toggle, and profile avatar changes.
2. Push to `feat/freemium-ai-monetization`.
3. Restart Vite preview if needed (currently running).
4. Advanced: implement full i18n translations for landing copy (ID ↔ EN) beyond just UI labels.

## Key Decisions

- Language toggle is landing-header only; it does not affect the legacy app (`/*` routes).
- Theme toggle uses Phosphor icons matching the mobile app icon family.
- Light-theme green matches mobile `#3F6212` / `#65A30D` — not neon `#A3FF12`.
- Profile avatar in mockup is a static design element, not an interactive toggle.
- `www.kaswise.com` = landing preview; `kaswise.com` = PWA mobile (do not touch).
