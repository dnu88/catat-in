"""Logika entitlement & kuota freemium (murni + akses data)."""
from calendar import monthrange
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.config import settings
from app.core.auth import _get_supabase_service_client, _is_active_premium_profile


@dataclass
class QuotaDecision:
    allowed: bool
    reason: str | None = None
    status_code: int | None = None


def chat_limit(is_premium: bool) -> int:
    return settings.PREMIUM_CHAT_MONTHLY if is_premium else settings.FREE_CHAT_MONTHLY


def photo_limit(is_premium: bool) -> int:
    return settings.PREMIUM_PHOTO_MONTHLY if is_premium else 0


def _parse_datetime(value: object | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _add_months(base: datetime, months: int) -> datetime:
    year = base.year + (base.month - 1 + months) // 12
    month = (base.month - 1 + months) % 12 + 1
    day = min(base.day, monthrange(year, month)[1])
    return base.replace(year=year, month=month, day=day)


def current_period_ym(
    now: datetime | None = None,
    subscription_started_at: datetime | None = None,
) -> str:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    if subscription_started_at is None:
        return now.strftime("%Y-%m")

    period_start = subscription_started_at.astimezone(timezone.utc)
    while True:
        next_period_start = _add_months(period_start, 1)
        if now < next_period_start:
            return period_start.strftime("%Y-%m")
        period_start = next_period_start


def evaluate(*, is_premium: bool, kind: str, chat_count: int, photo_count: int) -> QuotaDecision:
    if kind == "chat":
        if chat_count < chat_limit(is_premium):
            return QuotaDecision(True)
        return QuotaDecision(False, "fair_use" if is_premium else "quota_exhausted",
                             429 if is_premium else 402)
    if kind == "photo":
        if not is_premium:
            return QuotaDecision(False, "premium_only", 402)
        if photo_count < photo_limit(True):
            return QuotaDecision(True)
        return QuotaDecision(False, "fair_use", 429)
    raise ValueError(f"kind tak dikenal: {kind}")


def load_state(user_id: str, now: datetime | None = None) -> dict:
    client = _get_supabase_service_client()
    is_premium = False
    plan_expires_at = None
    chat_count = photo_count = 0
    subscription_started_at = None
    period = current_period_ym(now=now)
    if client is not None:
        prof = (client.table("profiles").select("plan_type,plan_expires_at")
                .eq("id", user_id).limit(1).execute())
        prow = prof.data[0] if getattr(prof, "data", None) else None
        is_premium = _is_active_premium_profile(prow)
        if prow:
            plan_expires_at = prow.get("plan_expires_at")
        if is_premium:
            payments = (
                client.table("payments")
                .select("paid_at,created_at")
                .eq("user_id", user_id)
                .eq("status", "paid")
                .order("paid_at", desc=True)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            prow_payment = payments.data[0] if getattr(payments, "data", None) else None
            if prow_payment:
                subscription_started_at = _parse_datetime(
                    prow_payment.get("paid_at") or prow_payment.get("created_at")
                )
            period = current_period_ym(subscription_started_at=subscription_started_at)
        usage = (client.table("ai_usage").select("chat_count,photo_count")
                 .eq("user_id", user_id).eq("period_ym", period).limit(1).execute())
        urow = usage.data[0] if getattr(usage, "data", None) else None
        if urow:
            chat_count = int(urow.get("chat_count", 0))
            photo_count = int(urow.get("photo_count", 0))
    return {
        "is_premium": is_premium,
        "plan_expires_at": plan_expires_at,
        "period_ym": period,
        "chat_count": chat_count,
        "photo_count": photo_count,
        "chat_limit": chat_limit(is_premium),
        "photo_limit": photo_limit(is_premium),
    }


def record_use(user_id: str, period_ym: str, kind: str) -> None:
    client = _get_supabase_service_client()
    if client is None:
        return
    try:
        client.rpc("increment_ai_usage",
                   {"p_user_id": user_id, "p_period": period_ym, "p_kind": kind}).execute()
        return
    except Exception:
        # Fallback untuk environment/prod yang RPC-nya gagal walau table ada.
        # Service-role backend tetap menjaga boundary: client tidak bisa write langsung.
        pass

    usage = (client.table("ai_usage").select("chat_count,photo_count")
             .eq("user_id", user_id).eq("period_ym", period_ym).limit(1).execute())
    row = usage.data[0] if getattr(usage, "data", None) else None
    chat_count = int((row or {}).get("chat_count", 0)) + (1 if kind == "chat" else 0)
    photo_count = int((row or {}).get("photo_count", 0)) + (1 if kind == "photo" else 0)
    payload = {
        "user_id": user_id,
        "period_ym": period_ym,
        "chat_count": chat_count,
        "photo_count": photo_count,
    }
    client.table("ai_usage").upsert(payload, on_conflict="user_id,period_ym").execute()
