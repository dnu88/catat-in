"""Logika entitlement & kuota freemium (murni + akses data)."""
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


def current_period_ym(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    return now.strftime("%Y-%m")


def load_state(user_id: str) -> dict:
    client = _get_supabase_service_client()
    period = current_period_ym()
    is_premium = False
    plan_expires_at = None
    chat_count = photo_count = 0
    if client is not None:
        prof = (client.table("profiles").select("plan_type,plan_expires_at")
                .eq("id", user_id).limit(1).execute())
        prow = prof.data[0] if getattr(prof, "data", None) else None
        is_premium = _is_active_premium_profile(prow)
        if prow:
            plan_expires_at = prow.get("plan_expires_at")
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
    client.rpc("increment_ai_usage",
               {"p_user_id": user_id, "p_period": period_ym, "p_kind": kind}).execute()
