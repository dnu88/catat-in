from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.auth import _get_supabase_service_client

_ACTIVE_STATUSES = {"pending", "in_review"}


def _clean_text(value: str | None, limit: int) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    return cleaned[:limit]


def get_latest_request(user_id: str) -> dict[str, Any] | None:
    client = _get_supabase_service_client()
    if client is None:
        return None

    try:
        result = (
            client.table("account_deletion_requests")
            .select("*")
            .eq("user_id", user_id)
            .order("requested_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = getattr(result, "data", None)
        if isinstance(rows, list) and rows:
            return dict(rows[0])
    except Exception:
        return None

    return None


def create_request(
    *,
    user_id: str,
    email: str,
    reason: str | None = None,
    details: str | None = None,
) -> tuple[dict[str, Any], bool]:
    client = _get_supabase_service_client()
    if client is None:
        raise RuntimeError("supabase service client unavailable")

    existing = get_latest_request(user_id)
    if existing and existing.get("status") in _ACTIVE_STATUSES:
        return existing, False

    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "user_id": user_id,
        "email": email.strip(),
        "status": "pending",
        "reason": _clean_text(reason, 120),
        "details": _clean_text(details, 500),
        "requested_at": now,
    }

    result = (
        client.table("account_deletion_requests")
        .insert(payload)
        .select("*")
        .limit(1)
        .execute()
    )
    rows = getattr(result, "data", None)
    if isinstance(rows, list) and rows:
        return dict(rows[0]), True

    raise RuntimeError("failed to create account deletion request")
