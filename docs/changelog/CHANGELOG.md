# Changelog

All notable changes to this repository are documented here.

Format: Keep a Changelog.

## Unreleased

### Added

- Implemented a config-gated Mayar payment provider skeleton with a provider-neutral abstraction layer (PR #24).
  - `PaymentProvider` abstract base class in `backend/app/services/payments/providers/base.py`.
  - `MayarProvider` targeting Mayar Invoice API (`/invoice/create`, `GET /invoice/{id}`).
  - `MidtransProvider` refactored from inline helpers into a class implementing `PaymentProvider`.
  - Provider-neutral orchestration in `orchestrator.py` (`fetch_and_sync_status`, `activate_premium_from_notification`).
  - Persistence layer extracted into `repository.py` under `backend/app/services/payments/`.
  - Compatibility facade in `payment_service.py` with `resolve_checkout_provider_name`.
  - Supabase migration `202606230001_payment_provider_phase0.sql` adding `provider`, `provider_order_id`, `provider_transaction_id`, `provider_status` columns to `payments` table.
  - Triple-guard safety model: `MAYAR_ALLOWED_EMAILS` (checkout allowlist), `MAYAR_ACTIVATION_ENABLED` (activation gate, default false), `MAYAR_WEBHOOKS_ENABLED` (webhook disabled, default false).
  - `MAYAR_ACTIVATION_ENABLED` applied to both `fetch_and_sync_status` and `activate_premium_from_notification`, so Mayar paid statuses never grant premium entitlements unless explicitly enabled.
  - Mobile billing service types (`CreatedPayment`, `PaymentStatus`) extended with optional `provider` and `provider_status` fields.
- Implemented the Mayar webhook endpoint `POST /api/v1/webhooks/mayar` for server-to-server premium activation, gated behind `MAYAR_WEBHOOKS_ENABLED`.
  - Mayar does NOT sign webhook payloads, so the handler treats each notification only as a trigger and re-fetches authoritative status from Mayar's authenticated Invoice API (`GET /invoice/{id}`) before activating premium (`reconcile_mayar_notification` in `payment_service.py`).
  - Maps the unsigned notification to our `payments` row via `provider_order_id` (the Mayar invoice id persisted at checkout) using the new `repository.find_payment_by_provider_order_id` lookup, which uses the existing `payments_provider_order_idx` index.
  - Optional soft-auth `MAYAR_MERCHANT_ID` header-less check rejects cross-merchant payloads before the re-fetch (fail-closed when unset by relying on the re-fetch-from-API trust model).
  - `MayarProvider` hardened for the webhook payload shape: `map_internal_status` prefers `transactionStatus`, `extract_gross_amount` falls back to `nettAmount` and returns `None` when amount is 0 (so the orchestrator's nominal check skips instead of rejecting real Mayar payments), and `extract_provider_order_ids` reads candidate invoice ids from `data.productId`/`paymentLinkId`/`id`/`transactionId`.
  - Operator reconciliation script `backend/scripts/reconcile_mayar_payment.py` for stuck Mayar orders paid while the activation gate was closed.

### Fixed

- Mayar disabled-activation payments no longer inflate `count_paid_users`: `fetch_and_sync_status` returns the original `row["status"]` (e.g. `"pending"`) when `MAYAR_ACTIVATION_ENABLED=false`, so `count_paid_users` never sees a `"paid"` status from Mayar.

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
