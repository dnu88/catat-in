# Changelog

All notable changes to this repository are documented here.

Format: Keep a Changelog.

## Unreleased

### Security
- Remediated repo-side findings from the 2026-06-12 security audit: payment status ownership checks, payment amount validation, bounded upload/import parsing, spreadsheet formula escaping, dependency CVE upgrades, non-root backend container runtime, stricter Vercel security headers, and legacy RLS cleanup migration.
- Replaced tracked hardcoded TestSprite key values with `${TESTSPRITE_API_KEY}` placeholders; the exposed TestSprite API key was revoked by the account owner on 2026-06-13.

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
