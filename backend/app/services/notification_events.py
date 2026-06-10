"""Scheduled notification generators — budget thresholds, weekly summary.

These functions are meant to be called from cron / scheduler scripts.
They use Supabase service-role client to read budgets and generate
notifications without requiring user authentication.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.auth import _get_supabase_service_client
from app.services.notification_service import create_notification


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _current_month_range() -> tuple[str, str]:
    """Return (first_day, last_day) as YYYY-MM-DD strings for current UTC month."""
    now = _now()
    year = now.year
    month = now.month
    from calendar import monthrange

    first = f"{year:04d}-{month:02d}-01"
    _, last_day = monthrange(year, month)
    last = f"{year:04d}-{month:02d}-{last_day:02d}"
    return first, last


def generate_budget_threshold_notifications(user_id: str) -> list[dict]:
    """Scan all active budgets for *user_id* and create notifications for
    thresholds that have been crossed this month.

    Returns a list of notification dicts that were created (empty if none).
    Each budget/threshold combo only fires once per month via deduplication.
    """
    client = _get_supabase_service_client()
    if client is None:
        return []

    period_start, period_end = _current_month_range()
    created: list[dict] = []

    try:
        # Fetch active budgets
        budget_result = (
            client.table("budgets")
            .select("id,category,limit_amount,spent_amount")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )
        budgets = getattr(budget_result, "data", None) or []
        if not isinstance(budgets, list):
            budgets = []
    except Exception:
        return []

    now = _now()
    year_month = now.strftime("%Y-%m")

    for budget in budgets:
        budget_id = budget.get("id")
        category = budget.get("category") or "Unknown"
        limit = float(budget.get("limit_amount") or 0)
        spent = float(budget.get("spent_amount") or 0)

        if limit <= 0:
            continue

        percent = (spent / limit) * 100

        for threshold in [80, 100]:
            if percent >= threshold:
                dedupe_key = f"budget_threshold:{budget_id}:{year_month}:{threshold}"
                title = f"Budget {category} {'' if threshold < 100 else 'habis' if percent >= 100 else 'hampir habis'}"
                body = (
                    f"Budget {category} sudah terpakai {percent:.0f}% "
                    f"bulan ini (Rp {int(spent):,} dari Rp {int(limit):,})."
                ).replace(",", ".")
                data = {
                    "budget_id": budget_id,
                    "threshold": threshold,
                    "percent": round(percent, 1),
                    "target_path": "/(tabs)/budgets",
                }
                result = create_notification(
                    user_id,
                    "budget_threshold",
                    title,
                    body,
                    data=data,
                    dedupe_key=dedupe_key,
                )
                if result:
                    created.append(result)

    return created


def generate_budget_notifications_for_all_active_users() -> dict[str, int]:
    """Scan all users who have active budgets and generate threshold
    notifications.

    Returns a dict of {user_id: notifications_created}.
    """
    client = _get_supabase_service_client()
    if client is None:
        return {}

    try:
        # Get distinct users who have active budgets
        result = (
            client.table("budgets")
            .select("user_id")
            .eq("is_active", True)
            .execute()
        )
        rows = getattr(result, "data", None) or []
        if not isinstance(rows, list):
            rows = []
    except Exception:
        return {}

    user_ids = list({row.get("user_id") for row in rows if row.get("user_id")})
    summary: dict[str, int] = {}

    for user_id in user_ids:
        notifs = generate_budget_threshold_notifications(user_id)
        if notifs:
            summary[user_id] = len(notifs)

    return summary
