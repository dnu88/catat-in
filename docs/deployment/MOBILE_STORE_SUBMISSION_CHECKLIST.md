# Kaswise Mobile Store Submission Checklist

Status: Track A baseline for public native submission
Last updated: 2026-06-14
Owner: Kaswise engineering

Purpose
- Keep native store submission aligned with the current product reality.
- Prevent future sessions from submitting a technically working build that still violates store policy or misleads reviewers.

Current release strategy
- Track A = native app is free-only for public store submission.
- Premium digital unlock must not be purchased from inside the native iOS/Android app while native store billing is not implemented.
- Midtrans remains allowed for web/PWA only.

Canonical references
- Audit: `docs/audit/2026-06-14-kaswise-store-readiness-audit.md`
- Plan: `docs/plans/2026-06-14-kaswise-store-readiness-minimum-change-plan.md`
- Go-live guide: `docs/deployment/MOBILE_GOLIVE.md`
- Support SOP: `docs/operations/ACCOUNT_DELETION_SUPPORT_SOP.md`
- Privacy policy source: `docs/legal/privacy-policy.md`
- Account deletion source: `docs/legal/account-deletion.md`
- Terms source: `docs/legal/terms.md`

Production public URLs
- Privacy policy: `https://kaswise.com/privacy`
- Terms of service: `https://kaswise.com/terms`
- Support/contact: `https://kaswise.com/contact`
- Account deletion: `https://kaswise.com/account-deletion`

1. Billing compliance
- [ ] Native iOS build does not show or trigger external premium purchase for digital features.
- [ ] Native Android build does not show or trigger external premium purchase for digital features.
- [ ] Upgrade copy in native app clearly states premium purchase is temporarily handled on web/PWA.
- [ ] No reviewer-visible button, modal, or deep link sends users to Midtrans from native store builds.
- [ ] If premium is shown anywhere, the wording does not imply in-app purchase is available natively unless real store billing exists.

2. Legal and policy URLs
- [ ] Privacy policy page is publicly reachable without login and renders the intended legal content.
- [ ] Terms page is publicly reachable without login and renders the intended legal content.
- [ ] Contact/support page is publicly reachable without login and renders the intended support content.
- [ ] Account deletion page is publicly reachable without login and renders the intended deletion guidance.
- [ ] Mobile Settings exposes privacy policy, terms, and account deletion links.
- [ ] Store metadata uses the same production URLs as the app.

3. Account deletion readiness
- [ ] Signed-in users can submit an authenticated deletion request from mobile Settings.
- [ ] Public deletion page explains how users request account deletion.
- [ ] Public deletion page explains what data is deleted or anonymized.
- [ ] Public deletion page explains what limited data may be retained and why.
- [ ] Public deletion page states a processing timeline target.
- [ ] The actual operational deletion process is ready for support to execute.
- [ ] Support team has the current SOP at `docs/operations/ACCOUNT_DELETION_SUPPORT_SOP.md`.

4. Reviewer-visible feature honesty
- [ ] No unfinished voice-capture feature is visible in store-targeted builds.
- [ ] No unfinished import flow is presented as if fully available to reviewers unless clearly marked and intentionally included.
- [ ] Permissions requested by the app match real reviewer-visible functionality.
- [ ] Screenshots and preview videos do not showcase unfinished or hidden functionality.

5. Store metadata pack
- [ ] App description matches the current free/native scope.
- [ ] Privacy policy URL is prepared for App Store Connect and Play Console.
- [ ] Support URL/contact email is prepared for store metadata.
- [ ] Account deletion URL is prepared for Play Console policy fields if required.
- [ ] Reviewer notes explain that native public build is Track A free-only and premium stays on web/PWA.

Suggested reviewer notes template
- Kaswise public native build is currently submitted as a free-only experience.
- Premium purchase is not available from inside the native app.
- Public legal resources:
  - Privacy: https://kaswise.com/privacy
  - Terms: https://kaswise.com/terms
  - Account deletion: https://kaswise.com/account-deletion
  - Support: https://kaswise.com/contact

6. Data Safety / App Privacy preparation
- [ ] Data collection answers are reconciled against the live app behavior.
- [ ] Third-party processors/services listed in the legal docs match metadata answers.
- [ ] Financial/account/profile data handling answers match the privacy policy.
- [ ] Deletion/retention answers match the account deletion and privacy policy docs.

7. Assets and submission packaging
- [ ] App icon, splash, screenshots, and preview assets match the current UI.
- [ ] Screenshots do not show hidden premium purchase flow in native app.
- [ ] Screenshots do not show unfinished voice-capture or misleading beta flows.
- [ ] Bundle/package identifiers are correct for production.
- [ ] Version/build number for the submission build is set correctly.

8. Verification evidence before submit
- [ ] `pnpm --filter mobile type-check`
- [ ] targeted mobile tests for store gating and legal links pass
- [ ] targeted web tests for legal/account deletion pages pass
- [ ] `pnpm --filter mobile quality:live` passes for the release candidate
- [ ] Release build or internal-test artifact is generated and smoke-tested
- [ ] `pnpm --filter mobile export:pwa` produces public route artifacts for `/privacy`, `/terms`, `/contact`, `/account-deletion`, and `/help`

9. Final go/no-go decision
Submit only if all statements below are true:
- [ ] Native public build is honest about what is available today.
- [ ] Store reviewers can access privacy, support, and deletion resources easily.
- [ ] No prohibited external digital purchase flow is visible in the native build.
- [ ] Submission assets and metadata match the actual shipped behavior.
- [ ] Support/ops team can fulfill deletion/privacy requests described in the public docs.

Not in scope for Track A
- Native Apple/Google in-app billing
- Native restore purchases flow
- Full self-service delete-account endpoint inside the app

When Track B starts
- Create a new design/implementation plan for native store billing and entitlement sync before changing this checklist.
