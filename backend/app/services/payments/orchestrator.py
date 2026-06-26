"""Provider-neutral payment orchestration."""
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)

from . import repository
from .models import TERMINAL_PAYMENT_STATUSES
from .providers.base import PaymentProvider

_PRICES = {
    "monthly": {"promo": "PRICE_MONTHLY_PROMO", "normal": "PRICE_MONTHLY_NORMAL"},
    "yearly": {"promo": "PRICE_YEARLY_PROMO", "normal": "PRICE_YEARLY_NORMAL"},
}
_DURATION_DAYS = {"monthly": 30, "yearly": 365}


def price_for(plan: str, tier: str) -> int:
    if plan not in _PRICES or tier not in ("promo", "normal"):
        raise ValueError(f"plan/tier tak valid: {plan}/{tier}")
    return int(getattr(settings, _PRICES[plan][tier]))


def tier_for_count(paid_user_count: int) -> str:
    return "promo" if paid_user_count < settings.PROMO_MAX_SUBSCRIBERS else "normal"


def duration_days(plan: str) -> int:
    if plan not in _DURATION_DAYS:
        raise ValueError(f"plan tak valid: {plan}")
    return _DURATION_DAYS[plan]


def make_order_id(user_id: str) -> str:
    return f"kw-{user_id[:8]}-{int(time.time() * 1000)}-{secrets.token_hex(3)}"


def _now():
    return datetime.now(timezone.utc)


def fetch_and_sync_status(
    order_id: str,
    *,
    provider: PaymentProvider,
    provider_order_id: str | None = None,
    repository_module=repository,
    client=None,
    now_func=_now,
    activate_paid_profile: bool = True,
) -> dict:
    note = provider.fetch_status(provider_order_id or order_id)
    internal = activate_premium_from_notification(
        note,
        provider=provider,
        repository_module=repository_module,
        client=client,
        now_func=now_func,
        activate_paid_profile=activate_paid_profile,
        known_order_id=order_id,
    )
    result = {"order_id": order_id, "status": internal, "provider": provider.name}
    result.update(provider.build_status_response(note))
    return result


def activate_premium_from_notification(
    payload: dict,
    *,
    provider: PaymentProvider,
    repository_module=repository,
    client=None,
    now_func=_now,
    activate_paid_profile: bool = True,
    known_order_id: str | None = None,
) -> str:
    order_id = provider.extract_order_id(payload) or known_order_id or ""
    new_status = provider.map_internal_status(payload)
    if client is None or not order_id:
        if not order_id:
            logger.warning(
                "activate_premium_from_notification: cannot resolve order_id "
                "(provider=%s, known_order_id=%s, payload_keys=%s)",
                provider.name,
                known_order_id,
                list(payload.keys())[:10] if isinstance(payload, dict) else type(payload).__name__,
            )
        return new_status

    row = repository_module.get_payment_by_order_id(order_id, client=client)
    if row is None:
        return new_status
    if row["status"] in TERMINAL_PAYMENT_STATUSES:
        return row["status"]

    gross_amount = provider.extract_gross_amount(payload)
    if gross_amount is not None:
        try:
            expected_amount = int(row.get("amount") or 0)
            received_amount = int(float(str(gross_amount)))
        except (TypeError, ValueError):
            return row["status"]
        if expected_amount != received_amount:
            return row["status"]

    internal_status = new_status
    if new_status == "paid" and not activate_paid_profile:
        internal_status = row["status"]

    payment_update = provider.build_payment_update(payload, new_status=internal_status)

    if new_status == "paid" and internal_status == "paid":
        payment_update["paid_at"] = now_func().isoformat()
        if activate_paid_profile:
            prow = repository_module.get_profile(row["user_id"], client=client)
            base = now_func()
            if prow and prow.get("plan_expires_at"):
                try:
                    cur = datetime.fromisoformat(str(prow["plan_expires_at"]).replace("Z", "+00:00"))
                    base = max(base, cur)
                except ValueError:
                    pass
            until = base + timedelta(days=duration_days(row["plan"]))
            repository_module.update_profile(
                row["user_id"],
                {"plan_type": "premium", "plan_expires_at": until.isoformat()},
                client=client,
            )
            payment_update["granted_until"] = until.isoformat()

    repository_module.update_payment(order_id, payment_update, client=client)
    return internal_status
