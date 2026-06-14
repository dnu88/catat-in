# Changelog

All notable changes to this repository are documented here.

Format: Keep a Changelog.

## Unreleased

### Changed
- Added a formal Kaswise native store-readiness audit and a minimum-change execution plan. Current recommendation: native free-only first, keep Midtrans for web/PWA, and remove native external premium purchase flow before public Play Store / App Store submission.
- Implemented Phase 1 Track A mobile gating: native iOS/Android builds now suppress the premium purchase CTA/flow, while web/PWA keeps the existing Midtrans upgrade path.
- Implemented Phase 2 legal/account-lifecycle readiness: canonical `docs/legal/` source files now exist for privacy, account deletion, and terms; mobile Settings now links to public production legal URLs; and the web app now exposes a public `/account-deletion` page for users and store reviewers.
- Added `docs/deployment/MOBILE_STORE_SUBMISSION_CHECKLIST.md` as the canonical submission-ops checklist for native store metadata, legal URLs, reviewer notes, and final pre-submit verification.
- Completed the minimum Phase 3 reviewer-surface cleanup: Capture AI now exposes only the real Track A modes (`Teks` and `Foto`) and removes dormant voice/import copy from the store-targeted surface.
- Added `docs/deployment/MOBILE_GOLIVE.md` as the canonical Track A native go-live guide, covering billing posture, legal/account-deletion requirements, reviewer preparation, stop conditions, and checklist linkage.
- Verified that `https://kaswise.com/privacy`, `/terms`, `/contact`, and `/account-deletion` currently return HTTP 200, but documented that final store-readiness still requires proving those URLs render the intended legal content rather than only the generic Expo/PWA shell.

### Fixed
- Mobile transaction review and notification flow now respect `is_verified`, so transactions that have already been reviewed no longer keep reappearing in the review queue or related transaction review CTA.

### Security
- Remediated repo-side findings from the 2026-06-12 security audit: payment status ownership checks, payment amount validation, bounded upload/import parsing, spreadsheet formula escaping, dependency CVE upgrades, non-root backend container runtime, stricter Vercel security headers, and legacy RLS cleanup migration.
- Replaced tracked hardcoded TestSprite key values with `${TESTSPRITE_API_KEY}` placeholders; the exposed TestSprite API key was revoked by the account owner on 2026-06-13.
- Applied Supabase migration `202606120001_drop_legacy_permissive_rls_policies.sql` to the linked production project and verified `legacy_policy_count = 0`.

## 2026-06-12

### Added
- Milestone 3: Transaction Review Queue — transaction review service helper, dashboard CTA, and review filter were implemented and deployed (PR #14).

### Changed
- Review-queue behavior was tuned to reduce false positives by lowering the confidence threshold and tightening missing-field checks (PR #15).

### Fixed
- Bills screen now uses stable name-based colors for bill visuals instead of category lookup.
- Monthly "Mark Paid" now correctly sets `is_paid=true` before rolling the due date forward, so the item updates to paid immediately (PR #16).

### Docs
- `CLAUDE.md` and the roadmap plan now include short notes so future work can trace the implementation trail quickly.

## 2026-05-10

### Added
- Legacy web UI polish: logo alignment and print stylesheet improvements for PDF export.

### Changed
- Deep navy brand color tokens were aligned across the legacy web presentation layer.

## 2026-05-06

### Added
- Foundation reset from Firebase/Firestore to Expo + Supabase Cloud.
- Expo Router mobile app skeleton, Supabase schema, storage buckets, and shared Supabase types.

### Docs
- Added migration notes and architecture context in `CLAUDE.md`.

## Notes

- Detailed per-release technical records live in `docs/releases/*`.
- Historical phase-based changelogs remain in `docs/changelog/PHASE_0_CHANGELOG.md` and `docs/changelog/PHASE_1_CHANGELOG.md`.
