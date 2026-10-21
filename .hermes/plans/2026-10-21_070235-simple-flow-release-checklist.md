# Kaswise Simple Flow Release — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Release the verified narrow flow fixes safely, without repeating existing features or making completion of the entire five-point UX roadmap a release dependency.

**Architecture:** Keep the existing Capture, transaction editor, Home wallet stack and Finance Editorial identity. Verify the isolated candidate on device, prepare a production-configured build and rollback, request explicit release approval, then deploy and verify original-ID writes and balances using an authorized isolated fixture.

**Tech Stack:** Expo / React Native Web, TypeScript, Jest, Playwright, Supabase.

Planning only: this document does not authorize or execute deployment, commit, push or production-data changes.

## Tracking rules

- [x] means the stated stage is complete with evidence, NOT automatically deployed.
- Candidate-tested, device-verified, deployed and live-verified are separate states.
- Mark a parent stage done only after all its required children pass; capture failure reason and retest evidence for any regression.
- Owners: Hermes = preparation/automated checks/deploy and smoke after approval. Danu = physical-device acceptance and explicit deployment approval. Hermes prepares preview and steps; no credentials requested in chat.
- Device preview must identify the final candidate bundle. Candidate builds use preview/stub configuration and must NEVER be copied blindly to production.

## A. Candidate scope — complete locally, not deployed

- [x] A1. Autosave Edit targets original saved transaction ID, not create review.
- [x] A2. Browser amount edit/save produces PATCH original ID with one initial create call.
- [x] A3. Autosave Edit notification clears floating navigation and accepts real click.
- [x] A4. Premium batch supports explicit field-specific warning acknowledgement; invalid/unacknowledged data remains blocked.
- [x] A5. Premium receipt total/split has one save CTA, preserving discrepancy/permission guards.
- [x] A6. Home distinguishes loading, initial failure, ready-empty and refresh failure; retry preserves known data and scope guards reject late responses.
- [x] A7. Budget failure does not block core finance data; transfers are presented neutrally; period reset target >=44px.
- [x] A8. Reports period controls are consolidated while retaining reset, saved rules and custom options.
- [x] A9. Existing Capture, Home wallet stack and white/navy/blue identity retained.

## B. Automated verification — complete for current candidate

- [x] B1. Full Jest: 117 suites passed; 1076 tests passed; 9 skipped; 0 failures (1085 total). Skipped tests are not claimed as covered.
- [x] B2. TypeScript check passes with no errors.
- [x] B3. PWA export and 22 route fallbacks succeed.
- [x] B4. Required bundle markers: 43 present; feature registry valid.
- [x] B5. Chromium 390px: 39 browser cases pass.
- [x] B6. Chromium 360/430px: 6 additional critical cases pass.
- [x] B7. Diff whitespace validation passes; original production checkout unchanged.
- [ ] B8. After any further code changes, rerun affected gates and record final bundle identity.

## C. Physical iPhone candidate acceptance — release blocker

- [ ] C1. Hermes prepares a safe candidate preview with disposable fixture data, no personal production transaction writes; gives Danu direct link and short steps.
- [ ] C2. Record iPhone model, iOS version and browser; test Safari first, then Chrome iOS if used daily.
- [ ] C3. Text clear input -> autosave -> Ubah -> change amount -> Simpan: one transaction remains, corrected value shown.
- [ ] C4. Edit existing transaction: keyboard does not obscure input/save; category, wallet and date selectors open, cancel and confirm correctly.
- [ ] C5. Receipt: enter/select/cancel/Kembali retains previous text and wallet; total/split review offers exactly one save CTA.
- [ ] C6. Batch with uncertain field: warning can be acknowledged explicitly; another unresolved field still blocks save; valid batch saves once.
- [ ] C7. Home: balance and Catat reachable; wallet stack intact; delayed/error fixture does not look like a zero-balance new account; retry works.
- [ ] C8. Reports: switch period, reset and saved-rule/custom access work; selected period is clear without duplicate cards.
- [ ] C9. Record PASS/FAIL per case; fix/retest blockers before D is approved. Browser viewport tests do not substitute for physical keyboard or device motion.

## D. Release preparation and explicit approval — release blocker

- [x] D1. Review exact release diff; exclude unrelated changes. No commit/push performed.
- [x] D2. Prepare immutable rollback snapshot of current production HTML, JS/assets and runtime flags; verify snapshot can be restored.
- [x] D3. Prepare production-configured build using existing deployment pipeline; never deploy the preview Supabase configuration.
- [x] D4. Check production environment, existing feature flags, target URL and candidate provenance; do not expose secrets.
- [x] D5. Re-run canonical release gates for the actual deployable build (`quality:live`, registry and markers) and check `git diff --check`. Canonical predeploy: 162 tests pass.
- [x] D6. Obtain explicit Danu approval to deploy this release. User explicitly said "Oke, lanjut deploy". Physical-device checklist C remains unverified, not silently marked passed.

## E. Deploy and production readback — frontend + backend deployed, core verified

- [x] E1. Deploy only the approved scope using the canonical PWA pipeline; preserve rollback snapshot.
- [x] E2. Fetch target app and exact served bundle, flags and markers; ensure production—not stub—configuration. Live bundle entry-4656fac15869eaca017edc312acbd362.js byte-matched; 43 markers verified.
- [x] E3. Check normal access/login and Home/Capture/Reports navigation; no disruptive auth/session regression. Authenticated home, capture composer and reports rendered.
- [x] E4. With authorized disposable fixture, verify text save -> Edit -> save original ID, transaction count, wallet balance delta and refresh readback. Real AI parse -> autosave -> Ubah nominal 35000->45000 -> Simpan: 2 rows before and after (no duplicate), wallet balance 5,000,000->4,955,000, home readback Rp 4.955.000.
- [x] E5. Verify receipt total/batch guards and Home/Reports behavior in live context without modifying Danu's personal data. Free plan correctly gates receipt intake (photo_limit 0); batch uncertain-category warning UI exercised live; premium disposable fixture parsed a synthetic receipt through real OCR (total 88.000, 3 items, confidence 0.98, HTTP 200) and photo quota recorded exactly one use.
- [x] E6. Clean only the fixture transactions -> wallets -> auth user, then verify cleanup. Every smoke attempt verified transaction/wallet emptiness and removed its own disposable user.
- [x] E7. Ask Danu for brief iPhone live acceptance and record result; classify any device-only blocker. Danu confirmed he checked the live build on his iPhone and reported no blocker. Individual screen-by-screen results were not itemized, so this records owner acceptance without claiming automated device metrics.
- [ ] E8. If serious regression (duplicates, wrong balance, failed saves/auth, unusable controls): stop rollout, restore snapshot, verify live recovery, report issue. Never claim failed smoke as successful deployment.
- [x] E9. Publish release report: local-tested / device-verified / deployed / live-verified, pass/fail and remaining limitations. Core frontend fix and backend hotfix deployed; autosave edit original-ID live-verified.

Backend hotfix deployed after frontend release: missing `functools.lru_cache` import caused `/api/v1/me/entitlements` and `/api/v1/ai/chat` to return HTTP500 without CORS. Fix = add the import only (AST-verified no other delta); new image built as overlay on the exact running image with exact 54-var runtime env preserved; swapped via Compose `--force-recreate`, proxy restarted, runtime readback exact, health healthy. Authenticated entitlement probe now 200 with CORS and AI chat 200. Rollback image `kaswise-backend:pre-cache-import-20261021t003009z`.

Reports period observation — resolved. Root cause: `ReportPeriodProvider` loaded the stored preference asynchronously and applied it without checking whether the user had picked a period while that load was in flight, so a late response reverted "6 Bulan" to "1 Bulan". Fix: a selection version guard prevents a stale load from overwriting a newer choice, covered by `__tests__/report-period-selection.test.tsx` (red before, green after). Redeployed as bundle `entry-95f517cfff5244e6308acc262a5255f9.js`; live smoke now passes `live-reports-consolidated-period-and-header` along with the autosave, balance and cleanup cases.

## F. Five-point UX roadmap — subsequent work, not all release blockers

Live acceptance found a pre-existing backend defect: authenticated entitlements and AI answered HTTP500 without CORS (`NameError: lru_cache`). A minimal import-only hotfix was approved, built as an overlay on the exact running image, deployed with the 54-variable runtime preserved, and verified: entitlements 200 with CORS, AI chat 200, receipt OCR 200. This section is now a resolved record, not an open blocker.

### F1. Transaction entry
- [x] Existing text/receipt/defaults/editable review/Kembali retained; current hardening in A.
- [x] Make failed Undo visible and recoverable; do not imply successful cancellation if deletion fails. Undo now collects failed deletes, shows `capture-undo-error` ("Batalkan gagal — transaksi masih tersimpan") with a 44px `capture-undo-retry`, and clears it only after the delete actually succeeds. Covered by two new cases in `__tests__/capture-autosave.test.tsx`.
- [ ] Deferred (next scope): ask only for the missing field instead of opening full review. Needs a design decision because the financial validators (amount, type, category confidence) must stay blocking; not attempted blind.

### F2. Home simplicity
- [x] Existing primary Catat, balance/month summary, wallet stack and conditional attention retained; state reliability improved.
- [x] Assess settled screen density on device with long scope names and multiple alerts; change only demonstrated friction. Measured live with a disposable account holding five wallets (one name 56 characters) at 390px and 360px across Home, Capture and Reports: zero horizontal overflow, zero clipped text nodes, zero controls below 44×44. No change made because no friction was demonstrated.

### F3. Lightweight editing
- [x] Existing ID-based editor retained; autosave Edit corrected.
- [x] Device acceptance of keyboard, pickers and immediate saved-value/balance feedback. Owner confirmed the iPhone pass; live smoke proves the saved nominal and wallet balance update immediately (35.000→45.000, 5.000.000→4.955.000). No duplicate implementation added.

### F4. Reports and Settings
- [x] Existing report states and active settings values retained; period controls consolidated.
- [x] Language preference save-failure feedback implemented: `setLanguage` now reports whether the write persisted, `SettingsLanguageRow` shows `settings-language-error` ("aktif sekarang, tapi gagal disimpan di perangkat") instead of failing silently, and legacy fire-and-forget callers stay error-free. Covered by `__tests__/settings-language-persistence.test.tsx`.
- [ ] Deferred: unify every settings picker onto one sheet pattern (cosmetic consistency, separate scope).

### F5. Visual/motion polish
- [x] Existing Finance Editorial tokens/components preserved; no redesign.
- [x] Touch-target and text-clipping audit completed on live data (390/360, Home/Capture/Reports): no sub-44px interactive controls and no clipped long labels. Remaining picker/motion polish stays deferred so it does not churn a verified release.

## Engineering reference (internal execution details)

Workspace: `/home/Danu88/apps/kaswise-simple-flow-candidate`, branch `fix/simple-flow-audit`, baseline `ef7d7fe85a9cfe7eb8a960519ab0af886fadbd9d`.

Likely files only if a device regression requires a patch: `apps/mobile/app/(tabs)/capture.tsx`, `index.tsx`, `reports.tsx`; `src/components/transaction-entry/{AutoSaveToast,BatchReviewList,TransactionReview}.tsx`; existing corresponding Jest suites. Browser critical contract: `apps/mobile/tests/experience/audit-flow-hardening.spec.ts`. Verification record: `docs/design/moonveo-reference/Simple Flow Hardening - Verification.md`.

From `apps/mobile`, execute serially after changes:

```sh
corepack pnpm exec jest --runInBand
corepack pnpm exec tsc --noEmit
git diff --check
corepack pnpm quality:live
```

Builds/tests must not run concurrently with another export; use background jobs and completion notifications. Browser experience config serves isolated fixtures and supports 360/390/430 projects. Production release must use existing `deploy:pwa` configuration and approval—not the preview build. No backend/DB migration is part of this release.
