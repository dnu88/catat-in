# Kaswise Project Structure

Date: 2026-05-30

This document records the current project layout and the intended direction for safe, low-risk cleanup. It is documentation-only and does not change runtime behavior.

## Current Monorepo Shape

```text
apps/
  mobile/      Expo Router mobile app and PWA
  web/         Web app
backend/       Backend API service
packages/
  shared/      Shared types/theme primitives
supabase/      Migrations, tests, and edge functions
docs/          Product, plans, ADRs, handoffs, cleanup notes
```

## Mobile App Shape

```text
apps/mobile/
  app/         Expo Router routes. Do not reorganize casually.
  src/
    components/
    hooks/
    i18n/
    lib/
    services/
    state/
    theme/
    types/
  __tests__/   React Native/Jest screen tests
  tests/       Go-live/PWA tests
  scripts/     PWA deploy/export helpers
```

## Cleanup Rules

Safe cleanup may touch:

```text
docs/
.gitignore
README / inventory files
ignored local artifacts
```

Avoid touching during safe cleanup:

```text
apps/mobile/app/
apps/mobile/src/
apps/mobile/package.json
apps/mobile/app.json
apps/mobile/scripts/
supabase/migrations/
backend/app/
apps/web/src/
```

## Known Follow-up Candidates

These are candidates for future cleanup after go-live stability, not phase-1 runtime changes:

1. Move root markdown docs into `docs/product`, `docs/deployment`, `docs/audit`, and `docs/changelog`.
2. Move `Kaswise Design System/` to `docs/design-system/` or `packages/design-system/` and remove spaces from the folder name.
3. Split large mobile screens, especially `apps/mobile/app/(tabs)/settings.tsx`, into feature components/hooks.
4. Consider `apps/mobile/src/features/*` once mobile behavior is stable.
5. Make backend root scripts cross-platform instead of Windows-venv specific.
