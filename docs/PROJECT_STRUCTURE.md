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
docs/          Canonical documentation home
  audit/       Audit reports
  changelog/   Phase changelogs
  deployment/  Deployment, local testing, go-live docs
  design/      Design system notes
  product/     Product overview
  prd/         PRDs
  security/    Security hardening and operations docs
  status/      Snapshots and sign-offs
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

Cleanup Phase 2 completed the root-docs move into `docs/*` while keeping `CLAUDE.md` at repo root as an agent/tooling entrypoint.

Remaining candidates for future cleanup after go-live stability:

1. Move `Kaswise Design System/` to `docs/design-system/` or `packages/design-system/` and remove spaces from the folder name.
2. Split large mobile screens, especially `apps/mobile/app/(tabs)/settings.tsx`, into feature components/hooks.
3. Consider `apps/mobile/src/features/*` once mobile behavior is stable.
4. Make backend root scripts cross-platform instead of Windows-venv specific.
