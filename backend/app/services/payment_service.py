"""Midtrans Snap: harga/promo, pembuatan transaksi, verifikasi notifikasi."""
import hashlib
from app.core.config import settings

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
