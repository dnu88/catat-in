"""Logika entitlement & kuota freemium (murni + akses data)."""
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.config import settings


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
