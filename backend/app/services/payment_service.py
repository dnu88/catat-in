"""Midtrans Snap: harga/promo, pembuatan transaksi, verifikasi notifikasi."""
import hashlib
import time
import midtransclient
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


def verify_notification_signature(payload: dict) -> bool:
    raw = (f"{payload.get('order_id','')}{payload.get('status_code','')}"
           f"{payload.get('gross_amount','')}{settings.MIDTRANS_SERVER_KEY or ''}")
    expected = hashlib.sha512(raw.encode()).hexdigest()
    return expected == payload.get("signature_key", "")


def map_status(transaction_status: str, fraud_status: str | None) -> str:
    if transaction_status in ("settlement",) or (
        transaction_status == "capture" and fraud_status == "accept"
    ):
        return "paid"
    if transaction_status == "capture":  # fraud challenge
        return "pending"
    if transaction_status == "pending":
        return "pending"
    if transaction_status in ("deny", "cancel"):
        return "failed"
    if transaction_status in ("expire", "failure"):
        return "expired"
    return "pending"


def _snap_client():
    return midtransclient.Snap(
        is_production=bool(settings.MIDTRANS_IS_PRODUCTION),
        server_key=settings.MIDTRANS_SERVER_KEY or "",
        client_key=settings.MIDTRANS_CLIENT_KEY or "",
    )


def make_order_id(user_id: str) -> str:
    return f"kw-{user_id[:8]}-{int(time.time())}"


def create_snap_transaction(*, order_id: str, amount: int, plan: str, email: str) -> dict:
    snap = _snap_client()
    param = {
        "transaction_details": {"order_id": order_id, "gross_amount": amount},
        "enabled_payments": ["qris", "gopay", "shopeepay"],
        "item_details": [{"id": f"premium-{plan}", "price": amount, "quantity": 1,
                          "name": f"Kaswise Premium ({plan})"}],
        "customer_details": {"email": email},
    }
    res = snap.create_transaction(param)
    return {"token": res["token"], "redirect_url": res["redirect_url"]}
