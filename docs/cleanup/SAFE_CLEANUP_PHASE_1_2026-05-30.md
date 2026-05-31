# Safe Cleanup Phase 1 — Non-runtime Project Hygiene

Date: 2026-05-30
Repo: `/home/Danu88/catat-in`
Scope: non-runtime cleanup only

## Goal

Run a safe cleanup pass without disrupting the already deployed Kaswise mobile/PWA app.

This phase intentionally avoids moving or editing runtime app code, routes, Supabase migrations, deploy scripts, and backend/web implementation files.

## Changes Made

### 1. Added project structure documentation

New file:

```text
docs/PROJECT_STRUCTURE.md
```

Purpose:

- Document current monorepo layout.
- Mark folders that are safe vs unsafe to touch during cleanup.
- Record future cleanup candidates without performing risky refactors.

### 2. Hardened `.gitignore` for local/generated artifacts

Updated root `.gitignore` to explicitly ignore local cleanup/generated paths:

```text
tmp/
apps/mobile/tmp/
testsprite_tests/tmp/
```

Notes:

- Existing ignored artifacts were already covered for `.expo`, `dist`, `test-results`, `playwright-report`, `supabase/.temp`, etc.
- `testsprite_tests/tmp` currently contains tracked legacy files. The ignore rule only prevents future new generated files there; it does not remove tracked files.

## Inventory Observed

Ignored cleanup candidates from dry-run:

```text
apps/mobile/.expo/
apps/mobile/dist/
apps/mobile/playwright-report/
apps/mobile/test-results/
apps/mobile/tmp/
apps/web/dist/
supabase/.temp/
```

Root markdown files were intentionally not moved in Phase 1 to avoid breaking external references or team habits.

Cleanup Phase 2 later moved them into canonical `docs/*` locations, except `CLAUDE.md`, which remains at repo root as an agent/tooling entrypoint. See:

```text
docs/cleanup/SAFE_CLEANUP_PHASE_2_DOCS_2026-05-31.md
```

## Explicitly Not Changed

No runtime changes were made to:

```text
apps/mobile/app/
apps/mobile/src/
apps/mobile/package.json
apps/mobile/scripts/
supabase/migrations/
backend/app/
apps/web/src/
```

No PWA deploy was needed for this docs/gitignore-only cleanup.

## Validation

Recommended validation for this phase:

```bash
corepack pnpm --filter mobile type-check
```

Full mobile test/export/deploy is not required for docs/gitignore-only cleanup, but can be run if desired.

## Future Phase 2 Suggestions

Only after go-live stability:

1. Move root docs into subfolders under `docs/`.
2. Decide whether `Kaswise Design System/` belongs in `docs/design-system/` or `packages/design-system/`.
3. Untrack or archive `testsprite_tests/tmp` if confirmed generated.
4. Split large Settings screen into feature components/hooks.
5. Consider feature-based mobile organization after more stabilization.
