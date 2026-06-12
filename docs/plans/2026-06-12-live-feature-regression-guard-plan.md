# Kaswise Live Feature Regression Guard Plan

> **For Hermes / next model:** Use `coding-debugging-workflow`, `deploy-regression-guard`, and `writing-plans` before implementing. This document is the handoff source of truth for preventing already-live Kaswise features from being replaced by later branch deploys.

**Goal:** Prevent any feature that is already live and working in Kaswise from disappearing, being replaced, or silently regressing during future development and deploys.

**Problem:** This is the second time live-normal features were overwritten by later work. The root issue is release discipline and missing automated guardrails, not only individual coding mistakes.

**Architecture:** Use layered release protection. A live feature registry defines what production must preserve. Local pre-push, CI, deploy script, live bundle checks, and cron monitoring all verify the same critical feature set.

**Tech Stack:** Expo mobile PWA, React Native Web, Jest, TypeScript, Node deploy scripts, Git/GitHub CI, existing bundle marker guard, Nginx Proxy Manager static deploy directory.

---

## Executive Summary: 5-Layer Guard

The proposed protection system has five mandatory layers:

1. **Live Feature Registry**
   - Machine-readable list of production features that must not disappear.
   - Maps feature IDs to markers, tests, owner notes, and criticality.

2. **Quality Gates Before Push / PR / Deploy**
   - Type-check, focused live regression tests, PWA export, and bundle marker check.
   - All production-impacting changes must pass the same gate locally and in CI.

3. **Branch and Release Discipline**
   - Production deploys only from approved branches, ideally `main`, `production`, or explicit `release/*` branches.
   - Feature branches can be pushed/tested, but production deploy requires explicit override if not on an allowed branch.

4. **Deploy-Time Candidate vs Live Verification**
   - Before replacing production files, compare candidate bundle against required markers and existing live bundle expectations.
   - Abort deploy if candidate loses registered live features.

5. **Post-Deploy Live Monitor**
   - Verify live URL after deploy.
   - Keep cron marker guard as final alarm if production somehow regresses later.

These layers are intentionally redundant. A mistake must bypass several independent checks before reaching users.

---

## Current Codebase Context

Repo path:

```bash
/home/Danu88/catat-in
```

Current production PWA deploy path:

```bash
/home/Danu88/nginx-proxy-manager/placeholder
```

Important existing files:

- `apps/mobile/scripts/required-markers.json`
  - Current bundle marker list.
  - After 2026-06-12 restore, this contains 29 required markers.

- `apps/mobile/scripts/check-bundle-markers.mjs`
  - Verifies that required markers exist in exported PWA bundle.

- `apps/mobile/scripts/deploy-pwa.mjs`
  - Deploys mobile PWA dist to Nginx Proxy Manager placeholder path.
  - Currently verifies bundle markers after deploy.

- `.githooks/pre-push`
  - Existing pre-push quality gate.
  - Blocks push if type-check/tests/marker-check fail.

- `.github/workflows/ci.yml`
  - Existing CI quality gate includes mobile quality checks.

- `apps/mobile/package.json`
  - Existing scripts include:
    - `type-check`
    - `test`
    - `export:pwa`
    - `check:bundle`
    - `predeploy`
    - `deploy:pwa`

Known restored live-critical features as of 2026-06-12:

- AI capture can create multiple transactions from one chat.
- Receipt scan can create itemized transaction drafts.
- Manual transaction form has date wheel picker.
- Text classifier can parse natural-language transaction dates.
- Reports/dashboard/privacy/period features restored earlier.
- Bills chip/filter integration preserved.

Recent relevant commits:

- `21ff88e fix: restore multi-transaction AI capture`
- `1e64655 fix: restore replaced capture and date features`

---

## Design Principles

### 1. One source of truth for live features

Do not rely on memory or chat history. A feature that is live and normal must be registered in code.

### 2. Guard behavior, not only files

A marker proves a UI string survived bundling. A test proves core behavior survived refactors. Live features need both where practical.

### 3. Production deploy must be boring

Deploy should be blocked by default when risky:

- wrong branch
- dirty working tree
- missing tests
- missing markers
- candidate bundle not built
- live verification fails

### 4. Overrides must be explicit and noisy

Emergency deploys can exist, but they must require an explicit environment flag and print a warning.

Example:

```bash
ALLOW_NON_PROD_BRANCH=1 pnpm --filter mobile deploy:pwa
```

### 5. Keep Kaswise UI simple

This plan is about release safety, not adding user-facing complexity. Do not add new tabs or dashboard surfaces. Keep all guards in scripts, tests, CI, and docs.

---

## Proposed Files

### Create: `apps/mobile/scripts/live-feature-registry.json`

Purpose: registry of features that are considered live production contract.

Suggested schema:

```json
[
  {
    "id": "capture.multi_text_transactions",
    "description": "AI capture can create multiple transactions from one text input.",
    "critical": true,
    "markers": ["capture-text-input", "capture-draft-card", "capture-confirm-button"],
    "tests": ["transaction-classifier.test.ts"],
    "verification": "Input like 'beli kopi 25rb, sarapan 15rb, parkir 5rb' produces 3 drafts."
  }
]
```

Notes:

- Keep IDs stable and namespaced.
- Only use marker strings that exist literally in source and survive bundle export.
- Do not include dynamic marker strings unless the exact literal appears in bundle.
- `critical: true` means missing marker/test should fail deploy.

### Modify: `apps/mobile/scripts/required-markers.json`

Short-term: keep existing marker guard working.

Long-term: either keep it as a derived list or ensure it stays synchronized with `live-feature-registry.json`.

Recommended for Tahap 1:

- Keep `required-markers.json` as the current checker input.
- Add `live-feature-registry.json` as richer documentation and future source.
- Add a small validation script later to ensure every registry marker exists in `required-markers.json`.

### Create: `apps/mobile/scripts/verify-live-feature-registry.mjs`

Purpose:

- Validate registry JSON shape.
- Ensure each critical feature has at least one marker or one test.
- Ensure marker strings from registry exist in `required-markers.json`.
- Optionally verify listed test files exist.

Tahap 1 can start minimal; fail only obvious mistakes.

### Modify: `apps/mobile/package.json`

Add scripts:

```json
{
  "scripts": {
    "test:live-regression": "jest transaction-classifier receipt-intake receipt-item-categorizer transaction-new-edit-mode capture-envelope-suggestion capture-gating reports-screen tabs-index reports-ai-insight transactions-swipe-actions --runInBand",
    "verify:live-registry": "node scripts/verify-live-feature-registry.mjs",
    "quality:live": "pnpm verify:live-registry && pnpm type-check && pnpm test:live-regression && pnpm export:pwa && pnpm check:bundle"
  }
}
```

Adjust exact Jest pattern if runtime is too slow or if matching duplicates unintended tests.

### Modify: `apps/mobile/scripts/deploy-pwa.mjs`

Add production safety checks:

1. Verify current branch is allowed.
2. Verify working tree is clean or allow generated `dist` only depending on existing workflow.
3. Run or require `quality:live` before deploy.
4. Build candidate if not already built.
5. Verify candidate bundle markers.
6. Copy candidate to production path.
7. Verify deployed production path bundle markers.
8. Verify live URL references the deployed bundle and contains critical markers.

### Optional later: `apps/mobile/scripts/verify-live-url.mjs`

Purpose:

- Fetch `https://kaswise.com/`.
- Extract `entry-*.js` bundle name.
- Fetch live bundle.
- Verify required marker strings exist in actual live response.

Tahap 1 can implement this inside `deploy-pwa.mjs` if simpler.

---

## Initial Live Feature Registry Candidates

Use these as starting data. Next implementer should verify exact marker names against source before finalizing.

### `capture.multi_text_transactions`

Description:

AI capture text input supports multiple transactions in one message.

Example:

```text
beli kopi 25rb, sarapan 15rb, parkir 5rb
```

Expected:

- 3 drafts created.
- Categories inferred individually.
- Existing single-transaction behavior unchanged.

Tests:

- `apps/mobile/src/services/transaction-classifier.test.ts`
- `backend/tests/test_ai_service_model.py`

Markers:

- use existing capture review markers after verifying exact names in `capture.tsx`.

### `capture.itemized_receipt`

Description:

Receipt scan can create one draft per receipt item and categorize item by product name.

Tests:

- `apps/mobile/src/services/receipt-intake.test.ts`
- `apps/mobile/src/services/receipt-item-categorizer.test.ts`

Markers:

- `capture-receipt-preview`
- `capture-receipt-confirm`

Source files:

- `apps/mobile/app/(tabs)/capture.tsx`
- `apps/mobile/src/services/receipt-intake.ts`
- `apps/mobile/src/services/receipt-item-categorizer.ts`

### `manual_transaction.date_wheel`

Description:

Manual transaction create/edit form uses wheel date picker and explicit confirm action.

Tests:

- `apps/mobile/__tests__/transaction-new-edit-mode.test.tsx`

Markers:

- `transaction-date-wheel-picker`
- `transaction-date-confirm`

Source file:

- `apps/mobile/app/(tabs)/transaction-new.tsx`

### `text_capture.natural_language_dates`

Description:

Text classifier and backend fallback parse Indonesian date mentions.

Examples:

```text
Beli kopi 1rb tanggal 01 Juni 2026
beli susu 15rb tgl 2/6/2026
```

Tests:

- `apps/mobile/src/services/transaction-classifier.test.ts`
- `backend/tests/test_ai_service_model.py`

Markers:

- none required if pure logic; behavior tests are the guard.

### `reports.custom_period_and_saved_rules`

Description:

Reports screen supports custom period and saved monthly cycle rule.

Tests:

- `apps/mobile/__tests__/reports-screen.test.tsx`

Markers:

- `reports-start-date-wheel-picker`
- `reports-end-date-wheel-picker`
- `reports-saved-rules-card`

### `transactions.bills_chip_filter`

Description:

Bills are integrated into existing Transactions flow via chip/filter, not a new tab.

Tests:

- `apps/mobile/__tests__/transactions-swipe-actions.test.tsx` if relevant
- add a focused test later if coverage is weak

Markers:

- `transactions-bills-chip`
- `bills-create-card`
- `bills-add-button`

### `home.dashboard_privacy_period`

Description:

Home dashboard preserves privacy toggle, theme toggle, active period labels, budget/home summary cards.

Tests:

- `apps/mobile/__tests__/tabs-index.test.tsx`
- `apps/mobile/__tests__/reports-screen.test.tsx` where period integration applies

Markers:

- existing home/dashboard markers in `required-markers.json`.

---

## Tahap 1 Implementation Plan

Tahap 1 target: make production deploy fail fast if live features are missing or deploy is launched from an unsafe branch.

### Task 1: Add live feature registry

**Objective:** Create a machine-readable list of live-critical Kaswise features.

**Files:**

- Create: `apps/mobile/scripts/live-feature-registry.json`

**Steps:**

1. Add registry with the feature candidates above.
2. Use only markers already present in `apps/mobile/scripts/required-markers.json` unless verified in source.
3. Include tests that already exist.
4. Run JSON validation:

```bash
python3 -m json.tool apps/mobile/scripts/live-feature-registry.json >/tmp/live-feature-registry.pretty.json
```

Expected: exit code 0.

**Commit candidate:**

```bash
git add apps/mobile/scripts/live-feature-registry.json
git commit -m "chore: add live feature registry"
```

### Task 2: Add registry validator

**Objective:** Prevent stale or invalid registry entries.

**Files:**

- Create: `apps/mobile/scripts/verify-live-feature-registry.mjs`
- Modify: `apps/mobile/package.json`

**Validator requirements:**

- Load `live-feature-registry.json`.
- Load `required-markers.json`.
- For every feature:
  - `id` is non-empty string.
  - `description` is non-empty string.
  - `critical` is boolean.
  - `markers` is array if present.
  - `tests` is array if present.
- For every `critical: true` feature:
  - at least one marker or one test must be present.
- Every marker listed in registry must exist in `required-markers.json`.
- Every test listed in registry should exist somewhere under `apps/mobile` or `backend`.

Suggested command:

```bash
pnpm --filter mobile verify:live-registry
```

Expected output:

```text
✅ Live feature registry valid
```

### Task 3: Add live regression script

**Objective:** One command verifies all live-critical behavior before deploy.

**Files:**

- Modify: `apps/mobile/package.json`

Add scripts:

```json
{
  "verify:live-registry": "node scripts/verify-live-feature-registry.mjs",
  "test:live-regression": "jest transaction-classifier receipt-intake receipt-item-categorizer transaction-new-edit-mode capture-envelope-suggestion capture-gating reports-screen tabs-index reports-ai-insight transactions-swipe-actions --runInBand",
  "quality:live": "pnpm verify:live-registry && pnpm type-check && pnpm test:live-regression && pnpm export:pwa && pnpm check:bundle"
}
```

Verification:

```bash
pnpm --filter mobile quality:live
```

Expected:

- registry valid
- type-check passed
- live regression tests passed
- export PWA passed
- bundle marker check passed

### Task 4: Add branch safety to deploy script

**Objective:** Prevent accidental production deploy from arbitrary feature branches.

**Files:**

- Modify: `apps/mobile/scripts/deploy-pwa.mjs`

Allowed branches for normal production deploy:

- `main`
- `production`
- `release/*`
- current emergency branch `feat/freemium-ai-monetization` can be temporarily allowed or require override, depending user preference.

Recommended behavior:

```text
If branch not allowed and ALLOW_NON_PROD_BRANCH != "1": abort.
If branch not allowed and ALLOW_NON_PROD_BRANCH == "1": print warning and continue.
```

Verification:

```bash
pnpm --filter mobile deploy:pwa
```

Expected on feature branch without override:

```text
❌ Refusing production deploy from branch feat/...
Set ALLOW_NON_PROD_BRANCH=1 only for an explicit emergency deploy.
```

Expected with override:

```bash
ALLOW_NON_PROD_BRANCH=1 pnpm --filter mobile deploy:pwa
```

Deploy continues after printing warning.

### Task 5: Make deploy run live quality gate or require recent gate

**Objective:** Production deploy cannot skip live safety checks.

**Files:**

- Modify: `apps/mobile/scripts/deploy-pwa.mjs`

Simplest Tahap 1 behavior:

- `deploy-pwa.mjs` runs:
  - `pnpm verify:live-registry`
  - `pnpm type-check`
  - `pnpm test:live-regression`
  - `pnpm export:pwa`
  - `pnpm check:bundle`
- Then deploys.

Potential concern:

- This makes deploy slower but safer.
- Accept this for now because repeated feature replacement is costlier than a slow deploy.

### Task 6: Add post-deploy live URL verification

**Objective:** Confirm `https://kaswise.com/` actually serves the new bundle and critical markers.

**Files:**

- Modify: `apps/mobile/scripts/deploy-pwa.mjs`
- Or create: `apps/mobile/scripts/verify-live-url.mjs`

Behavior:

1. Fetch `https://kaswise.com/`.
2. Extract first `entry-*.js` bundle path.
3. Fetch that bundle.
4. Check selected critical markers:
   - `capture-receipt-preview`
   - `capture-receipt-confirm`
   - `transaction-date-wheel-picker`
   - `transactions-bills-chip`
   - plus all markers from `required-markers.json` if runtime is acceptable.
5. Print success/failure.

Verification:

```bash
pnpm --filter mobile verify:live-url
```

Expected:

```text
✅ Live URL references entry-<hash>.js
✅ All required live markers present in live bundle
```

### Task 7: Update CI/pre-push to use live quality gate

**Objective:** Align local, CI, and deploy checks.

**Files:**

- Modify: `.githooks/pre-push`
- Modify: `.github/workflows/ci.yml` if needed

Recommended:

- Pre-push can remain somewhat fast, but should include `verify:live-registry`.
- CI should run `quality:live` for mobile-impacting changes.
- Deploy script must always run the strongest gate.

Verification:

```bash
git push origin HEAD
```

Expected:

- pre-push prints registry validation in quality gate.
- push is blocked if registry invalid.

---

## Acceptance Criteria for Tahap 1

Tahap 1 is done only when all are true:

- `apps/mobile/scripts/live-feature-registry.json` exists and documents current live-critical features.
- `pnpm --filter mobile verify:live-registry` passes.
- `pnpm --filter mobile test:live-regression` passes.
- `pnpm --filter mobile quality:live` passes.
- `pnpm --filter mobile deploy:pwa` refuses unsafe branch unless override is set.
- `ALLOW_NON_PROD_BRANCH=1 pnpm --filter mobile deploy:pwa` still runs quality gates and marker checks.
- Live deploy verification confirms `https://kaswise.com/` serves the deployed bundle and critical markers.
- Documentation is committed.

---

## Commands for Next Model

Start here:

```bash
cd /home/Danu88/catat-in
git status --short --branch
pnpm --filter mobile predeploy
```

Inspect current scripts:

```bash
sed -n '1,240p' apps/mobile/scripts/deploy-pwa.mjs
cat apps/mobile/scripts/required-markers.json
cat apps/mobile/package.json
sed -n '1,220p' .githooks/pre-push
sed -n '1,220p' .github/workflows/ci.yml
```

After implementing Tahap 1, verify:

```bash
pnpm --filter mobile verify:live-registry
pnpm --filter mobile test:live-regression
pnpm --filter mobile quality:live
ALLOW_NON_PROD_BRANCH=1 pnpm --filter mobile deploy:pwa
curl -fsSL https://kaswise.com/ | grep -o 'entry-[^" ]*\.js' | head -1
```

---

## GitHub Branch Protection Required Checks: 100% Enforcement

### Discussion summary: remaining work for true 100% guard enforcement

Follow-up discussion on 2026-06-12 clarified that the 5-layer guard is mostly active, but not yet 100% enforced at the platform level.

Current status by layer:

1. **Live Feature Registry** — active.
   - `live-feature-registry.json` is the source of truth.
   - Registry validation passes.
   - Bundle marker checks derive from the registry.

2. **Quality Gates Before Push / PR / Deploy** — active for local push, CI, and deploy.
   - Local pre-push gate runs registry validation, type-check, live regression tests, and bundle marker checks.
   - GitHub CI runs web, backend, and mobile quality gates.
   - Deploy runs `quality:live` before replacing production.

3. **Branch and Release Discipline** — partially active, not 100% until GitHub branch protection is enabled.
   - Production deploy is restricted to approved branch flow (`main`) unless explicit emergency override is set.
   - GitHub still cannot block every direct push/merge to `main` until native branch protection required checks are enabled.

4. **Deploy-Time Candidate vs Live Verification** — active.
   - Deploy verifies candidate bundle markers.
   - Deploy verifies target bundle markers after copy.
   - Deploy verifies live URL bundle and markers after production update.

5. **Post-Deploy Live Monitor** — active and verified.
   - `kaswise-pwa-marker-guard` exists, is enabled, and runs as a script-only watchdog (`no_agent=true`).
   - Watchdog wrapper: `/home/Danu88/.hermes/profiles/coding/scripts/kaswise_pwa_marker_guard.sh`.
   - Direct verification showed exit `0` with empty stdout, which is the intended healthy/silent behavior.
   - Cron `last_run_at` may remain `null` for silent no-output runs in the scheduler listing; verify the watchdog by running the wrapper directly or by using `cronjob run` and checking for no error alert.

Final status and optional future improvement:

1. ~~Upgrade GitHub to a plan that supports branch protection on private repos, or make the repo public, then enable required checks on `main`.~~ Done on 2026-06-12 by making the repository public and enabling branch protection required checks on `main`.
2. ~~Replace or remove the stale Firebase-gated E2E job in CI. Kaswise no longer uses Firebase, so missing Firebase secrets must not be treated as a valid skip reason.~~ Done in branch hardening: the Firebase-gated `E2E smoke (Playwright)` job was removed from `.github/workflows/ci.yml` and kept out of branch-protection required checks until a current no-Firebase/Supabase smoke test is written.
3. ~~Prove the live marker cron guard by running it and confirming successful status/delivery behavior.~~ Done in branch hardening: `kaswise-pwa-marker-guard` was converted to a script-only watchdog (`no_agent=true`) backed by `/home/Danu88/.hermes/profiles/coding/scripts/kaswise_pwa_marker_guard.sh`. The wrapper runs `node apps/mobile/scripts/verify-live-url.mjs` with silent-success env vars, checks the live `https://kaswise.com/` bundle against `live-feature-registry.json`, exits `0`, and emits no stdout when all markers are present. Any missing marker or infrastructure failure exits non-zero so Hermes sends an error alert to Telegram.
4. Optional future improvement: write a new E2E smoke test for the current no-Firebase/Supabase stack; only then consider adding `E2E smoke (Playwright)` as a required branch-protection check.

### Current branch protection status

As of 2026-06-12, repo `dnu88/catat-in` is public and branch protection is enabled on `main`.

Verified GitHub protection settings:

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Backend quality gate (pytest)",
      "Web quality gate (typecheck + unit + build)",
      "Mobile PWA quality gate (typecheck + tests + build)"
    ]
  },
  "enforce_admins": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "required_pull_request_reviews": null
}
```

`required_pull_request_reviews` is intentionally `null` for now to avoid blocking solo maintenance on a public repo. If another reviewer is available, strengthen this later by requiring pull request reviews and at least one approval.

### Required checks protecting `main`

These GitHub Actions job names are currently required:

- `Backend quality gate (pytest)`
- `Web quality gate (typecheck + unit + build)`
- `Mobile PWA quality gate (typecheck + tests + build)`

Optional later, after the stale Firebase-gated E2E workflow is replaced with the current Kaswise stack (Supabase/no-Firebase):

- `E2E smoke (Playwright)`

Do not treat missing Firebase secrets as a valid reason for skipped E2E checks. Kaswise no longer uses Firebase; any Firebase-gated CI condition is stale and should be removed or replaced before `E2E smoke (Playwright)` becomes a required branch-protection check.

### Recommended branch protection rules

Enable for branch `main`:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging (`strict: true`).
- Block force pushes.
- Block branch deletion.
- Require conversation resolution before merge.
- Restrict who can push directly to `main` where practical.
- Require at least 1 approval when another reviewer is available.
- Decide whether admins are included. For maximum release discipline, use `enforce_admins: true`.

### CLI command used to enable current protection

This is the protection command applied on 2026-06-12:

```bash
gh api \
  --method PUT \
  repos/dnu88/catat-in/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Backend quality gate (pytest)",
      "Web quality gate (typecheck + unit + build)",
      "Mobile PWA quality gate (typecheck + tests + build)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

Verify after applying:

```bash
gh api repos/dnu88/catat-in/branches/main/protection \
  --jq '{required_status_checks, enforce_admins, required_pull_request_reviews, allow_force_pushes, allow_deletions}'
```

### End-to-end proof that protection works

After protection is enabled:

1. Create a test branch.
2. Intentionally break one mobile marker/test.
3. Push the branch and open a PR.
4. Confirm the PR cannot be merged while `Mobile PWA quality gate (typecheck + tests + build)` is failing.
5. Revert the break.
6. Confirm all required checks pass and the PR becomes mergeable.
7. Confirm direct push to `main` is blocked or restricted according to the selected rule.

### Remaining compensating controls outside branch protection

Even with branch protection active, keep these independent controls enabled:

- local pre-push quality gate,
- GitHub CI on `main`,
- production deploy guard refusing non-production branches unless explicit override is set,
- deploy-time `quality:live`,
- bundle marker verification from `live-feature-registry.json`,
- live URL verification after deploy,
- cron/live monitor for production marker regressions.

These remain intentionally redundant. A production regression should have to bypass GitHub branch protection, CI, local hooks, deploy-time checks, live URL verification, and cron monitoring before reaching users.

---

## Next Steps for the Next Model

The 5-layer guard is now operational. The next model should not rework the guard from scratch. Execute only these follow-up improvements, in small PRs, with verification after each change.

### Priority 1 — GitHub Actions Node 24 readiness

Why:

- Current CI passes, but GitHub warns that Node.js 20 actions are deprecated.
- This is not a product bug, but it can become a future CI blocker if ignored.

Scope:

1. Inspect `.github/workflows/ci.yml`.
2. Update action versions only if newer stable versions exist and support the current repo workflow.
3. Keep required check names unchanged:
   - `Backend quality gate (pytest)`
   - `Web quality gate (typecheck + unit + build)`
   - `Mobile PWA quality gate (typecheck + tests + build)`
4. Do not add the old Firebase-gated E2E job back.
5. Open a PR and confirm all required checks pass.

Verification:

```bash
gh workflow run ci.yml --ref <branch> || true
gh pr checks <pr-number> --repo dnu88/catat-in --watch
gh api repos/dnu88/catat-in/branches/main/protection \
  --jq '.required_status_checks.contexts'
```

Acceptance criteria:

- CI passes on PR and after merge to `main`.
- Branch protection still lists the same three required checks.
- No Firebase secret condition is reintroduced.

### Priority 2 — Current-stack E2E smoke test, optional but recommended

Why:

- The previous Playwright E2E was Firebase-gated and stale.
- Kaswise no longer uses Firebase, so any new E2E must target the current no-Firebase/Supabase/backend stack.

Scope:

1. Do not restore the removed Firebase-gated job.
2. First audit current web auth/runtime dependencies.
3. Add a minimal smoke that can run reliably in CI without private Firebase secrets.
4. Start with public, low-flake assertions only, for example:
   - app shell renders,
   - login/register/forgot-password routes render,
   - invalid login shows a controlled error if the backend mock or test env supports it.
5. If backend/Supabase credentials are required and not safely available in CI, stop at a documented plan rather than adding a fake green check.
6. Only after the smoke is stable should it be considered for branch protection.

Verification:

```bash
pnpm --filter @kaswise/web test:e2e
# or the exact package script discovered in apps/web/package.json
```

Acceptance criteria:

- E2E passes locally and in CI without Firebase secrets.
- New CI job has a clear, stable job name.
- The job is not added to branch protection until it has proven stable.

### Priority 3 — Release report artifact

Why:

- The guard blocks regressions, but a release report gives better auditability.

Scope:

1. Extend mobile deploy/predeploy flow to write a release report artifact containing:
   - commit SHA,
   - branch,
   - bundle file,
   - marker count,
   - commands/tests executed,
   - live verification result,
   - timestamp.
2. Store it in a predictable path such as `apps/mobile/dist/release-report.json` or `docs/releases/<date>-<sha>.md`.
3. Avoid secrets in the report.

Verification:

```bash
pnpm --filter mobile quality:live
pnpm --filter mobile deploy:pwa
```

Acceptance criteria:

- Report is generated during deploy/predeploy.
- Report includes the live marker verification result.
- Report does not contain credentials or tokens.

### Priority 4 — Candidate-vs-live marker diff report

Why:

- Marker checks currently fail when required markers are missing.
- A diff report would make intentional additions/removals easier to review before deploy.

Scope:

1. Add a script that compares candidate bundle markers against live bundle markers.
2. Output added markers, removed markers, and unchanged marker count.
3. Fail only on removals of registry-required markers unless explicitly approved by registry changes.
4. Integrate into deploy logging first; do not make it a hard gate until stable.

Verification:

```bash
pnpm --filter mobile export:pwa
pnpm --filter mobile check:bundle
pnpm --filter mobile verify:live-url
```

Acceptance criteria:

- Diff report clearly lists marker additions/removals.
- Required marker removals fail or are visibly flagged.
- Normal deploy remains green.

### Priority 5 — Stronger PR review rule, only when another reviewer exists

Why:

- `required_pull_request_reviews` is currently intentionally `null` to avoid blocking solo maintenance.
- If another reviewer becomes available, requiring approval would strengthen release discipline.

Scope:

1. Confirm with the user that another reviewer is available.
2. Enable at least one required approval on `main`.
3. Keep required status checks unchanged.
4. Verify solo maintenance is not blocked unexpectedly.

Verification:

```bash
gh api repos/dnu88/catat-in/branches/main/protection \
  --jq '{required_pull_request_reviews, required_status_checks}'
```

Acceptance criteria:

- `main` requires approval only after user confirms reviewer availability.
- Backend/Web/Mobile required checks remain enforced.

### Do Not Do

- Do not reintroduce Firebase-gated CI or Firebase secrets.
- Do not rename required CI job names without updating branch protection in the same PR.
- Do not weaken `main` branch protection.
- Do not remove `quality:live`, registry validation, bundle marker checks, or live URL verification.
- Do not modify production deploy behavior without running the full deploy verification path.

---

## Risks and Mitigations

### Risk: deploy becomes slow

Mitigation:

- Accept slower deploy for now.
- Later optimize by caching or splitting `quality:live` into predeploy and deploy-only checks.

### Risk: marker list becomes stale

Mitigation:

- Registry validator ensures registry markers are in `required-markers.json`.
- Removing a marker requires updating registry and tests intentionally.

### Risk: feature branch emergency deploy blocked

Mitigation:

- Use explicit override:

```bash
ALLOW_NON_PROD_BRANCH=1 pnpm --filter mobile deploy:pwa
```

- The warning makes emergency action visible in terminal logs.

### Risk: test suite pattern misses behavior

Mitigation:

- Registry includes `verification` text for manual/automated future expansion.
- Add focused tests whenever a live feature is restored or added.

### Risk: CI and local deploy diverge

Mitigation:

- Use shared package scripts (`verify:live-registry`, `test:live-regression`, `quality:live`) instead of duplicating raw commands.

---

## Non-Goals for Tahap 1

Do not implement these yet unless explicitly requested:

- New user-facing screens.
- New admin dashboard.
- Full Playwright E2E test suite.
- Staging environment provisioning.
- Complex release train automation.
- Changing Kaswise navigation structure.

Tahap 1 should be mostly scripts, registry, tests, and deploy safety.

---

## Later Enhancements Snapshot

The detailed executable follow-up list is in **Next Steps for the Next Model** above. Short version:

1. Prepare GitHub Actions for Node 24 runtime changes.
2. Add a new no-Firebase/Supabase-compatible Playwright smoke test only if it can run reliably in CI.
3. Add release report artifacts for deploy auditability.
4. Add candidate-vs-live marker diff reporting.
5. Consider required PR approvals only when another reviewer is available.

Do not treat these as blockers for the current 5-layer guard; they are follow-up hardening items.

---

## Final Handoff Note

The current 5-layer guard is implemented, documented, and verified. The next model should execute the **Next Steps for the Next Model** section as incremental hardening work, not as a redo of the guard implementation. Keep required CI check names stable, never reintroduce Firebase-gated E2E, and verify every PR through branch protection before merging.
