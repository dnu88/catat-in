# ADR-0003: Mayar Payment Provider Abstraction and Triple-Guard Safety Model

## Status

**Accepted** — Implemented and merged into `fix/mayar-activation-guard` (PR #24).

## Date

2026-06-23

## Context

Kaswise currently has a single payment gateway (Midtrans) wired inline through the payment service. To reduce payment-processing cost and remove dependency on a single provider, we need to add Mayar as an alternative gateway. The implementation must:

- Isolate gateway-specific HTTP/SDK calls from business orchestration.
- Allow Mayar to be safely tested in limited production without risking phantom premium activations or inflating paid-user metrics.
- Keep Midtrans as the default primary provider until Mayar is production-ready.

## Decision Drivers

- Provider-agnostic orchestration must not duplicate activation, status-sync, or repository logic per gateway.
- Limited-production testing must not compromise billing integrity or premium access control.
- The switch from Midtrans to Mayar must be a single config flag toggle, not a code change.

## Decision

Adopt a **Provider Abstraction + Triple-Guard Architecture**:

1. **PaymentProvider** abstract base class defining a uniform interface (`create_checkout`, `fetch_status`, `verify_notification_signature`, `map_internal_status`, `extract_order_id`, `extract_gross_amount`, `build_payment_update`). Each gateway (Midtrans, Mayar) gets its own class implementing this interface.
2. **Provider-neutral orchestration** in `orchestrator.py`: `fetch_and_sync_status`, `activate_premium_from_notification`, and pricing helpers operate on `PaymentProvider` instances, not concrete gateway code.
3. **Triple-guard safety model** (three independent config gates):
   - **Checkout allowlist** (`MAYAR_ALLOWED_EMAILS`): Only explicitly listed email addresses can initiate Mayar checkout.
   - **Activation gate** (`MAYAR_ACTIVATION_ENABLED`, default `false`): When false, Mayar `"paid"` statuses never grant premium entitlements or update the profile.
   - **Webhook disabled** (`MAYAR_WEBHOOKS_ENABLED`, default `false`): Mayar notification callback is not wired.

## Why Mayar Is Not Immediately Primary

| Factor | Reason |
|--------|--------|
| **Production track record** | Midtrans has been processing Kaswise payments since launch. No existing Midtrans integration has been replaced or removed. |
| **Webhook maturity** | Midtrans notification signature verification and status mapping are battle-tested. Mayar `verify_notification_signature` returns `False` (stub); webhooks are not wired. |
| **Cost negotiation** | Mayar integration is motivated by lower fees. The switch should happen only after sandbox testing confirms parity and the business is ready to migrate. |
| **Single-Primary constraint** | `PAYMENT_PRIMARY_PROVIDER` accepts one value (`midtrans` or `mayar`). Multi-provider per-user selection is not implemented. |

## Consequences

### Positive
- Adding a new payment gateway requires only a new `PaymentProvider` subclass and a config key. No changes to `orchestrator.py`, `repository.py`, or the API layer.
- Mayar can be enabled per-email for dogfooding and manual QA without exposing it to all users.
- Activation gate ensures paid-user metrics (`count_paid_users`) are never polluted by sandbox/limited-production Mayar payments.
- Provider-neutral response fields (`provider`, `provider_status`) allow the mobile client to display provider-specific status without tight coupling.

### Negative
- Mayar webhooks and notification signature verification are not implemented yet.
- Payment provider selection is not exposed to the user — only `PAYMENT_PRIMARY_PROVIDER` controls which gateway is called.
- The Mayar `build_payment_update` and `build_status_response` implementations are optimistic — they may need tuning once real webhook payloads arrive.

## Related

- PR #24: `fix/mayar-activation-guard` (implementation branch)
- `backend/app/services/payments/providers/base.py` — `PaymentProvider` ABC
- `backend/app/services/payments/providers/mayar.py` — MayarProvider implementation
- `backend/app/services/payments/providers/midtrans.py` — MidtransProvider implementation
- `backend/app/services/payments/orchestrator.py` — provider-neutral orchestration
- `backend/app/services/payment_service.py` — compatibility facade
- `backend/app/core/config.py` — `MAYAR_ALLOWED_EMAILS`, `MAYAR_ACTIVATION_ENABLED`, `MAYAR_WEBHOOKS_ENABLED`
- `docs/plans/2026-06-23-mayar-payment-implementation-plan.md`
