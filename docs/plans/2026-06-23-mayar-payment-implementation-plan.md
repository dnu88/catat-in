# Mayar Payment Implementation Plan

## Status

**COMPLETED** — Provider abstraction, MayarProvider skeleton, triple-guard, and activation-gate fix implemented, tested, and merged into `fix/mayar-activation-guard` (PR #24).

## Overview

Integrate Mayar as a secondary payment gateway alongside Midtrans using a provider-neutral abstraction layer that isolates gateway logic from business orchestration. A triple-guard safety model gates Mayar at checkout, activation, and webhook levels, enabling limited production testing before full go-live.

## Architecture

```
POST /api/v1/payments/create
  → payment_service.create_checkout()
    → resolve_checkout_provider_name()       ← Guard 1: MAYAR_ALLOWED_EMAILS
    → _insert_pending_payment()
    → provider.create_checkout()              ← MayarProvider or MidtransProvider
    → _persist_checkout_reference()

GET /api/v1/payments/{id}/status
  → payment_service.fetch_and_sync_status()
    → provider.fetch_status()
    → provider.map_internal_status()
    → _should_activate_provider()             ← Guard 2: MAYAR_ACTIVATION_ENABLED
    → provider.build_payment_update()
    → repository.update_payment()
    → repository.update_profile()            ← (only if guard 2 is true)
```

## Current State

### Phase 1 — Provider Abstraction (✅ 2026-06-26)

| Component | File | Purpose |
|-----------|------|---------|
| `PaymentProvider` ABC | `backend/app/services/payments/providers/base.py` | Uniform interface defining `create_checkout`, `fetch_status`, `verify_notification_signature`, `map_internal_status`, `extract_order_id`, `extract_gross_amount`, `build_payment_update` |
| `MidtransProvider` | `backend/app/services/payments/providers/midtrans.py` | Midtrans Snap + Core API adapter wrapping existing midtransclient calls |
| `MayarProvider` | `backend/app/services/payments/providers/mayar.py` | Mayar Invoice API adapter with injectable `request_func` for testability |
| Provider registry | `backend/app/services/payments/providers/__init__.py` | Re-exports all providers, `build_core_client`, `build_snap_client`, `map_status` |
| `orchestrator.py` | `backend/app/services/payments/orchestrator.py` | Provider-neutral orchestration: `fetch_and_sync_status`, `activate_premium_from_notification`, `price_for`, `tier_for_count`, `make_order_id`, `duration_days` |
| `repository.py` | `backend/app/services/payments/repository.py` | Persistence helpers: `insert_pending_payment`, `get_payment_for_user`, `get_payment_by_order_id`, `count_paid_users`, `update_payment`, `get_profile`, `update_profile` |
| `payment_service.py` | `backend/app/services/payment_service.py` | Compatibility facade: `get_primary_payment_provider_name`, `resolve_checkout_provider_name`, `is_mayar_checkout_allowed`, `_provider_for_name`, `_should_activate_provider` |
| Models & constants | `backend/app/services/payments/models.py` | `CheckoutResult`, `PaymentStatusResult`, `TERMINAL_PAYMENT_STATUSES`, field selectors |
| Supabase migration | `supabase/migrations/202606230001_payment_provider_phase0.sql` | Adds `provider`, `provider_order_id`, `provider_transaction_id`, `provider_status` columns to `payments` |
| Backend config | `backend/app/core/config.py` | `PAYMENT_PRIMARY_PROVIDER`, `MAYAR_API_KEY`, `MAYAR_BASE_URL`, `MAYAR_REDIRECT_URL`, `MAYAR_CALLBACK_URL`, `MAYAR_ALLOWED_EMAILS`, `MAYAR_WEBHOOKS_ENABLED`, `MAYAR_ACTIVATION_ENABLED` |
| Backend .env example | `backend/.env.example` | Documented template with placeholders for all Mayar env vars |
| API endpoint | `backend/app/api/v1/payments.py` | `POST /create`, `GET /pricing`, `GET /{order_id}/status` — all provider-aware |
| Mobile billing types | `apps/mobile/src/services/billing.ts` | `CreatedPayment` and `PaymentStatus` extended with optional `provider` / `provider_status`; mobile tests verify provider-neutral fields |

### Tests (✅ Done)

| Test file | Coverage |
|-----------|----------|
| `backend/tests/test_mayar_provider.py` (4 tests) | Create checkout contract, legacy callback fallback, fetch status, disabled signature verification |
| `backend/tests/test_payment_provider_selection.py` (6 tests) | Email parsing/normalization, env config, allowlist/deny logic, activation gate |
| `backend/tests/test_payments_create.py` | Create endpoint works with provider abstraction, error handling |
| `backend/tests/test_payments_status.py` | Status endpoint handles provider field, rate-limited |
| `apps/mobile/src/services/billing.test.ts` | Provider-neutral response fields accepted by mobile client |

### Triple-Guard Safety Model

| Guard | Config Key | Default | Mechanism |
|-------|-----------|---------|-----------|
| **Checkout allowlist** | `MAYAR_ALLOWED_EMAILS` | `[]` | `resolve_checkout_provider_name()` raises `MayarAccessDeniedError` for non-allowlisted emails. Empty list = nobody can use Mayar. Case-insensitive matching. |
| **Activation gate** | `MAYAR_ACTIVATION_ENABLED` | `false` | `_should_activate_provider("mayar")` returns `false` by default. When false, `fetch_and_sync_status` skips profile update and returns the original row status (e.g. `"pending"`), preventing Mayar paid statuses from inflating `count_paid_users`. |
| **Webhook disabled** | `MAYAR_WEBHOOKS_ENABLED` | `false` | Mayar notification handler is not wired. Only Midtrans notification callback is active for server-side payment confirmation. |

### Activation Gate Fix Detail

The second commit (`850fb31`) ensures that when `MAYAR_ACTIVATION_ENABLED=false`:

1. `fetch_and_sync_status` calls `activate_premium_from_notification` with `activate_paid_profile=False`.
2. Inside `activate_premium_from_notification`, when the provider maps to `"paid"` but `activate_paid_profile` is `False`, the function returns the **original row status** (`"pending"`) instead of `"paid"`.
3. The orchestrator then writes the returned status (`"pending"`) to the payment record.
4. `count_paid_users` queries `SELECT user_id FROM payments WHERE status = 'paid'`, so Mayar sandbox payments never count toward the paid-user count that determines promo/normal pricing tiers.

## Future Work (Roadmap)

- ~~**Mayar webhook endpoint**: Wire a `/api/v1/webhooks/mayar` endpoint behind `MAYAR_WEBHOOKS_ENABLED` and implement `verify_notification_signature` properly.~~ — DONE (2026-06-26): endpoint wired behind `MAYAR_WEBHOOKS_ENABLED`; Mayar has no cryptographic signature, so the handler re-fetches authoritative status from Mayar's authenticated Invoice API (`reconcile_mayar_notification`) plus an optional `MAYAR_MERCHANT_ID` soft-auth.
- **Payment method selector**: Expose provider choice to the upgrade UI when more than one provider is supported for the user.
- **Fallback chain**: If primary provider checkout fails, try secondary provider automatically before failing.
- **Promote Mayar to primary**: Flip `PAYMENT_PRIMARY_PROVIDER=mayar` once production-tested and Midtrans contract renegotiation is complete.
- **Multi-provider dashboard**: Admin view showing payment breakdown by provider.
