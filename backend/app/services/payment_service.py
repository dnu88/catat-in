"""Midtrans Snap: harga/promo, pembuatan transaksi, verifikasi notifikasi."""
import hashlib
import hmac
import secrets
import time
import midtransclient
from datetime import datetime, timedelta, timezone
from app.core.config import settings
from app.core.auth import _get_supabase_service_client

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
    return hmac.compare_digest(expected, payload.get("signature_key", ""))


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


def _core_client():
    return midtransclient.CoreApi(
        is_production=bool(settings.MIDTRANS_IS_PRODUCTION),
        server_key=settings.MIDTRANS_SERVER_KEY or "",
        client_key=settings.MIDTRANS_CLIENT_KEY or "",
    )


def fetch_and_sync_status(order_id: str) -> dict:
    core = _core_client()
    note = core.transactions.status(order_id)  # dict mirip notifikasi
    internal = activate_premium_from_notification(note)
    return {"order_id": order_id, "status": internal,
            "midtrans_status": note.get("transaction_status")}


def _snap_client():
    return midtransclient.Snap(
        is_production=bool(settings.MIDTRANS_IS_PRODUCTION),
        server_key=settings.MIDTRANS_SERVER_KEY or "",
        client_key=settings.MIDTRANS_CLIENT_KEY or "",
    )


def make_order_id(user_id: str) -> str:
    # ms + suffix acak agar tak bentrok untuk request di detik yang sama.
    return f"kw-{user_id[:8]}-{int(time.time() * 1000)}-{secrets.token_hex(3)}"


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


def _now():
    return datetime.now(timezone.utc)


def count_paid_users() -> int:
    client = _get_supabase_service_client()
    if client is None:
        return 0
    res = client.table("payments").select("user_id").eq("status", "paid").execute()
    rows = getattr(res, "data", None) or []
    return len({r["user_id"] for r in rows})


def activate_premium_from_notification(payload: dict) -> str:
    """Idempoten: verifikasi signature dilakukan caller. Return status internal."""
    client = _get_supabase_service_client()
    order_id = payload.get("order_id", "")
    new_status = map_status(payload.get("transaction_status", ""), payload.get("fraud_status"))
    if client is None:
        return new_status

    pay = (client.table("payments").select("id,user_id,plan,status")
           .eq("order_id", order_id).limit(1).execute())
    row = pay.data[0] if getattr(pay, "data", None) else None
    if row is None:
        return new_status
    if row["status"] == "paid":   # idempotensi
        return "paid"

    payment_update = {"midtrans_status": payload.get("transaction_status"),
                      "status": new_status, "method": payload.get("payment_type"),
                      "raw_payload": payload}

    if new_status == "paid":
        prof = (client.table("profiles").select("plan_expires_at")
                .eq("id", row["user_id"]).limit(1).execute())
        prow = prof.data[0] if getattr(prof, "data", None) else None
        base = _now()
        if prow and prow.get("plan_expires_at"):
            try:
                cur = datetime.fromisoformat(str(prow["plan_expires_at"]).replace("Z", "+00:00"))
                base = max(base, cur)
            except ValueError:
                pass
        until = base + timedelta(days=duration_days(row["plan"]))
        client.table("profiles").update(
            {"plan_type": "premium", "plan_expires_at": until.isoformat()}
        ).eq("id", row["user_id"]).execute()
        payment_update["paid_at"] = _now().isoformat()
        payment_update["granted_until"] = until.isoformat()

    client.table("payments").update(payment_update).eq("order_id", order_id).execute()
    return new_status
