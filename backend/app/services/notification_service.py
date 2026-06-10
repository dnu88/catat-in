"""Notification service — preferences, notification CRUD, dedupe inbox.

All functions that interact with Supabase accept the service-role client via
`_get_supabase_service_client()`. When the client is unavailable every function
returns safe defaults without raising.
"""

from __future__ import annotations

from typing import Any

from app.core.auth import _get_supabase_service_client

# ── Allowed preference fields for update validation ──────────────────────
_ALLOWED_PREF_KEYS: set[str] = {
    "enabled",
    "daily_reminder_enabled",
    "daily_reminder_time",
    "budget_alert_enabled",
    "budget_alert_thresholds",
    "weekly_summary_enabled",
    "weekly_summary_day",
    "weekly_summary_time",
    "ai_insight_enabled",
    "bill_reminder_enabled",
    "timezone",
    "push_enabled",
}

# ── Notification types that respect a dedicated preference toggle ────────
_TYPE_PREF_MAP: dict[str, str] = {
    "budget_threshold": "budget_alert_enabled",
    "weekly_summary": "weekly_summary_enabled",
    "ai_insight_ready": "ai_insight_enabled",
}


# ═══════════════════════════════════════════════════════════════════════════
# Preferences
# ═══════════════════════════════════════════════════════════════════════════

def default_preferences(user_id: str) -> dict[str, Any]:
    """Return a defaults dict for notification_preferences."""
    return {
        "user_id": user_id,
        "enabled": True,
        "daily_reminder_enabled": True,
        "daily_reminder_time": "20:00",
        "budget_alert_enabled": True,
        "budget_alert_thresholds": [80, 100],
        "weekly_summary_enabled": True,
        "weekly_summary_day": 0,
        "weekly_summary_time": "19:00",
        "ai_insight_enabled": True,
        "bill_reminder_enabled": False,
        "timezone": "Asia/Jakarta",
        "push_enabled": False,
    }


def get_preferences(user_id: str) -> dict[str, Any]:
    """Return notification preferences for *user_id*.

    If no row exists yet, a defaults dict is returned and no write is performed
    (the actual upsert happens on first ``update_preferences``).
    """
    client = _get_supabase_service_client()
    if client is None:
        return default_preferences(user_id)

    try:
        result = (
            client.table("notification_preferences")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = getattr(result, "data", None)
        if isinstance(rows, list) and rows:
            return dict(rows[0])
    except Exception:
        pass

    return default_preferences(user_id)


def update_preferences(user_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    """Apply a partial update to notification preferences.

    Unknown keys are silently dropped. Invalid *budget_alert_thresholds* values
    are sanitised: values outside 1-200 are removed and the list is capped at 5.
    """
    client = _get_supabase_service_client()
    if client is None:
        return get_preferences(user_id)

    cleaned: dict[str, Any] = {}
    for key, value in patch.items():
        if key not in _ALLOWED_PREF_KEYS:
            continue
        if key == "budget_alert_thresholds" and isinstance(value, list):
            value = _sanitize_thresholds(value)
        cleaned[key] = value

    if not cleaned:
        return get_preferences(user_id)

    try:
        result = (
            client.table("notification_preferences")
            .upsert({"user_id": user_id, **cleaned}, on_conflict="user_id")
            .eq("user_id", user_id)
            .select("*")
            .limit(1)
            .execute()
        )
        rows = getattr(result, "data", None)
        if isinstance(rows, list) and rows:
            return dict(rows[0])
    except Exception:
        pass

    return get_preferences(user_id)


def _sanitize_thresholds(values: list[int]) -> list[int]:
    """Keep only integers 1-200, dedupe, cap at 5, sort ascending."""
    seen: set[int] = set()
    clean: list[int] = []
    for v in values:
        if not isinstance(v, int):
            continue
        if v < 1 or v > 200:
            continue
        if v in seen:
            continue
        seen.add(v)
        clean.append(v)
    clean.sort()
    return clean[:5]


# ═══════════════════════════════════════════════════════════════════════════
# Notification CRUD
# ═══════════════════════════════════════════════════════════════════════════

def create_notification(
    user_id: str,
    type_: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
    dedupe_key: str | None = None,
) -> dict[str, Any] | None:
    """Create a notification, respecting user preferences and deduplication.

    Returns the created notification dict, or ``None`` if:
    - the global ``enabled`` toggle is off,
    - the type-specific toggle is off,
    - the Supabase client is unavailable,
    - or deduplication blocked the insert.
    """
    prefs = get_preferences(user_id)

    # Global master switch
    if not prefs.get("enabled"):
        return None

    # Per-type toggle
    pref_key = _TYPE_PREF_MAP.get(type_)
    if pref_key and not prefs.get(pref_key):
        return None

    client = _get_supabase_service_client()
    if client is None:
        return None

    payload: dict[str, Any] = {
        "user_id": user_id,
        "type": type_,
        "title": title,
        "body": body,
        "data": data or {},
    }
    if dedupe_key:
        payload["dedupe_key"] = dedupe_key

    try:
        result = (
            client.table("notifications")
            .upsert(payload, on_conflict="user_id,dedupe_key")
            .select("*")
            .limit(1)
            .execute()
        )
        rows = getattr(result, "data", None)
        if isinstance(rows, list) and rows:
            return dict(rows[0])
    except Exception:
        pass

    return None


def list_notifications(
    user_id: str,
    limit: int = 50,
    unread_only: bool = False,
) -> dict[str, Any]:
    """Return ``{"items": [...], "unread_count": N}``."""
    client = _get_supabase_service_client()
    if client is None:
        return {"items": [], "unread_count": 0}

    try:
        query = (
            client.table("notifications")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if unread_only:
            query = query.is_("read_at", "null")
        result = query.execute()
        items = getattr(result, "data", None) or []
        if not isinstance(items, list):
            items = []
    except Exception:
        items = []

    unread = sum(1 for item in items if item.get("read_at") is None)
    return {"items": items, "unread_count": unread}


def get_unread_count(user_id: str) -> int:
    """Return the number of unread notifications for *user_id*."""
    client = _get_supabase_service_client()
    if client is None:
        return 0

    try:
        result = (
            client.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .is_("read_at", "null")
            .execute()
        )
        return getattr(result, "count", 0) or 0
    except Exception:
        return 0


def mark_notification_read(user_id: str, notification_id: str) -> None:
    """Mark a single notification as read. Silently no-op on error."""
    client = _get_supabase_service_client()
    if client is None:
        return

    try:
        from datetime import datetime, timezone

        (
            client.table("notifications")
            .update({"read_at": datetime.now(timezone.utc).isoformat()})
            .eq("user_id", user_id)
            .eq("id", notification_id)
            .is_("read_at", "null")  # only if not already read
            .execute()
        )
    except Exception:
        pass


def mark_all_read(user_id: str) -> int:
    """Mark all unread notifications for *user_id* as read.

    Returns the number of rows that were updated.
    """
    client = _get_supabase_service_client()
    if client is None:
        return 0

    try:
        from datetime import datetime, timezone

        result = (
            client.table("notifications")
            .update({"read_at": datetime.now(timezone.utc).isoformat()})
            .eq("user_id", user_id)
            .is_("read_at", "null")
            .execute()
        )
        # Some Supabase clients return the updated rows
        data = getattr(result, "data", None)
        if isinstance(data, list):
            return len(data)
    except Exception:
        pass

    return 0
