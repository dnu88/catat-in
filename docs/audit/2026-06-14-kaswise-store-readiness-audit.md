# Kaswise Store Readiness Audit

Date: 2026-06-14
Author: Hermes / Forge
Scope: `apps/mobile` Expo app, supporting backend payment endpoints, current mobile submission readiness for Google Play and Apple App Store

## Executive verdict

Short answer: Kaswise is not yet professionally ready for App Store submission, and is not yet safe for Play Store submission if the current premium purchase flow remains visible in the Android app.

Engineering maturity is already respectable:
- Mobile live quality gate passes
- Backend test suite passes
- CI and go-live smoke workflows exist
- App identifiers, icons, splash, and EAS production profile already exist

But store compliance readiness still has hard blockers:
- Premium digital functionality is currently sold via external Midtrans web flow from inside the app
- No clear in-repo evidence yet for privacy policy URL surfaced inside the mobile app
- No clear in-repo evidence yet for account deletion flow or deletion request link
- Some feature surface/copy suggests capabilities that are not yet obviously implemented for store review (notably voice capture)

Final rating:
- Engineering discipline: 7.5/10
- Play Store readiness: 4.5/10
- App Store readiness: 2.5/10

## Evidence gathered

Commands run:

```bash
pnpm --filter mobile quality:live
cd backend && .venv/bin/python -m pytest -q
```

Observed results:
- Mobile quality gate: PASS
- Focused mobile live regression tests: 104 passed
- PWA export: PASS
- Required bundle markers: PASS (32 markers)
- Backend tests: 148 passed

Repo evidence reviewed:
- `apps/mobile/app.json`
- `apps/mobile/eas.json`
- `apps/mobile/package.json`
- `apps/mobile/app/upgrade.tsx`
- `apps/mobile/src/services/billing.ts`
- `backend/app/services/payment_service.py`
- `backend/app/api/v1/webhooks.py`
- `.github/workflows/ci.yml`
- `.github/workflows/golive-pwa.yml`
- `apps/mobile/dist/release-report.json`

Policy evidence reviewed from official sources:
- Apple App Store Review Guidelines section 3.1.1 In-App Purchase
- Apple App Store Review Guidelines section 5.1.1 Data Collection and Storage
- Google Play Payments policy text for digital goods / subscriptions / app functionality
- Google Play account deletion help guidance

## Current product/implementation snapshot

### What is already strong

1. Release discipline for the PWA/mobile codebase is real, not superficial.
   - `apps/mobile/package.json` includes `quality:live`, `verify:live-registry`, `test:live-regression`, `export:pwa`, and `check:bundle`
   - `.github/workflows/ci.yml` runs a mobile quality gate
   - `.github/workflows/golive-pwa.yml` runs live Playwright smoke tests
   - `apps/mobile/dist/release-report.json` shows a recent successful live verification artifact

2. Native project basics already exist.
   - `app.json` includes bundle/package identifiers: `com.kaswise.app`
   - `eas.json` includes production Android app-bundle profile
   - icons and splash assets exist under `apps/mobile/assets/`

3. Payment backend scaffolding is not fake.
   - backend has pricing, create payment, status sync, and Midtrans webhook logic
   - webhook signature verification and payment status tests exist

### What is currently blocking store readiness

1. Premium purchase flow is store-noncompliant for native submission.
   - `apps/mobile/app/upgrade.tsx` opens `res.redirect_url` via `WebBrowser.openBrowserAsync(...)`
   - `backend/app/services/payment_service.py` creates Midtrans Snap transactions
   - `apps/mobile/src/services/billing.ts` calls backend endpoints for pricing/payment/status
   - premium unlocks in-app digital features: OCR receipts, AI chat quota, AI Insight, premium plan state

2. Privacy/account-compliance artifacts are missing in the mobile experience.
   - no clear privacy policy link discovered inside `apps/mobile`
   - no clear terms link discovered inside `apps/mobile`
   - no clear delete-account flow discovered in mobile app or backend code

3. Some user-facing feature language may overstate native readiness.
   - `apps/mobile/app/(tabs)/capture.tsx` advertises voice recording / Whisper-based flow
   - no obvious recording implementation path was found during this audit (`Audio.Recording`, microphone permission flow, recording lifecycle)

## Store requirement assessment

## A. Apple App Store

### A1. In-app purchase rule

Status: RED / blocker

Apple guideline 3.1.1 says apps that unlock features or functionality inside the app must use in-app purchase.

Kaswise currently sells or prepares to sell:
- premium subscription access
- AI usage quota expansion
- OCR/AI feature unlocks
- feature-level digital benefits inside the app

Current implementation instead routes the purchase through external Midtrans browser flow.

Professional assessment:
- this is a direct App Store review risk
- Midtrans verification does not solve this policy issue
- iOS submission with the current visible upgrade flow is expected to be rejected or forced into revision

### A2. Privacy policy visibility

Status: RED / blocker until evidence exists

Apple guideline 5.1.1 requires:
- privacy policy URL in App Store Connect metadata
- privacy policy accessible from within the app
- clear deletion/retention explanation

This audit did not find clear in-app privacy entry points in `apps/mobile`.

### A3. Permission clarity / data minimization

Status: YELLOW

Good signs:
- `expo-image-picker` permission text exists in `app.json`

Open questions for native review:
- if voice capture is shipped, microphone permission copy and actual behavior must be implemented and coherent
- any declared/visible feature must match real native behavior

## B. Google Play Store

### B1. Billing for digital goods/services

Status: RED / blocker if premium purchase remains available in Android app

Google Play policy text requires Google Play Billing for:
- subscription services
- app functionality unlocks
- digital content/services in the app
- financial management software upgrades also fall within the risky zone when functionality is unlocked digitally

Kaswise Premium is currently initiated through external Midtrans purchase flow, which is not the correct default path for in-app digital subscription purchase on Play-distributed Android builds.

Professional assessment:
- current Android premium purchase path is high-risk for policy rejection
- Midtrans verification helps operations, but not Play Billing compliance

### B2. Account deletion policy

Status: RED / blocker until implemented

Google Play now requires users to be able to:
- delete their app account and associated data from within the app, and
- access a web link resource for account deletion request/data deletion information

This audit did not find a mobile delete-account UX or obvious backend deletion flow.

### B3. Listing/privacy support assets

Status: YELLOW

Some basic technical prerequisites exist, but this audit did not verify complete store listing assets such as:
- support URL
- privacy URL
- final screenshots
- data safety disclosures
- reviewer notes/test credentials

## Checklist by area

### Engineering and release quality

- [x] Mobile type-check and focused regression suite pass
- [x] Backend pytest suite passes
- [x] CI workflow exists
- [x] Go-live smoke workflow exists
- [x] Bundle marker guard exists
- [x] EAS production profile exists
- [ ] Native device acceptance evidence collected for store candidate builds

### Billing / monetization compliance

- [ ] iOS premium uses Apple IAP instead of external Midtrans flow
- [ ] Android premium uses Google Play Billing instead of external Midtrans flow
- [ ] Web/PWA billing path is explicitly separated from native paths
- [ ] Subscription restore/history handling is defined for store builds
- [ ] Premium copy is platform-aware and not misleading

### Privacy / trust / legal

- [ ] Public privacy policy URL exists
- [ ] Public terms/support URL exists
- [ ] Privacy policy is linked inside the mobile app
- [ ] Data retention/deletion policy is documented
- [ ] Store data safety / privacy nutrition form inputs are ready

### Account lifecycle

- [ ] User can request/delete account from within app
- [ ] Backend actually deletes/anonymizes required data or records deletion request workflow
- [ ] Public deletion-request web page exists
- [ ] App Store / Play Store metadata reflects deletion flow correctly

### Product/review clarity

- [ ] Any visible feature in store build is actually working
- [ ] Voice capture is either fully implemented or hidden from store build
- [ ] Screenshots/descriptions avoid promising unfinished capabilities
- [ ] Reviewer test notes and demo account plan are prepared

## Recommended launch strategy

### Recommended path 1: PWA/web first, native later

Use current architecture for:
- PWA/web launch
- internal/private beta
- Midtrans verification and payment operations validation

Do not submit native store builds until billing and compliance gaps are closed.

### Recommended path 2: Native free-only launch first

If early native presence matters more than immediate monetization:
- hide/disable premium purchase inside store-distributed native builds
- ship free core experience only
- do not funnel users to an external purchase flow that appears to bypass store billing rules
- revisit monetization after store billing is implemented

### Recommended path 3: Full native-compliant monetization

Implement:
- Apple IAP for iOS
- Google Play Billing for Android
- keep Midtrans for web/PWA only

This is the cleanest long-term strategy, but requires the most integration work.

## Minimum go/no-go decision

### Go for now
- PWA / web rollout
- internal testing
- TestFlight / Play internal only if premium purchase path is hidden or clearly not part of reviewer flow

### No-go for public store submission today
- public App Store submission
- public Play Store submission with visible external Midtrans premium purchase flow

## Most important conclusion about Midtrans verification

Midtrans pending verification is not the main store blocker.

It matters for:
- payment operations
- production revenue readiness
- web/PWA monetization

But it does not fix:
- Apple IAP requirement
- Google Play Billing requirement
- privacy policy visibility requirement
- account deletion requirement

## Linked next artifact

Follow-on implementation plan:
- `docs/plans/2026-06-14-kaswise-store-readiness-minimum-change-plan.md`
