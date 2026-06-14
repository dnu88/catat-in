# Kaswise Store Readiness Minimum-Change Plan

> For Hermes / next model: load `writing-plans`, `software-development-workflows`, and `handoff` before execution. Use this document together with `docs/audit/2026-06-14-kaswise-store-readiness-audit.md` as the source of truth for the next implementation session.

Goal: Move Kaswise from strong PWA/private-beta engineering quality to a store-submittable native strategy with the smallest safe scope and the least product churn.

Architecture: Separate store-distributed native monetization/compliance concerns from the existing web/PWA Midtrans flow. Do not re-architect the finance product. Keep Kaswise simple: no new tabs, no new complex management surfaces, and no store-only UX sprawl. Use platform-aware gating and small compliance screens/settings actions.

Tech stack: Expo Router mobile app, Supabase Auth + Postgres, FastAPI specialist backend, Midtrans for web/PWA, EAS build profiles, future store billing integration (Apple IAP + Google Play Billing or free-only native mode).

---

## Product scope guard

Non-goals for this plan:
- Do not redesign the premium feature set.
- Do not add a sixth tab or a new subscription dashboard.
- Do not replace Midtrans for web/PWA.
- Do not broaden scope into full launch-marketing work.
- Do not build multiple parallel legal/admin screens when one settings-based entry point is enough.

Simple-path principle:
- If a feature can live inside Settings, keep it inside Settings.
- If a feature is unfinished for store review, hide it rather than inventing a partial fake UX.
- If monetization is not store-compliant yet, ship native free-only first.

---

## Current codebase context

Repository root:

```bash
/home/Danu88/catat-in
```

Key existing files already relevant to store readiness:
- `apps/mobile/app.json`
- `apps/mobile/eas.json`
- `apps/mobile/app/upgrade.tsx`
- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/app/(tabs)/capture.tsx`
- `apps/mobile/src/services/billing.ts`
- `backend/app/services/payment_service.py`
- `backend/app/api/v1/webhooks.py`
- `docs/deployment/MOBILE_GOLIVE.md`
- `docs/audit/2026-06-14-kaswise-store-readiness-audit.md`

Current submission blockers from the audit:
1. External Midtrans browser flow is used to unlock premium digital functionality from inside the app.
2. No clear in-app privacy policy entry point was found.
3. No clear in-app delete-account flow or public deletion-request link was found.
4. Voice capture copy appears visible even though an obvious native recording implementation path was not confirmed.

---

## Strategic decision first

Before writing code, the next model/user should choose one launch track.

### Track A — Native free-only first (recommended minimum-change path)

What it means:
- Keep Midtrans for web/PWA.
- Hide/disable premium purchase inside native store builds.
- Ship free finance core in Play Store / App Store first.
- Delay native subscription purchase until proper store billing exists.

Why this is recommended:
- Smallest compliance-safe change set.
- Avoids immediate Apple IAP / Google Play Billing integration complexity.
- Preserves current web/PWA payment path.
- Fastest path to native store presence.

### Track B — Full native store billing now

What it means:
- iOS uses Apple IAP.
- Android uses Google Play Billing.
- Web/PWA keeps Midtrans.

Why this is not the minimum path:
- Higher implementation complexity.
- Requires platform-specific billing integration, restore flows, product IDs, testing, and operational setup.

For the rest of this plan, assume Track A unless the user explicitly chooses Track B.

---

## Target end state for Track A

A store-submittable build should satisfy all of these:
- Native app does not initiate external Midtrans purchase for premium digital functionality.
- Privacy policy is publicly hosted and linked from inside the app.
- Account deletion/request-deletion information is accessible from inside the app and via public web link.
- Unfinished store-sensitive feature copy is hidden or corrected.
- Store metadata/readiness checklist is documented.
- Existing mobile quality gate still passes.

---

## Proposed new/modified artifacts

### Legal/compliance docs
- Create: `docs/legal/privacy-policy.md`
- Create: `docs/legal/account-deletion.md`
- Optional create: `docs/legal/terms.md`

These can later be published via whichever public web surface you already use.

### Mobile app
- Modify: `apps/mobile/app/(tabs)/settings.tsx`
- Modify: `apps/mobile/app/upgrade.tsx`
- Modify: `apps/mobile/app/(tabs)/capture.tsx`
- Optional create: `apps/mobile/src/config/store-release.ts`
- Optional create: `apps/mobile/src/utils/open-external-link.ts`

### Backend / deletion support
Minimum path options:
- Option 1: create deletion-request workflow only first
- Option 2: build full authenticated self-delete endpoint if product/legal decision is ready

Likely files if implemented now:
- Create or modify: `backend/app/api/v1/me.py` or dedicated account route file
- Create tests under `backend/tests/`

### Docs / operational notes
- Modify: `docs/deployment/MOBILE_GOLIVE.md`
- Modify: `CLAUDE.md`
- Modify: `docs/changelog/CHANGELOG.md`

---

## Implementation tasks

## Phase 0 — Lock the strategy

### Task 1: Record the native launch strategy

Objective: prevent future sessions from mixing free-only native and Midtrans-in-native approaches.

Files:
- Modify: `CLAUDE.md`
- Modify: `docs/changelog/CHANGELOG.md`

Steps:
1. Add a short note that the 2026-06-14 store-readiness audit found external Midtrans purchase flow incompatible with public native store submission for premium digital unlocks.
2. State the chosen next track explicitly:
   - Track A: native free-only first, or
   - Track B: implement store billing
3. Add one short changelog bullet referencing the new audit/plan docs.

Verification:
```bash
grep -n "store-readiness" CLAUDE.md docs/changelog/CHANGELOG.md
```

Expected: both files contain the new note.

---

## Phase 1 — Remove the biggest store blocker from native builds

### Task 2: Introduce a single source of truth for store-release behavior

Objective: make platform-specific release gating explicit instead of scattering ad-hoc checks.

Files:
- Create: `apps/mobile/src/config/store-release.ts`
- Modify: `apps/mobile/app/upgrade.tsx`
- Modify: `apps/mobile/app/(tabs)/settings.tsx`
- Test: add/update a small test file under `apps/mobile/__tests__/` or `apps/mobile/src/**.test.ts`

Design:
- export booleans/helpers such as:
  - `isNativeStoreBuildCandidate`
  - `allowNativePremiumPurchase`
  - `showVoiceCaptureEntry`
- initial Track A behavior:
  - native iOS/Android store builds: `allowNativePremiumPurchase = false`
  - web/PWA: existing Midtrans flow can remain

Step 1: write failing test
- assert native platform + Track A config returns `false` for `allowNativePremiumPurchase`
- assert web platform returns `true`

Step 2: implement the helper module

Step 3: wire the helper into `upgrade.tsx` and `settings.tsx`
- do not open external Midtrans purchase flow when helper says no
- instead show simple explanatory copy: premium purchase is currently available on the web / coming soon for native, depending on chosen wording

Verification:
```bash
pnpm --filter mobile test upgrade settings-plan --runInBand
pnpm --filter mobile type-check
```

Expected: pass.

### Task 3: Hide or downgrade the native upgrade CTA for Track A

Objective: make sure store reviewers do not encounter a prohibited external billing flow.

Files:
- Modify: `apps/mobile/app/(tabs)/settings.tsx`
- Modify: `apps/mobile/app/upgrade.tsx`
- Possibly modify: any route/navigation entry to `upgrade`

Minimum behavior for Track A:
- free users can still see plan status
- native app does not present a buy-now button that launches Midtrans browser flow
- copy remains honest and compact

Preferred minimal UX:
- Settings shows current plan status
- if on native store build and user is free:
  - show “Premium purchase is not available in this build yet” or product-approved equivalent
  - optionally link to support/privacy/help page, but avoid “go pay externally” CTA until policy-safe

Verification:
```bash
search_files pattern="openBrowserAsync|createPayment\(" path="/home/Danu88/catat-in/apps/mobile/app" target="content"
```

Expected after Track A wiring:
- no reachable native purchase path remains in the store-review flow, or the use is gated to web only.

---

## Phase 2 — Close privacy and account lifecycle blockers

### Task 4: Create durable legal source docs in-repo

Objective: create canonical text artifacts for privacy and account deletion.

Files:
- Create: `docs/legal/privacy-policy.md`
- Create: `docs/legal/account-deletion.md`
- Optional create: `docs/legal/terms.md`

Required content for privacy policy draft:
- what Kaswise collects
- what Supabase/backend/storage process
- AI/import/payment related processors at a high level
- what data is optional vs required
- retention/deletion summary
- how users can request deletion / revoke account access

Required content for account deletion draft:
- in-app deletion/request path
- support/web link path
- what is deleted immediately vs retained for legal/security reasons if any
- expected processing time

Verification:
```bash
python3 - <<'PY'
from pathlib import Path
for p in [
  Path('docs/legal/privacy-policy.md'),
  Path('docs/legal/account-deletion.md')
]:
    print(p, p.exists(), p.stat().st_size if p.exists() else 0)
PY
```

### Task 5: Add in-app legal entry points inside Settings

Objective: satisfy “easy to access” store-review expectations without adding new navigation clutter.

Files:
- Modify: `apps/mobile/app/(tabs)/settings.tsx`
- Optional create: `apps/mobile/src/utils/open-external-link.ts`

Implementation notes:
- add compact Settings rows for:
  - Privacy Policy
  - Account Deletion
  - Terms of Service (optional but recommended)
- keep inside existing Settings information structure
- open public URLs only; do not hardcode localhost/dev placeholders in production behavior

Test approach:
- add targeted render test to ensure the rows exist
- mock link open behavior if needed

Verification:
```bash
pnpm --filter mobile test settings --runInBand
```

### Task 6: Implement the minimum account deletion flow

Objective: meet the practical submission requirement with the smallest safe implementation.

Choose one of two subpaths:

#### Track A-minimum
- in-app row opens a public deletion request page/form and/or support endpoint
- backend/manual ops can fulfill requests initially
- only acceptable if product/legal approve that as the first step and store wording remains accurate

#### Stronger path (preferred if feasible now)
- authenticated user can trigger self-service account deletion request from the app/backend
- deletion request is recorded and processed deterministically

Likely files:
- Backend route file under `backend/app/api/v1/`
- Backend tests under `backend/tests/`
- Mobile settings action + confirmation UI under `apps/mobile/app/(tabs)/settings.tsx`

Important constraint:
- do not implement irreversible destructive deletion casually without confirming exact product/legal expectation
- a deletion-request workflow can be a safer first increment than hard delete

Verification:
```bash
cd backend && .venv/bin/python -m pytest -q
pnpm --filter mobile type-check
```

---

## Phase 3 — Remove misleading/unready feature surface

### Task 7: Audit voice capture surfacing and decide hide vs finish

Objective: avoid store reviewer confusion.

Files:
- Modify: `apps/mobile/app/(tabs)/capture.tsx`
- Possibly modify: related service files if real voice path exists

Decision rule:
- if real voice recording + permission flow exists and works, keep it and document it
- if not, hide the voice entry from store builds using the same release helper introduced earlier

This is the preferred minimal path for now:
- hide “Rekam / Voice” in store-targeted builds until the implementation is clearly complete

Verification:
```bash
search_files pattern="Rekam|Voice|Whisper" path="/home/Danu88/catat-in/apps/mobile/app/(tabs)/capture.tsx" target="content"
```

Expected after Track A cleanup:
- store-targeted surface is honest and coherent.

---

## Phase 4 — Submission operations readiness

### Task 8: Update the native go-live doc to match reality

Objective: stop future sessions from following a technically correct but policy-incomplete submission checklist.

Files:
- Modify: `docs/deployment/MOBILE_GOLIVE.md`

Required updates:
- call out that public store submission requires store-compliant billing strategy
- add privacy policy URL requirement
- add account deletion/public deletion page requirement
- add a reviewer/test-account preparation section
- note Track A vs Track B submission differences

Verification:
```bash
grep -n "billing\|privacy\|deletion\|reviewer" docs/deployment/MOBILE_GOLIVE.md
```

### Task 9: Add a store-readiness checklist artifact

Objective: give future sessions a single checkbox list for final submission readiness.

Files:
- Create or derive from audit: `docs/deployment/STORE_SUBMISSION_CHECKLIST.md`

Suggested sections:
- billing compliance
- legal URLs
- account deletion
- screenshots/assets
- Data Safety / App Privacy answers
- internal test evidence
- release build verification

Verification:
- file exists and is referenced from `MOBILE_GOLIVE.md`

---

## Optional future phase — Track B full native billing

Only do this if the user chooses Track B.

### Task 10: Replace native premium purchase with real store billing

Objective: move native monetization to Apple/Google-approved paths.

Likely workstreams:
- choose billing library / Expo-compatible approach
- define product IDs for monthly/yearly premium
- implement purchase state sync to backend/profile entitlements
- add restore purchases flow
- add purchase failure/retry UX
- keep Midtrans only for web/PWA

This is a separate implementation epic and should get its own dedicated design/plan document.

---

## Acceptance criteria

### Minimum acceptance for Track A
- Native store-review build does not launch external Midtrans purchase for premium digital functionality.
- Settings includes privacy policy and account deletion entry points.
- Public privacy/deletion documents exist and are ready to host.
- Voice/unfinished feature surfacing is hidden or corrected.
- Mobile tests/type-check still pass.
- Backend tests still pass.
- `docs/deployment/MOBILE_GOLIVE.md` no longer implies that current EAS build steps alone are enough for public submission.

### Stronger acceptance
- Native delete-account request flow exists end-to-end.
- Final submission checklist doc exists.
- Reviewer notes/test-account checklist is documented.

---

## Suggested execution order for the next model

1. Apply Task 1 first so the repo records the chosen track.
2. Do Tasks 2 and 3 next to eliminate the biggest store blocker.
3. Do Tasks 4 and 5 immediately after so legal links exist in code and docs.
4. Decide whether Task 6 is deletion-request only or full self-service deletion.
5. Do Task 7 before screenshots/submission prep to avoid misleading store assets.
6. Finish with Tasks 8 and 9 so operations docs match the new reality.

## Suggested test commands for the next session

```bash
cd /home/Danu88/catat-in
pnpm --filter mobile type-check
pnpm --filter mobile test --runInBand
pnpm --filter mobile quality:live
cd backend && .venv/bin/python -m pytest -q
```

## Linked artifacts

- Audit: `docs/audit/2026-06-14-kaswise-store-readiness-audit.md`
- Handoff: `docs/handoffs/AI_CONTINUATION_HANDOFF_KASWISE_STORE_READINESS_2026-06-14.md`
