# Kaswise Store Submission Final Readiness Plan

> **For Hermes:** Use `software-development-workflows`, `writing-plans`, and `plan-audit-reporting` before executing this plan. If implementation changes are needed, use `subagent-driven-development` task-by-task and verify every claim with repo/runtime evidence.

**Goal:** Produce a final, evidence-backed Play Store and App Store go/no-go decision for Kaswise Track A native submission.

**Architecture:** This is a last-mile submission readiness plan, not a feature roadmap. The app remains Track A: native iOS/Android public builds are free-only, native premium purchase is disabled, and Midtrans remains web/PWA-only. The plan gathers evidence across native builds, device smoke tests, public legal/deletion routes, store metadata, and privacy/data-safety answers.

**Tech Stack:** Expo Router mobile app (`apps/mobile`), EAS native builds, Supabase-backed mobile services, FastAPI specialist backend, pnpm workspace quality gates, GitHub protected `main` workflow.

---

## Product and policy constraints

- Do not add a sixth tab or new store-specific UI surface.
- Do not re-enable native external premium purchase.
- Do not route iOS/Android store users into Midtrans for digital premium unlocks.
- Preserve Track A: native free-only first; web/PWA may keep Midtrans.
- Public store submission is blocked unless legal URLs, account deletion path, metadata, privacy answers, and native build smoke tests are all verified.
- Repo evidence can prove implementation readiness, but Play Console / App Store Connect metadata and screenshots require manual confirmation or explicit artifacts.

## Current known baseline

Repository root:

```bash
/home/Danu88/catat-in
```

Canonical references:

- `docs/deployment/MOBILE_STORE_SUBMISSION_CHECKLIST.md`
- `docs/deployment/MOBILE_GOLIVE.md`
- `docs/audit/2026-06-14-kaswise-store-readiness-audit.md`
- `docs/plans/2026-06-14-kaswise-store-readiness-minimum-change-plan.md`
- `docs/operations/ACCOUNT_DELETION_SUPPORT_SOP.md`
- `docs/legal/privacy-policy.md`
- `docs/legal/account-deletion.md`
- `docs/legal/terms.md`
- `CLAUDE.md`
- `docs/changelog/CHANGELOG.md`

Important implementation evidence already present:

- Native premium purchase gating: `apps/mobile/src/config/store-release.ts`
- Upgrade screen native notice: `apps/mobile/app/upgrade.tsx`
- Settings legal links: `apps/mobile/src/components/settings/LegalSupportSection.tsx`
- Account deletion request UI: `apps/mobile/src/components/settings/AccountDeletionSection.tsx`
- Account deletion services: `apps/mobile/src/services/account-deletion.ts`, backend account-deletion API/service/tests
- Reviewer-safe capture modes: `apps/mobile/app/(tabs)/capture.tsx`
- Public routes: `apps/mobile/app/privacy.tsx`, `terms.tsx`, `contact.tsx`, `account-deletion.tsx`, `help.tsx`
- Legal route content: `apps/mobile/src/content/legal-pages.ts`

Production URLs that must be visually verified:

- `https://kaswise.com/privacy`
- `https://kaswise.com/terms`
- `https://kaswise.com/contact`
- `https://kaswise.com/account-deletion`
- `https://kaswise.com/help`

---

## Execution rule

A future model executing this plan must produce two artifacts:

1. Final audit report:
   - `docs/audit/YYYY-MM-DD-kaswise-store-submission-final-audit.md`
2. Submission evidence bundle or handoff note:
   - `docs/handoffs/YYYY-MM-DD-kaswise-store-submission-evidence.md`

If a required step cannot be performed from the current environment, mark it `UNVERIFIED`, explain exactly why, and classify the final verdict accordingly. Do not infer Play Console / App Store Connect state from repo files.

---

## Step 1: Native release candidate build evidence

**Objective:** Prove that the actual store candidate build exists and matches Track A native configuration.

**Files / surfaces to inspect:**

- `apps/mobile/app.json`
- `apps/mobile/eas.json`
- `apps/mobile/src/config/store-release.ts`
- EAS build output / dashboard links if available
- Generated AAB / IPA / TestFlight artifact references if available

**Commands:**

```bash
cd /home/Danu88/catat-in
pnpm --filter mobile type-check
pnpm --filter mobile test store-release upgrade-screen settings-screen legal-links account-deletion-section legal-support-section -- --runInBand
pnpm --filter mobile quality:live
```

If EAS credentials are configured and the user explicitly wants build execution:

```bash
cd /home/Danu88/catat-in/apps/mobile
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

**Evidence to collect:**

- Android artifact type is store-ready AAB (`eas.json` production Android buildType: `app-bundle`).
- iOS production/TestFlight candidate build exists or is explicitly blocked by missing Apple credentials.
- Bundle/package IDs are `com.kaswise.app`.
- App version/build number for the submission candidate is recorded.
- `getStoreReleaseConfig('ios')` and `getStoreReleaseConfig('android')` return `allowNativePremiumPurchase: false`.

**Pass condition:**

- Required local quality gates pass.
- Native release candidate artifact exists for the target store, or missing credentials/artifacts are clearly marked as a submission blocker.

**Stop condition:**

- Any native build can trigger external Midtrans premium purchase.
- Build candidate cannot be produced and no previous candidate artifact is available.

---

## Step 2: Device smoke test on the release candidate

**Objective:** Prove the installed build behaves honestly and core flows work for reviewers.

**Required device/test environment:**

- Android physical device or Play internal test install.
- iOS physical device/TestFlight install, if App Store submission is in scope.
- Test account credentials or reviewer-ready account setup.

**Smoke-test script:**

1. Install the exact release candidate build.
2. Launch app cold.
3. Sign in with the test account.
4. Open Dashboard; verify summary cards render and no blocking crash occurs.
5. Open Capture AI.
   - Verify only `Teks` and `Foto` modes are visible.
   - Verify no voice/import mode is reviewer-visible unless intentionally shipped and working.
6. Create one text transaction using natural language.
7. Use photo receipt flow if a safe test image is available.
8. Open Budget Wallets / Reports.
   - Verify reports basics load.
   - Verify `Household` + `Personal Care` appear as the merged category when applicable.
9. Open Settings.
   - Verify privacy, terms, account deletion links are visible.
   - Verify account deletion request section can expand.
10. Check Premium/Upgrade area.
    - Verify native build does not show a purchase button that opens Midtrans.
    - Verify copy says premium purchase is not available in this app yet / available via web/PWA only.

**Evidence to collect:**

- Device/platform tested.
- Build/version tested.
- Screenshots or concise notes for each flow.
- Any crash/error logs.

**Pass condition:**

- No critical crash.
- Reviewer-visible app is honest about Track A.
- No native external purchase path is reachable.
- Legal/deletion links are reachable from Settings.

**Stop condition:**

- Native purchase funnel is reachable.
- Legal/deletion entry points are missing.
- Screenshots/assets or visible UI still show dormant voice/import/premium purchase flows.

---

## Step 3: Legal, support, and account lifecycle verification

**Objective:** Prove store reviewers and users can access legal/support/deletion resources and that support can fulfill deletion requests.

**Files / surfaces to inspect:**

- `docs/legal/privacy-policy.md`
- `docs/legal/account-deletion.md`
- `docs/legal/terms.md`
- `docs/operations/ACCOUNT_DELETION_SUPPORT_SOP.md`
- `apps/mobile/src/content/legal-pages.ts`
- `apps/mobile/src/config/legal-links.ts`
- `apps/mobile/src/components/settings/LegalSupportSection.tsx`
- `apps/mobile/src/components/settings/AccountDeletionSection.tsx`
- backend account deletion API/service/tests

**Commands:**

```bash
cd /home/Danu88/catat-in
pnpm --filter mobile test settings-screen legal-route-screen legal-links account-deletion-section legal-support-section -- --runInBand
cd backend && .venv/bin/python -m pytest -q tests/test_account_deletion_api.py
```

HTTP reachability check:

```bash
python3 - <<'PY'
import urllib.request
for url in [
  'https://kaswise.com/privacy',
  'https://kaswise.com/terms',
  'https://kaswise.com/contact',
  'https://kaswise.com/account-deletion',
  'https://kaswise.com/help',
]:
    with urllib.request.urlopen(url, timeout=20) as r:
        print(url, r.status)
PY
```

Visual verification requirement:

- Open every production URL in a real browser or store-review-like webview.
- Confirm the rendered page shows the intended content, not just a blank/generic Expo shell.
- Confirm Settings links open the same production URLs.

**Evidence to collect:**

- Rendered page titles/visible headings:
  - `Kebijakan Privasi Kaswise`
  - `Syarat Layanan Kaswise`
  - `Kontak Support Kaswise`
  - `Penghapusan Akun Kaswise`
- Confirmation that account deletion page explains request path, deletion/anonymization, retained data, and processing timeline.
- Confirmation that support owner/process can handle deletion requests within the stated timeline.

**Pass condition:**

- HTTP 200 and visual content are both verified.
- In-app Settings links point to the same URLs.
- Support SOP is operational, not merely written.

**Stop condition:**

- Any legal/deletion URL is broken or renders incorrect/empty content.
- No operational support owner/process exists for deletion requests.

---

## Step 4: Store metadata and asset pack

**Objective:** Prove the Play Console / App Store Connect submission pack matches the Track A app reality.

**Manual artifacts required:**

- App name: Kaswise
- Short description / subtitle.
- Full description.
- Category.
- Support URL: `https://kaswise.com/contact`
- Privacy URL: `https://kaswise.com/privacy`
- Terms URL if requested: `https://kaswise.com/terms`
- Account deletion URL for Play Console: `https://kaswise.com/account-deletion`
- Reviewer notes explaining Track A free-only native build.
- Test account credentials/instructions, stored securely outside git.
- Screenshots for required device classes.
- App icon and splash assets.

**Reviewer notes template:**

```text
Kaswise public native build is submitted as a Track A free-only experience.
Premium purchase is not available from inside the native app.
Existing web/PWA premium entitlement may be recognized after login, but the native app does not initiate external checkout.

Public resources:
Privacy Policy: https://kaswise.com/privacy
Terms: https://kaswise.com/terms
Account Deletion: https://kaswise.com/account-deletion
Support: https://kaswise.com/contact

Reviewer path:
1. Sign in with the provided test account.
2. Open Dashboard, Capture AI, Reports, and Settings.
3. In Settings, verify legal links and account deletion request flow.
```

**Evidence to collect:**

- Screenshot or exported text of Play Console / App Store Connect metadata fields.
- Screenshot list names matching actual UI.
- Confirmation screenshots do not show native premium checkout, old voice mode, or unavailable import flow.
- Test account instructions are complete and do not expose credentials in git.

**Pass condition:**

- Metadata is complete for each target store.
- Metadata and screenshots match Track A behavior.
- Reviewer notes are ready.

**Stop condition:**

- Store metadata still implies native premium purchase is available.
- Screenshots show unavailable or policy-risky features.
- Reviewer cannot log in or navigate the app.

---

## Step 5: Data Safety / App Privacy reconciliation

**Objective:** Ensure Play Data Safety and Apple App Privacy answers are consistent with the live app and legal docs.

**Sources to reconcile:**

- `docs/legal/privacy-policy.md`
- `docs/legal/account-deletion.md`
- `docs/legal/terms.md`
- `apps/mobile/src/content/legal-pages.ts`
- Supabase data model / tables documented in `CLAUDE.md`
- backend services for AI, OCR/import, payments, notifications, account deletion
- actual permissions in `apps/mobile/app.json`

**Minimum data categories to review:**

- Account identifiers: email, user ID, auth profile.
- Financial data: transactions, wallets, budgets, reports, bill reminders.
- User-generated content: notes, receipt images or OCR/import content when used.
- Device/media access: camera/photo library for receipt capture.
- AI/OCR processing: transaction text, receipt images, extracted fields, AI insights where applicable.
- Payment/entitlement data for web/PWA premium flow.
- Diagnostics/support data if collected.

**Questions to answer for each store:**

- Is the data collected?
- Is it linked to the user?
- Is it used for app functionality, analytics, developer communications, fraud prevention, or support?
- Is it shared with third-party processors such as Supabase, backend/AI/OCR/payment providers?
- Can the user request deletion?
- Does the privacy policy describe this accurately?

**Evidence to collect:**

- Completed Play Data Safety draft/export or screenshot.
- Completed Apple App Privacy answers/export or screenshot.
- Short reconciliation notes mapping each answer back to legal docs and app behavior.

**Pass condition:**

- Console answers match app behavior and legal docs.
- No hidden data collection path is omitted.
- Deletion/retention claims match support SOP and public page.

**Stop condition:**

- Console answers are incomplete or conflict with privacy/deletion docs.
- Legal docs omit material data processing that the app actually performs.

---

# Final audit mode

Use this section after executing Steps 1–5. Create:

```text
docs/audit/YYYY-MM-DD-kaswise-store-submission-final-audit.md
```

## Required audit structure

```markdown
# Kaswise Store Submission Final Audit

Date: YYYY-MM-DD
Auditor: Hermes / Forge
Scope: Kaswise Track A native submission readiness for Play Store and App Store
Repo commit: <sha>

## Executive verdict

- Play Store: GO / GO WITH RISKS / NO-GO
- App Store: GO / GO WITH RISKS / NO-GO

One-paragraph explanation.

## Evidence summary

| Area | Status | Evidence | Risk / note |
|---|---|---|---|
| Native release candidate | PASS/PARTIAL/FAIL | ... | ... |
| Device smoke test | PASS/PARTIAL/FAIL | ... | ... |
| Billing compliance | PASS/PARTIAL/FAIL | ... | ... |
| Legal URLs | PASS/PARTIAL/FAIL | ... | ... |
| Account deletion | PASS/PARTIAL/FAIL | ... | ... |
| Reviewer-visible honesty | PASS/PARTIAL/FAIL | ... | ... |
| Store metadata | PASS/PARTIAL/FAIL | ... | ... |
| Data Safety / App Privacy | PASS/PARTIAL/FAIL | ... | ... |
| Screenshots/assets | PASS/PARTIAL/FAIL | ... | ... |

## Play Store assessment

### Verdict: GO / GO WITH RISKS / NO-GO

- Billing:
- Account deletion:
- Data Safety:
- Metadata/assets:
- Remaining risks:

## App Store assessment

### Verdict: GO / GO WITH RISKS / NO-GO

- Billing:
- Privacy policy:
- App Privacy:
- Metadata/assets:
- Remaining risks:

## Stop conditions checked

- [ ] Native app cannot trigger external premium purchase.
- [ ] Privacy URL renders intended content.
- [ ] Account deletion URL renders intended content.
- [ ] In-app account deletion request works or is explicitly supported by Track A process.
- [ ] Screenshots do not show hidden/unavailable flows.
- [ ] Reviewer notes are ready.
- [ ] Release candidate build was installed and smoke-tested.

## Final required actions before submit

1. ...
2. ...
3. ...
```

## Verdict rules

### GO

Use only if all of these are true:

- Native release candidate exists for the target store.
- Device smoke test passed on the exact candidate.
- No native external premium purchase path is reachable.
- Legal/support/deletion URLs render correct content.
- Account deletion request/support process is operational.
- Store metadata, screenshots, reviewer notes, and privacy/data-safety answers are complete and consistent.

### GO WITH RISKS

Use if repo/code readiness is strong but one or more non-code submission items still require manual confirmation, such as:

- Console metadata is drafted but not independently verified.
- Screenshots are prepared but not reviewed against the latest build.
- Device smoke test passed on one platform but not the other.
- Legal URLs render correctly but final console field entry is not confirmed.

Do not use `GO WITH RISKS` if a hard policy blocker remains.

### NO-GO

Use if any hard blocker remains:

- Native app can trigger external Midtrans/premium purchase for digital unlocks.
- No tested native release candidate exists.
- Legal/deletion URLs are broken or render wrong content.
- Account deletion request path/support process is not operational.
- Store privacy/data-safety answers are missing or contradict app behavior.
- Screenshots/reviewer notes misrepresent the app.

## Evidence hierarchy

1. Actual native build/device evidence.
2. Store console metadata/screenshots/privacy-answer evidence.
3. Runtime/browser verification of production URLs.
4. Repo tests and implementation evidence.
5. Canonical docs.

Do not mark console or device-only tasks complete from repo evidence alone.

---

# Acceptance criteria for this plan

This plan is complete when:

- A future model can execute the 5 steps without needing prior chat context.
- Every step has exact files, commands, evidence requirements, pass conditions, and stop conditions.
- Final audit mode provides a concrete verdict format for Play Store and App Store separately.
- Any unverified manual item is forced into `PARTIAL` or `NO-GO`, not silently treated as done.
