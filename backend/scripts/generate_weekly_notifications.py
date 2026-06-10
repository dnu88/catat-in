"""Weekly summary notification generator.

Usage (production):
    docker exec kaswise-backend python scripts/generate_weekly_notifications.py
    docker exec kaswise-backend python scripts/generate_weekly_notifications.py --dry-run

This script scans all users who have weekly_summary_enabled, fetches their
last-7-days transaction data, and creates a notification if one hasn't been
sent for the current ISO week.
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone

# Allow running as script from /app or via python -m
try:
    from app.core.auth import _get_supabase_service_client
    from app.services.notification_service import create_notification, get_preferences
except ImportError:
    sys.path.insert(0, "/app")
    from app.core.auth import _get_supabase_service_client
    from app.services.notification_service import create_notification, get_preferences


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_week_key(dt: datetime) -> str:
    """Return 'YYYY-Www' for the ISO week."""
    iso = dt.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def _last_7_days() -> tuple[str, str]:
    """Return (start, end) as YYYY-MM-DD for the last 7 complete days."""
    now = _now()
    end = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    start = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    return start, end


def _fetch_weekly_summary(client, user_id: str, start: str, end: str) -> dict:
    """Fetch total income/expense and top 3 categories for the last 7 days."""
    from calendar import monthrange

    result = (
        client.table("transactions")
        .select("nominal,type,kategori")
        .eq("user_id", user_id)
        .gte("tanggal", start)
        .lte("tanggal", end)
        .execute()
    )
    rows = getattr(result, "data", None) or []
    if not isinstance(rows, list):
        rows = []

    income = 0.0
    expense = 0.0
    cat_totals: dict[str, float] = {}

    for row in rows:
        nominal = float(row.get("nominal") or 0)
        tipe = str(row.get("type") or "").lower()
        if tipe == "income":
            income += nominal
        elif tipe == "expense":
            expense += nominal
            kategori = (row.get("kategori") or "Other").strip() or "Other"
            cat_totals[kategori] = cat_totals.get(kategori, 0.0) + nominal

    top_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)[:3]
    return {
        "transaction_count": len(rows),
        "income_total": income,
        "expense_total": expense,
        "net_total": income - expense,
        "top_categories": [{"category": c, "amount": a} for c, a in top_cats],
    }


def _format_rupiah(value: float) -> str:
    return f"Rp {int(round(value)):,}".replace(",", ".")


def generate_weekly_notifications(dry_run: bool = False) -> list[dict]:
    """Generate weekly summary notifications for all eligible users.

    Returns list of info dicts about what was done.
    """
    client = _get_supabase_service_client()
    if client is None:
        print("ERROR: Supabase service client unavailable.")
        return []

    # Get all user IDs who exist
    result = client.table("profiles").select("id").execute()
    profiles = getattr(result, "data", None) or []
    if not isinstance(profiles, list):
        profiles = []

    start, end = _last_7_days()
    week_key = _iso_week_key(_now())
    reports: list[dict] = []

    for p in profiles:
        user_id = p.get("id")
        if not user_id:
            continue

        # Check preferences
        prefs = get_preferences(user_id)
        if not prefs.get("enabled") or not prefs.get("weekly_summary_enabled"):
            continue

        # Fetch summary data
        try:
            summary = _fetch_weekly_summary(client, user_id, start, end)
        except Exception:
            continue

        if summary["transaction_count"] == 0:
            continue

        body = (
            f"Minggu ini: {summary['transaction_count']} transaksi, "
            f"pemasukan {_format_rupiah(summary['income_total'])}, "
            f"pengeluaran {_format_rupiah(summary['expense_total'])}. "
            f"Cashflow bersih {_format_rupiah(summary['net_total'])}."
        )

        dedupe_key = f"weekly_summary:{user_id}:{week_key}"

        if dry_run:
            reports.append({
                "user_id": user_id,
                "week": week_key,
                "transaction_count": summary["transaction_count"],
                "body": body,
                "would_create": True,
            })
            continue

        result = create_notification(
            user_id,
            "weekly_summary",
            "Ringkasan Mingguan",
            body,
            data={
                "week": week_key,
                "period_start": start,
                "period_end": end,
                "target_path": "/(tabs)/reports",
            },
            dedupe_key=dedupe_key,
        )
        status = "created" if result else "skipped"
        reports.append({
            "user_id": user_id,
            "week": week_key,
            "transaction_count": summary["transaction_count"],
            "status": status,
        })

    return reports


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    results = generate_weekly_notifications(dry_run=dry)

    if dry:
        print(f"DRY RUN — {len(results)} notifications would be created:")
    else:
        created = sum(1 for r in results if r.get("status") == "created")
        print(f"CREATED {created} weekly summary notifications out of {len(results)} eligible users.")

    for r in results:
        print(f"  user={r['user_id']} week={r['week']} txn={r['transaction_count']} "
              f"status={r.get('status', 'dry_run' if dry else 'unknown')}")
