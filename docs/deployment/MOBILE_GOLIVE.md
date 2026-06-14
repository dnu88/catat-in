# Kaswise Mobile Go-Live Guide

Status: Track A public native submission guide
Last updated: 2026-06-14
Owner: Kaswise engineering

Purpose
- Define the real minimum process for releasing Kaswise mobile to public stores.
- Prevent future sessions from assuming that a green Expo/EAS build alone means Play Store or App Store readiness.
- Keep native release operations aligned with the current Track A product strategy.

Scope
- Native iOS and Android public submission flow
- Internal release-candidate verification before submission
- Store metadata and reviewer-preparation requirements

Out of scope
- Track B native billing implementation
- Full self-service in-app account deletion flow
- Web/PWA deployment steps that do not affect native store submission

Related artifacts
- Audit: `docs/audit/2026-06-14-kaswise-store-readiness-audit.md`
- Execution plan: `docs/plans/2026-06-14-kaswise-store-readiness-minimum-change-plan.md`
- Submission checklist: `docs/deployment/MOBILE_STORE_SUBMISSION_CHECKLIST.md`
- Support SOP: `docs/operations/ACCOUNT_DELETION_SUPPORT_SOP.md`
- Privacy source: `docs/legal/privacy-policy.md`
- Account deletion source: `docs/legal/account-deletion.md`
- Terms source: `docs/legal/terms.md`

---

## 1. Current release posture

Kaswise currently follows Track A for public native store readiness.

Track A means:
- native public build is free-only
- native app must not initiate external Midtrans purchase for premium digital features
- web/PWA may still use Midtrans
- existing premium entitlements may still be recognized after login, but native app must not act as an external checkout funnel

This means a successful EAS build is only one requirement. Public submission is not ready unless billing posture, legal URLs, deletion path, reviewer-visible surfaces, and store metadata are all aligned.

---

## 2. Track A vs Track B

### Track A — current approved path
Use this when:
- native store billing is not implemented yet
- the team needs the safest minimum-change path to public submission

Requirements:
- premium purchase CTA inside native app stays disabled
- native free quota behavior is honest and coherent
- legal/account-deletion resources are public and easy to access
- unfinished reviewer-visible surfaces stay hidden or clearly corrected

### Track B — future path
Use this only after product and engineering explicitly choose it.

Additional requirements:
- Apple IAP / Google Play Billing implementation
- product IDs and entitlement sync
- restore-purchase flow
- billing QA across iOS and Android store sandboxes
- updated reviewer notes and policy answers reflecting native paid unlocks

Do not mix Track A and Track B assumptions in the same submission cycle.

---

## 3. Billing and entitlement rules for public submission

Public native submission requires a store-compliant billing strategy.

Current rule for Track A:
- free features and free AI quota are allowed in native store builds
- premium digital unlock must not be sold through external Midtrans flow from inside the native app
- if free AI quota is exhausted, the app may stop access or explain reset timing, but must not route the reviewer into external native purchase flow

Operational rule:
- if a change re-enables native premium purchase, stop the submission process until Track B billing work is completed

Verification pointers:
- `apps/mobile/src/config/store-release.ts`
- `apps/mobile/app/upgrade.tsx`
- `apps/mobile/app/(tabs)/capture.tsx`

---

## 4. Required public URLs for store metadata

Use production URLs only.

- Privacy policy: `https://kaswise.com/privacy`
- Terms of service: `https://kaswise.com/terms`
- Support/contact: `https://kaswise.com/contact`
- Account deletion: `https://kaswise.com/account-deletion`

These URLs must be:
- publicly reachable without login
- consistent with mobile Settings links
- consistent with store metadata in App Store Connect and Play Console
- verified to render the intended legal/account content, not just return a generic SPA shell with HTTP 200

Current verification note (2026-06-14):
- `curl -I` confirms `https://kaswise.com/privacy`, `/terms`, `/contact`, and `/account-deletion` return HTTP 200.
- Store-readiness follow-up now adds explicit Expo/mobile public routes plus SPA fallback generation for `privacy`, `terms`, `contact`, `account-deletion`, and `help` during `pnpm --filter mobile export:pwa`.
- Local export verification confirms `apps/mobile/dist/privacy/index.html`, `terms/index.html`, `contact/index.html`, `account-deletion/index.html`, and `help/index.html` are generated.
- Final store submission still requires production deploy plus live verification that those URLs render the intended legal/account content after deployment.

---

## 5. Account deletion requirement

Before public submission:
- signed-in users should be able to submit an authenticated deletion request from mobile Settings
- account deletion guidance must be publicly reachable
- the page must explain request path, retention/deletion summary, and expected handling timeline
- support/ops must have a real internal process to fulfill those requests
- the current support owner must be able to follow `docs/operations/ACCOUNT_DELETION_SUPPORT_SOP.md`

Minimum Track A interpretation:
- an authenticated in-app request flow plus a public deletion-request fallback is acceptable
- full self-service native deletion is not yet required for this track

If the deletion flow, public page, or support process is not ready, treat that as a submission blocker.

---

## 6. Reviewer-visible feature honesty

Before submission, inspect reviewer-visible surfaces and assets.

Must be true:
- no external premium checkout is visible in native app
- no dormant voice-capture mode is visible if it is not truly implemented for Track A
- no misleading import or beta surface is presented as production-ready if reviewers can reach it
- screenshots and preview assets reflect the real native Track A surface

Current Track A note:
- Capture AI surface should expose only the real reviewer-safe modes that are intentionally shipped now

---

## 7. Reviewer notes and test-account preparation

Prepare reviewer notes for every submission.

Suggested notes:
- Kaswise public native build is currently submitted as a free-only Track A experience.
- Premium purchase is not available from inside the native app.
- Public legal resources:
  - Privacy: https://kaswise.com/privacy
  - Terms: https://kaswise.com/terms
  - Account deletion: https://kaswise.com/account-deletion
  - Support: https://kaswise.com/contact

If the app needs a test account or seeded scenario for review, prepare it before submission and store the instructions in the release handoff for that build.

Reviewer prep checklist:
- reviewer note text drafted
- support contact verified
- any demo/test credentials verified
- reviewer path does not hit dead links or hidden broken states

---

## 8. Release candidate verification flow

Use this flow before every public native submission.

### A. Code and config verification
Run from repo root:

```bash
cd /home/Danu88/catat-in
pnpm --filter mobile type-check
pnpm --filter mobile test --runInBand
pnpm --filter mobile quality:live
```

### B. Legal/deployment verification
Confirm:
- `docs/deployment/MOBILE_STORE_SUBMISSION_CHECKLIST.md` is up to date
- public URLs in the checklist still match mobile config and web routes
- `docs/legal/` sources still match public hosted content

### C. Reviewer-surface verification
Confirm:
- upgrade flow in native app stays non-purchasable for Track A
- capture surface does not expose misleading dormant modes
- settings links open the correct legal pages

### D. Build/release verification
Confirm:
- version/build numbers are correct
- bundle/package identifiers are correct
- release-candidate build installs cleanly
- smoke test covers login, dashboard, capture text/photo, settings legal links, and reports basics

---

## 9. Relationship to the submission checklist

`docs/deployment/MOBILE_STORE_SUBMISSION_CHECKLIST.md` is the canonical checkbox artifact.

Use this guide for:
- release posture
- policy interpretation
- operational sequencing
- reviewer prep guidance

Use the checklist for:
- final go/no-go decision
- metadata completeness
- legal URL completeness
- verification sign-off

A submission is not ready until both this guide and the checklist are satisfied.

---

## 10. Stop conditions

Do not submit if any of these are true:
- native app can still trigger external premium purchase
- privacy policy URL is missing or broken
- account deletion page is missing or broken
- screenshots/assets still show misleading or unfinished flows
- reviewer notes are not prepared
- release-candidate verification has not been run on the actual candidate build

---

## 11. Future update trigger

Update this file immediately when any of these change:
- Track A switches to Track B
- native billing is implemented
- legal URLs change
- deletion process changes materially
- reviewer-visible premium/AI surface changes
