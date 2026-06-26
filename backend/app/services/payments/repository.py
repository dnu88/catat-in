"""Persistence helpers for payment records."""
from app.core.auth import _get_supabase_service_client

from .models import PAYMENT_SELECT_FOR_ACTIVATION, PAYMENT_SELECT_FOR_USER


def _resolve_client(client=None):
    return client or _get_supabase_service_client()


def insert_pending_payment(
    *,
    user_id: str,
    order_id: str,
    plan: str,
    amount: int,
    price_tier: str,
    provider: str,
    provider_order_id: str | None = None,
    client=None,
) -> None:
    client = _resolve_client(client)
    if client is None:
        raise RuntimeError("Supabase service client tidak tersedia.")
    row = {
        "user_id": user_id,
        "order_id": order_id,
        "plan": plan,
        "amount": amount,
        "price_tier": price_tier,
        "status": "pending",
        "provider": provider,
        "provider_order_id": provider_order_id or order_id,
    }
    client.table("payments").insert(row).execute()


def get_payment_for_user(order_id: str, user_id: str, client=None) -> dict | None:
    client = _resolve_client(client)
    if client is None:
        raise RuntimeError("Supabase service client tidak tersedia.")
    res = (
        client.table("payments")
        .select(PAYMENT_SELECT_FOR_USER)
        .eq("order_id", order_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = getattr(res, "data", None) or []
    return rows[0] if rows else None


def get_payment_by_order_id(order_id: str, client=None) -> dict | None:
    client = _resolve_client(client)
    if client is None:
        raise RuntimeError("Supabase service client tidak tersedia.")
    res = (
        client.table("payments")
        .select(PAYMENT_SELECT_FOR_ACTIVATION)
        .eq("order_id", order_id)
        .limit(1)
        .execute()
    )
    rows = getattr(res, "data", None) or []
    return rows[0] if rows else None


def count_paid_users(client=None) -> int:
    client = _resolve_client(client)
    if client is None:
        return 0
    res = client.table("payments").select("user_id").eq("status", "paid").execute()
    rows = getattr(res, "data", None) or []
    return len({row["user_id"] for row in rows})


def get_profile(user_id: str, client=None) -> dict | None:
    client = _resolve_client(client)
    if client is None:
        raise RuntimeError("Supabase service client tidak tersedia.")
    res = (
        client.table("profiles")
        .select("plan_expires_at")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    rows = getattr(res, "data", None) or []
    return rows[0] if rows else None


def update_profile(user_id: str, data: dict, client=None) -> None:
    client = _resolve_client(client)
    if client is None:
        raise RuntimeError("Supabase service client tidak tersedia.")
    client.table("profiles").update(data).eq("id", user_id).execute()


def update_payment(order_id: str, data: dict, client=None) -> None:
    client = _resolve_client(client)
    if client is None:
        raise RuntimeError("Supabase service client tidak tersedia.")
    client.table("payments").update(data).eq("order_id", order_id).execute()
