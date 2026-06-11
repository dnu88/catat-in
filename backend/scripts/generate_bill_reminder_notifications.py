"""Bill reminder notification generator.

Usage:
    docker exec kaswise-backend python3 scripts/generate_bill_reminder_notifications.py
    docker exec kaswise-backend python3 scripts/generate_bill_reminder_notifications.py --dry-run
"""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.auth import _get_supabase_service_client
from app.services.notification_service import create_notification, get_preferences

DRY_RUN = "--dry-run" in sys.argv


def generate_bill_reminders(dry_run: bool = False) -> list[dict]:
    client = _get_supabase_service_client()
    if not client:
        print("Supabase client unavailable")
        return []

    today = date.today().isoformat()
    results = []

    # Fetch active unpaid bills
    resp = client.table("bill_reminders") \
        .select("id,user_id,name,amount,next_due_date,notify_before_days,is_paid") \
        .eq("is_paid", False) \
        .execute()

    bills = resp.data or []

    for bill in bills:
        user_id = bill["user_id"]
        next_due = bill.get("next_due_date", "")
        notify_before = bill.get("notify_before_days", 0)

        if not next_due:
            continue

        try:
            due_date = date.fromisoformat(next_due[:10])
            notify_date = due_date - timedelta(days=notify_before)

            if notify_date.isoformat() != today:
                continue
        except ValueError:
            continue

        prefs = get_preferences(user_id)
        if not prefs.get("enabled", True):
            continue

        bill_name = bill.get("name", "Tagihan")
        amount = bill.get("amount", 0)
        due_label = due_date.strftime("%d %b %Y")
        days_left = (due_date - date.today()).days
        days_text = "Hari ini" if days_left == 0 else f"{days_left} hari lagi"

        dedupe_key = f"bill_reminder:{bill['id']}:{next_due[:10]}:{notify_before}"

        title = f"{bill_name} jatuh tempo"
        body = f"Rp {amount:,.0f} — {days_text} ({due_label})"

        result = create_notification(
            user_id,
            type_="bill_reminder",
            title=title,
            body=body,
            data={"bill_id": bill["id"], "target_path": "/(tabs)/bills"},
            dedupe_key=dedupe_key,
        )

        results.append({
            "user_id": user_id,
            "bill_id": bill["id"],
            "name": bill_name,
            "created": bool(result),
            "dedupe_key": dedupe_key,
        })

    return results


if __name__ == "__main__":
    results = generate_bill_reminders(dry_run=DRY_RUN)
    if DRY_RUN:
        print(f"DRY RUN — {len(results)} notifications would be created:")
    else:
        created = sum(1 for r in results if r["created"])
        print(f"CREATED {created} bill reminder notifications out of {len(results)} eligible.")
