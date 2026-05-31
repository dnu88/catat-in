# Safe Cleanup Phase 2 — Docs-only Reorganization

Date: 2026-05-31

## Scope

Docs-only cleanup after mobile/PWA go-live smoke and Security Phase 2 Light. No runtime app/backend/Supabase logic was changed.

## Changes

Moved root documentation into canonical `docs/*` locations:

```text
AUDIT_REPORT_APPS_WEB.md       -> docs/audit/AUDIT_REPORT_APPS_WEB.md
DEPLOYMENT.md                  -> docs/deployment/DEPLOYMENT.md
DEPLOY_VPS_HANDOVER.md         -> docs/deployment/DEPLOY_VPS_HANDOVER.md
LOCAL_TESTING_GUIDE.md         -> docs/deployment/LOCAL_TESTING_GUIDE.md
MOBILE_GOLIVE.md               -> docs/deployment/MOBILE_GOLIVE.md
DESIGN.md                      -> docs/design/DESIGN.md
PRODUCT.md                     -> docs/product/PRODUCT.md
PRD_Kaswise_v1.md              -> docs/prd/PRD_Kaswise_v1.md
PHASE_0_CHANGELOG.md           -> docs/changelog/PHASE_0_CHANGELOG.md
PHASE_1_CHANGELOG.md           -> docs/changelog/PHASE_1_CHANGELOG.md
```

Added docs index:

```text
docs/README.md
```

## Intentionally kept at repo root

```text
CLAUDE.md
```

Reason: agent/tooling entrypoint; moving it may break external habits/tools even though it is documentation-only.

## Explicitly not changed

No changes were made to runtime paths:

```text
apps/mobile/app/
apps/mobile/src/
apps/mobile/package.json
apps/mobile/app.json
apps/mobile/scripts/
backend/app/
supabase/migrations/
supabase/functions/
apps/web/src/
```

## Validation

```bash
git diff --check
corepack pnpm --filter mobile type-check
python3 -m unittest discover supabase/tests
```
